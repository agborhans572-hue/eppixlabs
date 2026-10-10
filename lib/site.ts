// Match the canonical production hostname and retain the local/preview override.
export function siteOrigin():string {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.eppixlabsshop.com').origin;
}

export function isNonIndexablePath(route:string):boolean {
  return /^\/(?:account|cart|checkout|login|signup|forgot-password|reset-password|auth|api)(?:\/|$)/.test(route);
}
