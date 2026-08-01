"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/states/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/functions/v1`;
const SUPABASE_PROVIDER = { github: "github", x: "twitter" } as const;

export default function SettingsPage() {
  const { isConnected } = useAccount();
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [linked, setLinked] = useState({ github: false, x: false });
  const [linkBusy, setLinkBusy] = useState<"github" | "x" | null>(null);
  const [prefs, setPrefs] = useState({
    submissionActivity: true,
    evaluationComplete: true,
    rewardSettled: true,
    marketing: false,
  });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;
      setSession(sess);
      if (!sess) return;
      const identities = sess.user.identities ?? [];
      setLinked({
        github: identities.some((i) => i.provider === "github"),
        x: identities.some((i) => i.provider === "twitter"),
      });
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", sess.user.id)
        .maybeSingle();
      if (profile?.display_name) setDisplayName(profile.display_name);
    }
    load();
  }, []);

  async function handleSave() {
    if (!session) return;
    setSaveStatus("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null })
      .eq("id", session.user.id);
    setSaveStatus(error ? "error" : "saved");
  }

  async function handleLinkToggle(account: "github" | "x") {
    if (!session) return;
    setLinkBusy(account);
    if (linked[account]) {
      const identities = session.user.identities ?? [];
      const identity = identities.find((i) => i.provider === SUPABASE_PROVIDER[account]);
      if (identity) {
        await supabase.auth.unlinkIdentity(identity);
        setLinked((l) => ({ ...l, [account]: false }));
      }
      setLinkBusy(null);
    } else {
      await supabase.auth.linkIdentity({
        provider: SUPABASE_PROVIDER[account],
        options: { redirectTo: `${window.location.origin}/settings` },
      });
      // linkIdentity redirects the browser away — no further code runs here.
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="Connect your wallet to manage settings"
          message="Profile and notification preferences are tied to your wallet-authenticated account."
          action={<ConnectButton />}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="Sign in to manage settings"
          message="Wallet connection alone doesn't authenticate you — sign in with your wallet first."
          action={<ButtonLink href="/auth">Go to Sign In</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
        <span className="text-gradient">Settings</span>
      </h1>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div
            className="h-14 w-14 rounded-2xl grid place-items-center font-display text-lg font-bold bg-maj/10 border border-maj/30 text-wist"
            aria-hidden="true"
          >
            {displayName ? displayName[0].toUpperCase() : "?"}
          </div>
          <Button variant="ghost" disabled title="No Supabase Storage bucket is configured yet">
            Upload Avatar
          </Button>
        </div>
        <label htmlFor="display-name" className="block font-mono text-[.62rem] uppercase tracking-[.14em] text-t3 mb-1.5">
          Display Name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Alice"
          className="w-full rounded-lg border border-wist/15 bg-prus/60 px-3.5 py-2.5 text-sm text-t1 placeholder:text-t3 outline-none focus:border-maj focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
        />
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">Linked Socials</h2>
        <div className="flex flex-col gap-3">
          <LinkedRow
            label="GitHub"
            linked={linked.github}
            busy={linkBusy === "github"}
            onToggle={() => handleLinkToggle("github")}
          />
          <LinkedRow
            label="X (Twitter)"
            linked={linked.x}
            busy={linkBusy === "x"}
            onToggle={() => handleLinkToggle("x")}
          />
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">
          Notification Preferences
        </h2>
        <div className="flex flex-col gap-3">
          <PrefRow
            label="Submission activity on my bounties"
            checked={prefs.submissionActivity}
            onToggle={() => setPrefs((p) => ({ ...p, submissionActivity: !p.submissionActivity }))}
          />
          <PrefRow
            label="Evaluation complete"
            checked={prefs.evaluationComplete}
            onToggle={() => setPrefs((p) => ({ ...p, evaluationComplete: !p.evaluationComplete }))}
          />
          <PrefRow
            label="Reward settled to my wallet"
            checked={prefs.rewardSettled}
            onToggle={() => setPrefs((p) => ({ ...p, rewardSettled: !p.rewardSettled }))}
          />
          <PrefRow
            label="Product updates & marketing"
            checked={prefs.marketing}
            onToggle={() => setPrefs((p) => ({ ...p, marketing: !p.marketing }))}
          />
        </div>
      </GlassCard>

      <div className="flex items-center gap-3">
        <Button className="self-start" onClick={handleSave} disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving..." : "Save Changes"}
        </Button>
        {saveStatus === "saved" && <span className="text-xs text-vgreen2 font-mono">Saved.</span>}
        {saveStatus === "error" && <span className="text-xs text-rose font-mono">Failed to save.</span>}
      </div>
    </div>
  );
}

function LinkedRow({
  label,
  linked,
  busy,
  onToggle,
}: {
  label: string;
  linked: boolean;
  busy?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-wist/10 px-4 py-3">
      <span className="text-sm text-t1">{label}</span>
      {linked ? (
        <Button variant="ghost" className="!px-4 !py-1.5 text-xs" onClick={onToggle} disabled={busy}>
          {busy ? "..." : "Unlink"}
        </Button>
      ) : (
        <Button className="!px-4 !py-1.5 text-xs" onClick={onToggle} disabled={busy}>
          {busy ? "Redirecting..." : "Link"}
        </Button>
      )}
    </div>
  );
}

function PrefRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-wist/10 px-4 py-3 cursor-pointer">
      <span className="text-sm text-t1">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded accent-[#6A4DD4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
      />
    </label>
  );
}
