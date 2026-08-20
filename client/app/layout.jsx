import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { SITE_URL } from '@/lib/site';

// metadataBase lets the per-page `alternates.canonical: '/'` values resolve to
// absolute URLs, and gives Open Graph tags a real origin. The explicit
// `robots: { index: true, follow: true }` is here as documentation as much as
// anything: nothing in this app should ever ship a site-wide noindex, since that
// is one of the signals that leaves a domain uncategorized by corporate URL
// filters. Individual authenticated routes are excluded via app/robots.js.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PTE CIP — Powertrain Engineering Capability Intelligence Platform',
    template: '%s | PTE CIP',
  },
  applicationName: 'PTE CIP',
  description:
    'PTE CIP is an internal engineering capability development platform for competency mapping, skills assessment, training and certification tracking across a powertrain engineering organization.',
  keywords: [
    'PTE CIP',
    'capability intelligence platform',
    'powertrain engineering',
    'competency mapping',
    'skills assessment',
    'engineering training',
    'certification tracking',
    'capability development',
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'PTE CIP',
    url: '/',
    title: 'PTE CIP — Powertrain Engineering Capability Intelligence Platform',
    description:
      'Internal engineering capability development platform: competency mapping, skills assessment, training, mentoring and certification tracking.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-slate-200 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
