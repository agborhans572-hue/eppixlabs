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

Update verified on 10 October 2026: the user created `hello@eppixlabsshop.com` with Zoho. Google Public DNS and Cloudflare both resolve the domain's receiving MX records to `mx.zoho.com` (priority 10), `mx2.zoho.com` (20), and `mx3.zoho.com` (50). The domain publishes a single Zoho SPF record; the separate Resend DKIM and `send` subdomain SPF/MX records remain present. The earlier missing-MX delivery issue is resolved.

Verified both directions using the user's existing mailbox conversation: a message from `hello@eppixlabsshop.com` reached the connected Gmail inbox at 11:33 EAT, and its Gmail reply is visible in the Zoho inbox. A new password-reset request through the production website returned HTTP 200, Resend reported delivery, and the message appeared in Zoho at 12:18 EAT. A signup-confirmation resend for the existing test account also succeeded and appeared in Zoho at 12:19 EAT. Both authentication emails use the existing Eppix Labs sender and production callback origin. No passwords were changed, confirmation/reset links were not followed, and no new accounts were created. Mailbox receipt and transport are verified; actual user completion of these links remains a separate check.

No DNS or SMTP changes were needed during this verification, and no deployment is required for the mailbox/authentication-mail resolution. Newsletter/support/affiliate form notifications remain deferred in application code; establishing a mailbox does not activate those workflows.

## Email OTP account creation — 10 October 2026

Email/password signup now has a numeric verification-code step, code resending with a 60-second cooldown, email correction, and server-side verification that establishes the session after confirmation. Supabase's public settings confirm email confirmation is required. Google sign-in remains unchanged.

The hosted Confirm sign up template was updated after user approval to match `supabase/templates/confirmation.html`, with subject `Your Eppix Labs verification code`. It contains the numeric code and a confirmation-link fallback. These application changes are released through the existing GitHub/Vercel production branch. Future template changes must also be applied to the hosted Supabase configuration; saving a local HTML template alone does not update it.

Validation passed: 29 unit tests, production build, TypeScript, content checks, and nine real Supabase integration checks covering the pre-verification account gate, rejected unverified password login, malformed/incorrect/reused codes, rejected cross-origin requests, session cookies and successful password login after verification. Integration verification creates and deletes a temporary account with an invalid test address using generated tokens; it does not send email. A user-approved browser signup for a temporary Gmail alias reached the code-entry screen, and the OTP email arrived in the Gmail inbox from `hello@eppixlabsshop.com` with the configured subject and numeric-code template. Entering that inbox code is a separate manual browser check; the mail connector withholds authentication codes.

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

## Account dashboard update - October 10, 2026

Inspected the signed-in reference account dashboard in Chrome and captured six anonymized layouts. Replaced the minimal account screen with the reference sidebar, greeting, quick links, recent-orders empty state and partner program panel. All six sections require authentication and publish noindex metadata. Addresses and notification preferences persist in Supabase user metadata; messages persist as support requests scoped to the authenticated user ID. The account API is included in session refresh and private/no-store handling. The build includes all six account templates. No migration or additional environment variables are needed.

Validation: production build, type checking, 32 unit tests, six account integration groups, nine email OTP checks, content/assets checks and all 291 canonical sitemap URLs passed locally. Browser checks verified address and preference persistence, saved messages, dashboard styling in both themes and sign-out. Temporary test accounts and support messages were removed.

Existing checkout remains unavailable and creates no orders. Customer orders, staff reply/alert delivery and product-follow notifications still need their own backend integration. Deployment is authorized through the existing GitHub main branch and Vercel integration. Repeat production account verification with TEST_ORIGIN and NEXT_PUBLIC_SITE_URL set to https://www.eppixlabsshop.com; results are written to the ignored artifacts directory.
