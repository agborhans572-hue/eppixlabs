-- Apply with Supabase CLI: supabase db push
create table public.products (id text primary key, slug text unique not null, data jsonb not null);
create table public.variants (id text primary key, product_id text not null references public.products(id) on delete cascade, price_cents integer not null check(price_cents>=0), available boolean not null, stock integer not null check(stock>=0), data jsonb not null);
create table public.collections (slug text primary key, data jsonb not null);
create table public.public_pages (route text primary key, data jsonb not null);
create table public.articles (slug text primary key, data jsonb not null);
create table public.batches (code text primary key, product_id text references public.products(id), data jsonb not null);
create table public.certificates (batch_code text primary key references public.batches(code), data jsonb not null);
create table public.assets (source text primary key, storage_path text not null, data jsonb not null);
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text not null default '', created_at timestamptz not null default now());
create table public.carts (id text primary key, user_id uuid references auth.users(id) on delete cascade, items jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now());
create table public.subscriptions (id bigint generated always as identity primary key, email text unique not null, idempotency_key text unique not null, data jsonb not null, created_at timestamptz not null default now());
create table public.support_requests (id bigint generated always as identity primary key, idempotency_key text unique not null, data jsonb not null, created_at timestamptz not null default now());
create table public.affiliate_applications (id bigint generated always as identity primary key, idempotency_key text unique not null, data jsonb not null, created_at timestamptz not null default now());
create table public.rate_limits (key text primary key, count integer not null, reset_at timestamptz not null);
create index variants_product_idx on public.variants(product_id);
create index carts_user_idx on public.carts(user_id);
create index rate_limits_reset_idx on public.rate_limits(reset_at);

alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.collections enable row level security;
alter table public.public_pages enable row level security;
alter table public.articles enable row level security;
alter table public.batches enable row level security;
alter table public.certificates enable row level security;
alter table public.assets enable row level security;
alter table public.profiles enable row level security;
alter table public.carts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.support_requests enable row level security;
alter table public.affiliate_applications enable row level security;
alter table public.rate_limits enable row level security;
create policy catalog_read on public.products for select using(true);
create policy variant_read on public.variants for select using(true);
create policy collection_read on public.collections for select using(true);
create policy page_read on public.public_pages for select using(true);
create policy article_read on public.articles for select using(true);
create policy batch_read on public.batches for select using(true);
create policy certificate_read on public.certificates for select using(true);
create policy asset_read on public.assets for select using(true);
create policy profile_read on public.profiles for select to authenticated using((select auth.uid())=id);
create policy profile_update on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
create policy cart_read on public.carts for select to authenticated using((select auth.uid())=user_id);

create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),150)) on conflict(id) do nothing;
 return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();

-- These functions may only be invoked by the trusted app server.
create function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 delete from public.rate_limits where reset_at<now()-interval '1 day';
 insert into public.rate_limits(key,count,reset_at) values(p_key,1,now()+make_interval(secs=>p_window_seconds))
 on conflict(key) do update set count=case when public.rate_limits.reset_at<now() then 1 else public.rate_limits.count+1 end,
 reset_at=case when public.rate_limits.reset_at<now() then now()+make_interval(secs=>p_window_seconds) else public.rate_limits.reset_at end returning count into n;
 return n<=p_limit;
end;$$;
create function public.read_cart(p_key text,p_user_id uuid,p_guest_key text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; guest_items jsonb;
begin
 insert into public.carts(id,user_id) values(p_key,p_user_id) on conflict(id) do nothing;
 select items into result from public.carts where id=p_key and user_id is not distinct from p_user_id for update;
 if result is null then raise exception 'CART_OWNER'; end if;
 if p_user_id is not null and p_guest_key is not null then
  select items into guest_items from public.carts where id=p_guest_key and user_id is null for update;
  if guest_items is not null and jsonb_array_length(guest_items)>0 then
   select coalesce(jsonb_agg(jsonb_build_object('variantId',variant,'quantity',least(99,quantity))),'[]'::jsonb) into result
   from (select entry->>'variantId' as variant,sum((entry->>'quantity')::integer) as quantity from jsonb_array_elements(result||guest_items) as entry group by entry->>'variantId') q;
   update public.carts set items=result,updated_at=now() where id=p_key;
   delete from public.carts where id=p_guest_key and user_id is null;
  end if;
 end if;
 return result;
end;$$;
create function public.mutate_cart(p_key text,p_user_id uuid,p_variant text,p_quantity integer,p_operation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; old_quantity integer; next_quantity integer; stock_count integer; available_now boolean; soon boolean;
begin
 if p_operation not in ('add','set','remove') or p_quantity<0 or p_quantity>99 then raise exception 'QUANTITY'; end if;
 select v.stock,v.available,coalesce((p.data->>'comingSoon')::boolean,false) into stock_count,available_now,soon from public.variants v join public.products p on p.id=v.product_id where v.id=p_variant;
 if stock_count is null then raise exception 'UNAVAILABLE'; end if;
 insert into public.carts(id,user_id) values(p_key,p_user_id) on conflict(id) do nothing;
 select items into result from public.carts where id=p_key and user_id is not distinct from p_user_id for update;
 if result is null then raise exception 'CART_OWNER'; end if;
 select coalesce((entry->>'quantity')::integer,0) into old_quantity from jsonb_array_elements(result) entry where entry->>'variantId'=p_variant;
 next_quantity:=case when p_operation='remove' then 0 when p_operation='set' then p_quantity else coalesce(old_quantity,0)+p_quantity end;
 if next_quantity>99 or next_quantity>stock_count then raise exception 'STOCK'; end if;
 if next_quantity>0 and (not available_now or soon) then raise exception 'UNAVAILABLE'; end if;
 select coalesce(jsonb_agg(entry),'[]'::jsonb) into result from jsonb_array_elements(result) entry where entry->>'variantId'<>p_variant;
 if next_quantity>0 then result:=result||jsonb_build_array(jsonb_build_object('variantId',p_variant,'quantity',next_quantity));end if;
 update public.carts set items=result,updated_at=now() where id=p_key;
 return result;
end;$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.read_cart(text,uuid,text) from public,anon,authenticated;
revoke all on function public.mutate_cart(text,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant execute on function public.read_cart(text,uuid,text) to service_role;
grant execute on function public.mutate_cart(text,uuid,text,integer,text) to service_role;

insert into storage.buckets(id,name,public) values('clone-assets','clone-assets',true) on conflict(id) do nothing;
create policy clone_asset_read on storage.objects for select using(bucket_id='clone-assets');
