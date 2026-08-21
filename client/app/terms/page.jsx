// Public policy page. Static server component — no auth, no client JS needed.
// NOTE: plain-language acceptable-use terms for an internal business tool, written
// so the site carries the standard public furniture a URL classifier expects. Have
// the operating organization's legal owner review the wording before relying on it.
import Link from 'next/link';

export const metadata = {
  title: 'Terms of use — PTE CIP',
  description:
    'Terms of use for PTE CIP, an internal engineering capability development platform for competency mapping, assessment and training.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <div className="mx-auto max-w-[820px] px-5 py-14 sm:px-8">
        <Link href="/" className="text-sm text-accent-soft transition hover:text-white">
          ← PTE CIP
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-white">Terms of use</h1>
        <p className="mt-3 text-sm text-slate-500">
          Conditions for using the PTE CIP platform.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white">Authorized use</h2>
            <p className="mt-3">
              PTE CIP is an internal business application provided to employees of the operating
              organization for engineering capability development — competency mapping, skills
              assessment, training, mentoring and certification tracking. Use of the platform is
              limited to that purpose and to accounts issued by the organization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Accounts</h2>
            <p className="mt-3">
              Accounts are personal and must not be shared. You are responsible for activity carried
              out under your credentials, and for reporting any suspected compromise to the platform
              administrator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Data you enter</h2>
            <p className="mt-3">
              Capability, training and profile information you record should be accurate.
              Proficiency claims may be reviewed and verified by managers or mentors. Do not enter
              confidential project information, personal data about third parties, or any content
              that is not required for capability management.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Restrictions</h2>
            <p className="mt-3">
              Do not attempt to access records your role does not permit, extract bulk employee data
              for use outside the organization, probe or interfere with the platform&apos;s security,
              or use automated tooling against it without written authorization from the
              administrator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Availability and changes</h2>
            <p className="mt-3">
              The platform is provided for internal use on an as-available basis and may be changed,
              interrupted for maintenance, or withdrawn. Access ends when employment or the
              authorizing engagement ends.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p className="mt-3">
              Questions about these terms or about access should go to the PTE CIP administrator for
              your organization at{' '}
              <a href="mailto:support@pt-hub.in" className="text-accent-soft hover:text-white">
                support@pt-hub.in
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-line pt-6 text-xs text-slate-600">
          <Link href="/privacy" className="transition hover:text-slate-300">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
