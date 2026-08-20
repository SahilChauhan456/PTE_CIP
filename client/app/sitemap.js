// Served by Next as /sitemap.xml. Only the publicly reachable pages belong here
// — the authenticated application routes are deliberately absent.
import { SITE_URL } from '@/lib/site';

export default function sitemap() {
  return ['/', '/login', '/privacy', '/terms'].map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.5,
  }));
}
