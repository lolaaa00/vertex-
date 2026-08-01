import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/states/EmptyState";
import { CONTRIBUTOR_COLORS, avatarLetterForWallet, colorKeyForWallet } from "@/lib/colors";
import {
  getContributionGraphByContributor,
  getProfileByWallet,
  getSocialConnections,
  getSubmissionsByContributor,
} from "@/lib/data";
import { formatGen, truncateAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { wallet: string } }) {
  const wallet = decodeURIComponent(params.wallet);
  const [profile, mySubmissions, myGraphEntries] = await Promise.all([
    getProfileByWallet(wallet),
    getSubmissionsByContributor(wallet),
    getContributionGraphByContributor(wallet),
  ]);
  const socials = profile ? await getSocialConnections(profile.id) : [];

  const colorKey = colorKeyForWallet(wallet);
  const colors = CONTRIBUTOR_COLORS[colorKey];
  const totalEarned = myGraphEntries.reduce((sum, n) => sum + n.rewardOwedGen, 0);
  const categories = Array.from(new Set(myGraphEntries.map((n) => n.category)));
  const github = socials.find((s) => s.provider === "github");
  const x = socials.find((s) => s.provider === "x");

  return (
    <div className="max-w-3xl mx-auto">
      <GlassCard className="p-7 mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className={`h-16 w-16 rounded-2xl grid place-items-center font-display text-xl font-bold border shrink-0 ${colors.bg} ${colors.border} ${colors.text}`}
            aria-hidden="true"
          >
            {avatarLetterForWallet(wallet)}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-t1">
              {profile?.displayName || truncateAddress(wallet, 6)}
            </h1>
            <p className="font-mono text-xs text-t3">{truncateAddress(wallet, 6)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {github && (
            <span className="font-mono text-[.65rem] rounded-full border border-wist/20 bg-wist/[.05] px-3 py-1 text-t2">
              GitHub · {github.providerUsername}
            </span>
          )}
          {x && (
            <span className="font-mono text-[.65rem] rounded-full border border-wist/20 bg-wist/[.05] px-3 py-1 text-t2">
              X · @{x.providerUsername}
            </span>
          )}
          {!github && !x && (
            <span className="font-mono text-[.65rem] text-t3">No linked socials.</span>
          )}
        </div>
      </GlassCard>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <GlassCard className="p-6 text-center">
          <div className="font-mono text-2xl text-gradient font-medium">
            {formatGen(totalEarned)}
          </div>
          <div className="font-mono text-[.58rem] uppercase tracking-[.14em] text-t3 mt-1">
            Total GEN Earned
          </div>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <div className="font-mono text-2xl text-gradient font-medium">{mySubmissions.length}</div>
          <div className="font-mono text-[.58rem] uppercase tracking-[.14em] text-t3 mt-1">
            Submissions
          </div>
        </GlassCard>
      </div>

      <Section title="Categories of Strength">
        {categories.length === 0 ? (
          <EmptyState title="No settled contributions yet" message="This contributor has no evaluated contribution-graph entries yet." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c}
                className="font-mono text-xs rounded-full border border-maj/25 bg-maj/[.08] px-3.5 py-1.5 text-wist"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Submission History">
        {mySubmissions.length === 0 ? (
          <EmptyState title="No submissions yet" message="This contributor hasn't submitted to any bounty yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {mySubmissions.map((s) => (
              <GlassCard key={s.id} className="p-4">
                <p className="text-sm text-t2">{s.summary}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[.58rem] uppercase tracking-[.2em] text-t3">{title}</span>
        <span className="flex-1 h-px bg-gradient-to-r from-wist/[.12] to-transparent" />
      </div>
      {children}
    </div>
  );
}
