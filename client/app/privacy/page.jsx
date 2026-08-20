// Public policy page. Static server component — no auth, no client JS needed.
// NOTE: this is a factual description of what the application stores, written so
// that the site has the standard public furniture a URL classifier expects. It is
// not legal advice; have the operating organization's legal/privacy owner review
// and adjust the wording before relying on it.
import Link from 'next/link';

export const metadata = {
  title: 'Privacy — PTE CIP',
  description:
    'How PTE CIP, an internal engineering capability development platform, handles employee capability, training and certification data.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <div className="mx-auto max-w-[820px] px-5 py-14 sm:px-8">
        <Link href="/" className="text-sm text-accent-soft transition hover:text-white">
          ← PTE CIP
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-white">Privacy</h1>
        <p className="mt-3 text-sm text-slate-500">
          Applies to the PTE CIP platform operated for internal use by the engineering organization
          that licenses it.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white">Who this applies to</h2>
            <p className="mt-3">
              PTE CIP is an internal business application. Accounts are created for employees of the
              operating organization; there is no public sign-up and no consumer-facing service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">What the platform stores</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Employment and directory details needed to place a person in the organization: name,
                work email address, job title, department, reporting line and location.
              </li>
              <li>
                Capability records: skill proficiency levels, self-assessments, manager and mentor
                verifications, and the history of changes to those records.
              </li>
              <li>
                Development records: learning plans, training enrolments and completions,
                certifications and their validity dates.
              </li>
              <li>
                A profile picture and CV/profile content, where the employee chooses to add them.
              </li>
              <li>
                Operational data required to run the service, such as authentication sessions and
                request logs.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">How it is used</h2>
            <p className="mt-3">
              Data is used to map required against available capability, to plan and track
              individual development, and to report capability coverage and readiness within the
              organization. It is not sold, not shared with advertisers, and not used for any
              purpose outside the operating organization&apos;s capability management.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Who can see it</h2>
            <p className="mt-3">
              Access is authenticated and role-based. Employees see their own record; managers and
              mentors see the records of the people they are responsible for; administrators
              maintain the platform. The platform is not a public directory and does not publish
              employee information externally.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Retention and corrections</h2>
            <p className="mt-3">
              Records are retained for as long as the account is active and afterwards only as the
              operating organization&apos;s internal retention policy requires. To correct or query
              your record, or to request removal, contact the PTE CIP administrator for your
              organization at{' '}
              <a href="mailto:support@pt-hub.in" className="text-accent-soft hover:text-white">
                support@pt-hub.in
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-line pt-6 text-xs text-slate-600">
          <Link href="/terms" className="transition hover:text-slate-300">
            Terms of use
          </Link>
        </div>
      </div>
    </div>
  );
}
