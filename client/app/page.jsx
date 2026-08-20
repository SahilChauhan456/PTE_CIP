// Public landing page — deliberately a SERVER component with no auth check and
// no redirect. Everything below is present in the HTML the server returns, so
// crawlers and corporate URL-filtering appliances (Forcepoint, Zscaler, Netskope)
// can read what this site is. The previous version of this file was a client
// component that rendered `null` and pushed the browser to /login, which meant
// GET / returned a ~4.5 KB shell with zero readable text — nothing for a
// classifier to work with, leaving the domain in the "Uncategorized" bucket that
// many corporate policies block outright. Keep this page static: no
// 'use client', no session lookup, no redirect. Authenticated users who land
// here click through to /login, which forwards them straight to /profile.
import Link from 'next/link';
import {
  Zap,
  Target,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Award,
  BarChart3,
  ShieldCheck,
  Mail,
} from 'lucide-react';

export const metadata = {
  // `absolute` opts out of the root layout's "%s | PTE CIP" template, which would
  // otherwise append the brand to a title that already leads with it.
  title: { absolute: 'PTE CIP — Powertrain Engineering Capability Intelligence Platform' },
  description:
    'PTE CIP is an internal engineering capability development platform for competency mapping, skills assessment, training and certification tracking across a powertrain engineering organization.',
  alternates: { canonical: '/' },
};

const CAPABILITIES = [
  {
    icon: Target,
    title: 'Competency mapping',
    body: 'Define the skills each engineering role requires, at which proficiency level, and see where every team member stands against that target.',
  },
  {
    icon: BookOpen,
    title: 'Skills library',
    body: 'A single structured catalogue of powertrain engineering skills — grouped by domain, with clear level definitions from awareness through to expert.',
  },
  {
    icon: ClipboardCheck,
    title: 'Assessment and verification',
    body: 'Engineers record their own proficiency; managers and mentors review and verify it, so capability data reflects demonstrated ability rather than self-report alone.',
  },
  {
    icon: GraduationCap,
    title: 'Training and learning plans',
    body: 'A curated training catalogue linked to skills, with individual learning plans that connect each course to the capability gap it is meant to close.',
  },
  {
    icon: Award,
    title: 'Certification tracking',
    body: 'Track professional certifications and their renewal dates, so expiring credentials are visible well before they lapse.',
  },
  {
    icon: BarChart3,
    title: 'Capability analytics',
    body: 'Dashboards and a future-skills roadmap that show capability coverage, gaps and readiness across teams and across the engineering organization.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      {/* Ambient backdrop glow — matches the sign-in screen. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-accent/20 blur-[150px]" />
        <div className="absolute -bottom-48 -right-32 h-[600px] w-[600px] rounded-full bg-accent-soft/10 blur-[170px]" />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-5 py-6 sm:px-8">
        {/* ---------- Header ---------- */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-ink-800/70 py-1.5 pl-1.5 pr-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
              <Zap size={14} />
            </span>
            <span className="text-sm font-semibold tracking-wide text-white">PTE CIP</span>
          </div>

          <nav className="flex items-center gap-5 text-sm text-slate-400">
            <a href="#about" className="transition hover:text-white">
              About
            </a>
            <a href="#capabilities" className="hidden transition hover:text-white sm:inline">
              Platform
            </a>
            <a href="#contact" className="transition hover:text-white">
              Contact
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              Sign in
            </Link>
          </nav>
        </header>

        {/* ---------- Hero ---------- */}
        <section className="py-16 sm:py-24">
          <p className="text-[11px] uppercase tracking-widest text-accent-soft">
            Powertrain Engineering · Capability Development
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
            PTE CIP — Powertrain Engineering Capability Intelligence Platform
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            PTE CIP is an internal engineering capability development platform. It maps the skills
            each engineering role requires, records and verifies the proficiency of every engineer
            against those requirements, and links the resulting gaps to training, mentoring and
            certification so that capability is built deliberately rather than by chance.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              Sign in to PTE CIP
            </Link>
            <a
              href="#about"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-ink-800/70 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-accent-soft hover:text-white"
            >
              Learn about the platform
            </a>
          </div>
        </section>

        {/* ---------- About ---------- */}
        <section id="about" className="scroll-mt-8 border-t border-line py-14">
          <h2 className="text-2xl font-semibold text-white">About PTE CIP</h2>
          <div className="mt-5 grid gap-6 text-sm leading-relaxed text-slate-400 md:grid-cols-2">
            <p>
              Engineering organizations depend on specialist capability — combustion, electrified
              drive units, transmissions, controls, simulation, testing and validation. That
              capability is usually only visible as informal knowledge held by individual managers.
              PTE CIP makes it explicit: a shared, current picture of which skills the organization
              needs, which it holds today, and where the difference lies.
            </p>
            <p>
              The platform is used by engineers to maintain their own capability record and learning
              plan, by managers and mentors to review and verify proficiency and plan development,
              and by engineering leadership to see capability coverage and readiness across teams.
              It supports competency mapping, assessment, training, certification tracking and
              capability reporting in one place.
            </p>
          </div>
        </section>

        {/* ---------- Capabilities ---------- */}
        <section id="capabilities" className="scroll-mt-8 border-t border-line py-14">
          <h2 className="text-2xl font-semibold text-white">What the platform does</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-soft">
                  <Icon size={17} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Access ---------- */}
        <section className="border-t border-line py-14">
          <h2 className="text-2xl font-semibold text-white">Access and security</h2>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-400">
            PTE CIP is a business application for employees of the organization that operates it.
            This page is public so that the purpose of the site is clear, but all capability,
            employee and training data sits behind authentication and role-based access control:
            only registered accounts can sign in, and each account sees only the records its role
            permits. The platform is not a public directory and does not publish employee
            information.
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="shrink-0 text-accent-soft" />
            Registered employee accounts only.
          </p>
        </section>

        {/* ---------- Contact ---------- */}
        <section id="contact" className="scroll-mt-8 border-t border-line py-14">
          <h2 className="text-2xl font-semibold text-white">Contact and support</h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-400">
            For access requests, account problems or questions about the platform, contact the PTE
            CIP administrator for your organization.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
            <Mail size={15} className="shrink-0 text-accent-soft" />
            <a href="mailto:support@pt-hub.in" className="transition hover:text-white">
              support@pt-hub.in
            </a>
          </p>
        </section>

        {/* ---------- Footer ---------- */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-xs text-slate-600">
          <span>
            PTE CIP — Powertrain Engineering Capability Intelligence Platform. Internal business
            application.
          </span>
          <span className="flex items-center gap-4">
            <Link href="/privacy" className="transition hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-slate-300">
              Terms of use
            </Link>
            <Link href="/login" className="transition hover:text-slate-300">
              Sign in
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
