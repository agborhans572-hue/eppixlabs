# Eppix Labs clone

Next.js / TypeScript recreation of the publicly accessible US website, with an independent Supabase backend. Original content, styles, fonts, product images and laboratory reports are stored locally. `reference/manifest.json` records the source URL for each captured page and asset. Checkout is intentionally unavailable.

## Run locally

Requires Node.js 22 or later. In PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. Without Supabase settings, development carts and submissions are saved under the ignored `.local` directory. Authentication reports that it is unconfigured. Production requires Supabase and a cookie secret; it never uses local file persistence.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run verify:content
node scripts/smoke.mjs # run while the development server is running, without Supabase
npm.cmd run build
```

## Supabase setup

1. Create a Supabase project. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's API settings. Set `SUPABASE_SERVICE_ROLE_KEY` from its server API keys. Keep that privileged key server-side.
2. Generate `CART_COOKIE_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Store the result only in local environment settings and Vercel settings.
3. Apply `supabase/migrations/202610070001_initial.sql` in the Supabase SQL editor, or use Supabase CLI: `supabase login`, `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push`.
4. Run `npm.cmd run import`. This idempotently imports products, variants, collections, public pages, articles, batches, certificates and assets. It also uploads original assets to the public `clone-assets` bucket. No existing customers or private orders are imported.
5. In Authentication → URL Configuration, set the Site URL to the deployed origin. Add `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/callback?next=/reset-password`, and the equivalent production URLs to the allowed redirect URLs. Keep preview redirects restricted to your own deployments.
6. Enable email/password authentication. Confirm the project's email confirmation setting. Supabase's built-in mail service has development restrictions; configure your own supported SMTP service if you want public signup confirmations and password reset email delivery. Newsletter, support and affiliate email delivery remain deferred.

## Google sign-in

Email/password account creation includes an email OTP verification step. Keep Supabase email confirmation enabled and copy `supabase/templates/confirmation.html` into Authentication → Emails → Confirm sign up, with subject `Your Eppix Labs verification code`. The template uses `{{ .Token }}` to send Supabase's numeric code. The site verifies it server-side, creates the session after success, and offers code resending with a 60-second cooldown. Google sign-in continues to use the provider's verified identity. Run `npm.cmd run verify:signup-otp` against a local running server to verify the account gate, invalid/used codes, session cookies and password login; this creates and cleans up a temporary Supabase account without sending email.

Create a Google Cloud project and configure the OAuth consent screen for a web application. Create an OAuth web client. Use the callback URL shown by Supabase's Google provider, normally `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`, as the Google authorized redirect URI. Enable Google in Supabase Authentication → Providers and enter the client ID and secret there. Add test users while the Google consent app is in testing. Google secrets do not belong in this repository or the browser.

## Vercel deployment

Production domain: **https://eppixlabsshop.com**. Repository: https://github.com/agborhans572-hue/eppixlabs.

In Vercel, import that GitHub repository, add `eppixlabsshop.com` in the project domain settings, and apply the DNS records Vercel shows at your domain registrar. Set `NEXT_PUBLIC_SITE_URL=https://www.eppixlabsshop.com` for production, then redeploy. In Supabase, use that origin as the Site URL and allow `https://www.eppixlabsshop.com/auth/callback` and `https://www.eppixlabsshop.com/auth/callback?next=/reset-password`. The apex domain redirects to `www.eppixlabsshop.com`; keep authentication and mutation origins aligned with that hostname. See [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for the verified live setup.

Sign in to Vercel and import this repository, or run `npx vercel login` followed by `npx vercel`. Select Next.js and the repository root. Configure every value in `.env.example` in Vercel's environment settings. Set `NEXT_PUBLIC_SITE_URL` to your actual production origin. Public Supabase values are build-time variables, so redeploy after changing them.

After applying the migration and importing content, deploy with `npx vercel --prod`. Update Supabase's Site URL and redirect allowlist to the final domain. Check the homepage, assets, direct product routes, search and a cart mutation. Verify email signup/confirmation, login/logout, reset links and Google callback on the deployed domain. Create two test accounts to verify profile and cart isolation. Accounts begin with empty order histories.

Products and variants, saved subscription preferences, support requests and affiliate applications are managed through Supabase's dashboard. Database policies protect private records; anonymous browser clients cannot read submissions or other users' carts. Guest carts use signed HttpOnly cookies. Server endpoints validate input and calculate prices from the database.

## Behavior and limits

Discounts are 5% at 3 vials, 10% at 5, and 20% at 10; packs contribute their contained vial count. The original catalog's conflicting promotional text remains. Client price fields are rejected. Checkout never creates an order or reports payment success.

The source capture contains 279 public routes plus 9 certificate category/pagination states, 76 products and 259 variants. Live private account layouts and business logic are inaccessible; the independent account page exposes the authenticated email and an empty order history. Original public assets are retained, but menus, dialogs and some dynamic behaviors are independently reconstructed and should not be described as a guaranteed pixel-identical copy. The source's Canadian store remains an external link.

Supabase database/storage integration, production deployment, carts, email/password login, logout, ownership isolation, and authentication token callbacks have been verified on the live site. Google OAuth consent/return/logout are verified. Zoho MX records are published, mailbox sending and receiving are verified, and Resend authentication emails for signup confirmation and password reset have reached the Zoho inbox. See the deployment status for details. Local automated reports are in `artifacts`. Payment integration, fulfillment, newsletter/support/affiliate email notifications and customer/order migration are deferred.

Sixteen catalog certificates have public images and laboratory verification links, but their corresponding batch-detail URLs return 404 on the reference website. The local app provides independent report views using those published records. Their original page layouts are therefore a remaining fidelity gap; exact URLs and source status codes are recorded in `artifacts/certificate-source-report.json`.

## Content maintenance

The served sitemap and robots files are generated by `app/sitemap.ts` and `app/robots.ts`. They use the same canonical origin as page metadata (`NEXT_PUBLIC_SITE_URL`, defaulting to `https://www.eppixlabsshop.com`). The sitemap includes public content and generated certificate pages, excluding authentication/private routes and query duplicates. After content changes, rebuild and redeploy. Run `npm.cmd run verify:sitemap` against a running server (set `TEST_ORIGIN` when needed). See [SITEMAP_AUDIT.md](SITEMAP_AUDIT.md) for the root cause, verification and deployment steps.

`npm.cmd run capture` downloads the public sitemap and initial HTML. `scripts/resolve-records.mjs`, `scripts/complete-assets.mjs`, `scripts/compile-content.mjs`, and `scripts/compile-certificates.mjs` extract typed catalog data. Browser-rendered collection and authentication captures in `reference/rendered` and `reference/*-rendered.html` preserve content absent from the source's initial HTML; apply them with `scripts/apply-rendered.mjs` and `scripts/apply-rendered-collections.mjs`. Recheck the manifest and public assets before rerunning the content import. Captured markup never executes the source application's scripts.

## Fidelity verification

See [BEHAVIOR_AUDIT.md](BEHAVIOR_AUDIT.md) for interaction contracts, verification artifacts, and remaining gaps. The latest pass includes 47 browser assertions, 24 unit tests, 15 server integration checks, and 304 successful route checks. Production compilation and TypeScript checks pass. Static coverage binds all 8,761 captured buttons; this does not certify every possible sequence. The paired visual matrix contains 168 captures across 14 representative templates at three widths in both themes, plus 68 open-surface captures. This is representative verification; remaining fidelity gaps and unconfigured service flows are documented in the audit.
