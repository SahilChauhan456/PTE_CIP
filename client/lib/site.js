// Canonical public origin of the deployment. Used for metadataBase, robots.txt
// and sitemap.xml. Override per environment with NEXT_PUBLIC_SITE_URL (no
// trailing slash) — e.g. a staging host — otherwise production is assumed.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pt-hub.in').replace(
  /\/+$/,
  ''
);
