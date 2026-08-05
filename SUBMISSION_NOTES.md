# Vertex — Submission Notes

Draft text for the GenLayer Portal submission and any accompanying public
post. Written plain and specific per the spec's own guidance — no "seamlessly
leverages the power of" filler. Review, edit, and post these yourself; I
haven't published anything.

## Submission notes (short field)

Character count: 666 (counted programmatically via `len()`, not estimated)

> Vertex is a bounty marketplace where a single GenLayer Intelligent
> Contract evaluates ALL submissions to a bounty together instead of picking
> one winner. Sponsors fund a bounty in native GEN; contributors submit real
> evidence (a repo/demo URL); once submissions close, the contract fetches
> that evidence itself via `gl.nondet.web.render`, reasons across every
> submission jointly under `gl.eq_principle.prompt_comparative`, and pays
> out GEN proportionally by a Contribution Graph of who influenced the
> merged solution and in which category. Live at ver-tex.vercel.app,
> contract `0x44A873a87602E16779313681b0b5165ABc1d3D6a` on StudioNet.
> 34/34 direct tests pass; lint clean.

## Public post (longer)

Character count: 1532 (counted programmatically via `len()`, not estimated)

> **Vertex — merge competing solutions instead of choosing a single
> winner.**
>
> Traditional bounties pick one winner and everyone else gets nothing,
> regardless of how good their work was. Vertex replaces that with a single
> GenLayer Intelligent Contract that evaluates every submission to a
> bounty together — not in isolation — and pays out native GEN
> proportionally to each contributor's actual influence on the merged
> result.
>
> How it works: a sponsor funds a bounty with GEN. Contributors submit real
> evidence — a repo, a live demo, whatever a stranger could actually check.
> Once submissions close, the contract fetches every submission's evidence
> itself (it doesn't trust anyone's claims), reasons across all of them
> jointly under validator consensus, and builds a Contribution Graph:
> who was strongest in which category, how the pieces complement each
> other, and what share of the reward pool each contributor earned.
>
> Two wallet paths — connect MetaMask/Rainbow/etc., or generate a
> browser-only wallet with zero setup. Both write through the same
> identity as what's displayed.
>
> Live: ver-tex.vercel.app
> Contract (StudioNet): `0x44A873a87602E16779313681b0b5165ABc1d3D6a`
> Source: github.com/lolaaa00/vertex-
>
> 34/34 direct tests passing, lint clean. Honest limit: integration tests
> are correct against the SDK but can't complete end-to-end here — contract
> deployment via the CLI/SDK path is currently unreliable on StudioNet
> (confirmed across 6 attempts, 2 accounts); only the Studio web UI
> deploys reliably right now, which is what's live.

## One measured result to cite verbally (e.g. in the video)

A real submission transaction from a freshly generated (never-before-used)
browser wallet reached full validator consensus on StudioNet:
`0x0379fdf1dc17c241db09afa51753dcdbe15178214d591af5dec761454ab2964c` —
status `FINALIZED`, result `MAJORITY_AGREE`. (This specific call was
correctly rejected by the contract because the bounty id didn't exist yet
on the freshly redeployed instance — which is itself a good demo moment:
the UI caught and correctly reported that on-chain rejection rather than
showing a false success, a bug found and fixed during this same testing
pass.)
