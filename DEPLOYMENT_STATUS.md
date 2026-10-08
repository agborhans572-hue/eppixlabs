# Deployment status — 8 October 2026

The live site is **https://www.eppixlabsshop.com**. https://eppixlabsshop.com redirects to that hostname. Vercel project: `software333/eppixlabs`; GitHub production branch: `main`. Supabase project: `tpnujdhralsbhglhfgaa`.

## Completed

- Applied `supabase/migrations/202610070001_initial.sql` through the Supabase SQL editor in a transaction. This creates application tables, ownership policies, private server functions, and the public `clone-assets` bucket. SQL-editor application does not automatically record a Supabase CLI migration-history entry; reconcile this before later using `supabase db push` against this project.
- Imported 76 products, 259 variants, 73 batches/certificates, public pages, collections, research articles, and 502 original assets into database/storage. The import is idempotent and now uploads at most four assets concurrently.
- Configured production `NEXT_PUBLIC_SITE_URL`, Supabase URL/publishable key, server credential, and cart cookie secret in Vercel. Private values are secrets. Keys are excluded from Git and verification output.
- Set Supabase's Site URL to `https://www.eppixlabsshop.com` and allowed production/local authentication callbacks, including password-reset callbacks.
- Redeployed successfully and verified all 304 public route states, cart discount boundaries/persistence, rejected client prices and untrusted origins, login/logout, two-account isolation, RLS ownership, saved submissions, and a Supabase storage download.
- Verified signup-confirmation and recovery tokens, password updates, old-password rejection and invalid links without sending email. Temporary test accounts, carts and submissions were cleaned up.

## Remaining provider setup

Google is **disabled** in Supabase. In Google Cloud, create a web OAuth client and configure its consent screen. Its authorized redirect URI must be `https://tpnujdhralsbhglhfgaa.supabase.co/auth/v1/callback`. Enter its client ID and secret in the project's **Authentication → Sign In / Providers → Google** settings, then enable the provider. Complete the Google consent/testing requirements before opening it to the public. Verify sign-in through the live site's Google button afterward.

Custom SMTP is **disabled**. In **Authentication → Emails → SMTP Settings**, configure your email provider's sender address/name, host, port, username and password. Verify the sender/domain with that provider. Supabase's default mail service is restricted and is not sufficient to establish public signup/reset delivery. After configuring SMTP, verify actual signup confirmation and password reset with a mailbox you control. Never put mail credentials in source files or chat.

Checkout remains unavailable. Newsletter/support/affiliate submissions are stored, but their email delivery and payment/fulfillment integrations remain deferred.

## Repeat live verification

With the ignored `.env.local` configured for this Supabase project:

```powershell
node --env-file=.env.local scripts/verify-deployment.mjs
node --env-file=.env.local scripts/verify-auth-links.mjs
$env:TEST_ORIGIN='https://www.eppixlabsshop.com'
node scripts/verify-routes.mjs
```

These scripts create temporary test accounts/submissions and remove them. Local detailed reports are under the ignored `artifacts` directory. They do not test email delivery, Google OAuth, or payments.
