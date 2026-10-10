# Sitemap audit — 10 October 2026

## Cause

The application is Next.js 16.4 with an App Router optional catch-all storefront at `app/[[...path]]/page.tsx`. There was no served sitemap or robots route. `reference/sitemap.xml` is an import fixture from `www.eppixlabs.com`, not a public file for this store. Requests for missing routes reached the storefront and produced the application's HTML 404 response.

Read-only live requests confirmed HTTP 404 and `text/html` for both sitemap and robots. The apex domain redirects to `https://www.eppixlabsshop.com`; the homepage canonical uses that same www origin.

`next.config.ts` defines security headers and content tracing, with no rewrites or redirects. There is no repository `vercel.json`. The authentication proxy's matcher excludes sitemap and robots. No SPA fallback rewrite needs removal in this repository. Remote Vercel project settings were not inspected; the live requests confirm the domain redirect and Next.js HTML fallback.

## Changes

- `app/sitemap.ts` generates a dedicated XML metadata route. Next.js serves it before the catch-all page and prerenders it during the build.
- The sitemap includes the 291 distinct public routes from the captured pages and generated certificate lot pages, including all 76 products. Every included route must resolve through the storefront's `readPage` function. Query/filter/variant duplicates and account, cart, checkout, authentication and API paths are excluded.
- `app/robots.ts` permits public crawling, excludes private/service paths, and advertises the canonical sitemap URL.
- `lib/site.ts` shares the origin used by page canonicals, sitemap and robots. The default is `https://www.eppixlabsshop.com`; `NEXT_PUBLIC_SITE_URL` retains the existing local/preview override. Production must use the www HTTPS origin.
- Authentication and checkout pages now explicitly emit `noindex, follow`. Their UI and behavior are unchanged.
- No speculative modification dates are added: capture timestamps and test dates are not reliable page modification dates.

No product data, visual styles, storefront interactions, cart logic or checkout implementation were changed. The existing checkout remains unavailable as documented in the project.

## Verification

Completed locally: all 27 unit tests passed; production build, TypeScript and content checks passed; all 291 sitemap entries passed status/canonical/indexability checks; all 304 existing route states passed. Sitemap GET/HEAD and robots checks passed.

Run `npm.cmd test`, `npm.cmd run build`, `npm.cmd run typecheck`, and `npm.cmd run verify:content`. With the production server running, run:

```powershell
$env:TEST_ORIGIN='http://localhost:3100'
npm.cmd run verify:sitemap
node scripts/verify-routes.mjs
```

The sitemap check verifies HTTP 200 without redirects, XML content type, namespace, unique URLs, XML GET/HEAD responses, robots' sitemap declaration, and HTTP 200/self-canonical/indexable metadata for every entry. It also checks noindex metadata on authentication and checkout pages. The existing route check covers all 304 captured/generated route states. An independent XML parser accepted the generated XML; a local copy is saved in ignored `artifacts/sitemap.xml`.

### Deployment readiness review

Repeated the build with `NEXT_PUBLIC_SITE_URL=https://www.eppixlabsshop.com` explicitly set, because the local `.env.local` sets a localhost origin. The production-origin build, TypeScript checks, all 27 tests, content checks, all 291 sitemap entries and all 304 existing route states passed again. The verifier now also checks HTTP `X-Robots-Tag`, robots disallow rules and an optional `EXPECTED_SITE_ORIGIN` guard. All listed pages are accessible without authentication, self-canonical and eligible for indexing; this does not guarantee Google will index them.

Read-only live checks of the same 291 page paths passed: all HTTPS www pages returned 200, matched their www canonical and had no noindex directive in metadata or response headers. Every HTTPS non-www counterpart returned 308 directly to the same www URL, with no redirect loop. HTTP checks on both hostnames for the homepage, sitemap, robots and a product query URL returned 308 to HTTPS; the apex HTTPS URL then redirects to www. Paths and query strings are retained. Live sitemap and robots still return HTML 404 until these changes are deployed.

Local reports: `artifacts/live-sitemap-review.json`, `artifacts/domain-redirect-review.json`, `artifacts/route-report.json`, and the production-origin XML in `artifacts/sitemap.xml`. These generated artifacts are ignored and are not commit contents.

## Deployment

A new Vercel deployment is required to serve these changes. Nothing has been deployed. Keep the Vercel framework preset on Next.js and do not introduce a catch-all rewrite to `/` or `/index.html`. Confirm `NEXT_PUBLIC_SITE_URL=https://www.eppixlabsshop.com` before building production.

After an approved deployment, verify `https://www.eppixlabsshop.com/sitemap.xml` returns HTTP 200 with XML and `https://www.eppixlabsshop.com/robots.txt` returns the sitemap declaration. The apex URL will retain its existing hostname redirect. Submit `https://www.eppixlabsshop.com/sitemap.xml` in the matching Search Console property and request reprocessing; Google's fetch/indexing status must be checked after deployment.

### Exact commit and push preparation

Current branch: `main`. Remote: `https://github.com/agborhans572-hue/eppixlabs.git`. Read-only `git ls-remote` confirmed local HEAD and remote main both point to `ebf250c7f8281f5791df85ff7287d791e1756a52` at review time. The existing deployment record identifies Vercel project `software333/eppixlabs` with GitHub production branch `main`; remote Vercel integration/environment settings have not been re-inspected in this review.

Commit exactly these ten files. The commands below are prepared instructions and have not been executed:

```powershell
git --literal-pathspecs add -- README.md SITEMAP_AUDIT.md "app/[[...path]]/page.tsx" app/layout.tsx app/sitemap.ts app/robots.ts lib/site.ts package.json scripts/verify-sitemap.mjs tests/sitemap.test.ts
git diff --cached --check
git diff --cached --stat
git commit -m "Fix XML sitemap and robots routes with canonical URL verification"
```

Do not include `.env.local`, `.next`, `.vercel`, generated `next-env.d.ts` changes, reference captures or artifacts. No dependencies or product records changed. Nothing has been staged, committed or pushed during this review.

After explicit approval for a push and its possible automatic production deployment:

```powershell
git push origin main
```

Pushing the Vercel production branch can automatically deploy through the existing GitHub integration. Confirm the Vercel Production environment has `NEXT_PUBLIC_SITE_URL=https://www.eppixlabsshop.com`, retains the existing Supabase/cart settings, and uses the Next.js framework preset with the repository root before approving that push. No additional rewrite or domain change is required.

After deployment, run the stronger sitemap check against production:

```powershell
$env:TEST_ORIGIN='https://www.eppixlabsshop.com'
$env:EXPECTED_SITE_ORIGIN='https://www.eppixlabsshop.com'
npm.cmd run verify:sitemap
```
