# Deployment status — 8 October 2026

The live site is **https://www.eppixlabsshop.com**. https://eppixlabsshop.com redirects to that hostname. Vercel project: `software333/eppixlabs`; GitHub production branch: `main`. Supabase project: `tpnujdhralsbhglhfgaa`.

## Completed

- Applied `supabase/migrations/202610070001_initial.sql` through the Supabase SQL editor in a transaction. This creates application tables, ownership policies, private server functions, and the public `clone-assets` bucket. SQL-editor application does not automatically record a Supabase CLI migration-history entry; reconcile this before later using `supabase db push` against this project.
- Imported 76 products, 259 variants, 73 batches/certificates, public pages, collections, research articles, and 502 original assets into database/storage. The import is idempotent and now uploads at most four assets concurrently.
- Configured production `NEXT_PUBLIC_SITE_URL`, Supabase URL/publishable key, server credential, and cart cookie secret in Vercel. Private values are secrets. Keys are excluded from Git and verification output.
- Set Supabase's Site URL to `https://www.eppixlabsshop.com` and allowed production/local authentication callbacks, including password-reset callbacks.
- Redeployed successfully and verified all 304 public route states, cart discount boundaries/persistence, rejected client prices and untrusted origins, login/logout, two-account isolation, RLS ownership, saved submissions, and a Supabase storage download.
- Verified signup-confirmation and recovery tokens, password updates, old-password rejection and invalid links without sending email. Temporary test accounts, carts and submissions were cleaned up.

## Provider verification

Google is now enabled. The live Google button reached account selection, completed consent, returned to the protected account page, and logout restored the login redirect. Custom SMTP is enabled with Resend; signup-confirmation and password-reset requests to the user-approved test mailbox were accepted and appear in Resend with a `sent` event.

Inbox delivery remains unconfirmed. Both Google Public DNS and Cloudflare currently return no MX records for `eppixlabsshop.com`. Resend shows no `delivered` event for either test email yet. Configure a receiving mailbox or forwarding service for `hello@eppixlabsshop.com` and publish that provider's required MX records; outbound SMTP configuration alone does not establish receiving mail. Allow DNS propagation, then verify receipt and actual email-link completion. The requested mailbox signup account is retained so its confirmation link is not invalidated; generated temporary automated test accounts were removed.

Google OAuth and SMTP settings can be managed in Supabase's authentication provider and email settings. Keep the Site URL and callbacks on `https://www.eppixlabsshop.com`. Never put provider credentials in source files or chat.

Checkout remains unavailable. Newsletter/support/affiliate submissions are stored, but their email delivery and payment/fulfillment integrations remain deferred.

The latest checks passed all 304 live route states, 27 live backend checks, 5 authentication-token checks and 24 unit tests. Interactive live checks also passed filter selection/reset, strength search, Google OAuth return and logout. These checks do not establish pixel-identical fidelity for every visual or interaction state.

## Repeat live verification

With the ignored `.env.local` configured for this Supabase project:

```powershell
node --env-file=.env.local scripts/verify-deployment.mjs
node --env-file=.env.local scripts/verify-auth-links.mjs
$env:TEST_ORIGIN='https://www.eppixlabsshop.com'
node scripts/verify-routes.mjs
```

These scripts create temporary test accounts/submissions and remove them. Local detailed reports are under the ignored `artifacts` directory. The repeatable scripts do not test actual email delivery, Google OAuth consent, or payments; the provider and OAuth checks above were performed separately.
