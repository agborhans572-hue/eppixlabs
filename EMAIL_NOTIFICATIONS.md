# Business inbox

Both stores use `hello@eppixlabsshop.com` for customer enquiries, affiliate applications, account messages, and staff notices of newsletter preference submissions. Contact links and policy references are normalized when captured pages render. Canadian payment instructions never expose the reference merchant's transfer recipient.

The inbox is hosted by Zoho. Authentication emails continue through Supabase's separate Resend SMTP configuration. Application notifications use a dedicated Resend sending key restricted to `eppixlabsshop.com`, stored as the server-only `RESEND_API_KEY` production secret in Vercel. The notification sender is `Eppix Labs <hello@eppixlabsshop.com>`; replying to a notification addresses the submitting visitor. No credentials belong in source control.

Validated submissions are saved in Supabase before attempting email. The email identifies the US or Canadian store and includes only the relevant form fields. Existing authentication, ownership, origin checks, rate limits, and honeypot handling apply. Provider retries with identical content use the same Resend idempotency key (24-hour provider retention). Changed newsletter preferences use a different key.

If the provider is unavailable, the request remains saved and the form says the email could not be sent, with the business address for direct contact. There is no automatic retry queue or historical submission backfill. A successful provider response means the email was accepted, not that mailbox receipt has been confirmed.

Checkout remains unavailable and creates no orders. Order emails require the future payment/order integration. Marketing campaigns, restock alerts, and automatic staff replies are separate workflows and remain inactive.

Run `npm.cmd test`, `npm.cmd run typecheck`, and `npm.cmd run build` for validation. Notification tests mock Resend and send no real email. Keep `RESEND_API_KEY` unset when running database/account verification scripts: with a configured key, their test submissions would notify the business inbox.
