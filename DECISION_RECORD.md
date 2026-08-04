# Vertex — Decision Record

Why this project, over what alternatives, and how it holds up against its own
gates. Written as a record for anyone auditing the project's reasoning, not
as marketing copy — see "Self-audit" at the bottom for the uncomfortable
answers too.

## Candidates considered

Ten candidates, spanning web-fetch consensus, native GEN value, image
evidence, embeddings/semantic search, and cross-contract/API composition —
not just "fetch a web page and judge it" repeated eight times.

1. **Vertex (chosen)** — bounty marketplace where a single Intelligent
   Contract evaluates every submission to a bounty *together*, builds a
   Contribution Graph of relative influence per category, and pays out GEN
   proportionally instead of picking one winner. *Capabilities: web fetch,
   native GEN escrow.*

2. **Prediction market resolved by web evidence** — sponsor stakes GEN on a
   real-world outcome, contract resolves via `web.render` + comparative
   consensus at settlement. Rejected: structurally identical to EventWeaver,
   the reference project this repo's escrow/payout patterns are explicitly
   derived from — building it again would be "copy/lightly-modify an
   already-rewarded project," one of the review team's stated rejection
   criteria.

3. **On-chain name/identity registry with consensus-verified ownership
   claims** — rejected outright; this is close to a pattern reviewers have
   explicitly called out ("a name service based on IC is not a proper
   GenLayer usecase") — ownership binding doesn't need adversarial judgment,
   it needs a signature check, which is deterministic.

4. **AI PR/code-review bot** — an IC that reads a diff and comments on code
   quality. Rejected: this is "a plain AI-advice app with GenLayer bolted
   on" — nothing about the judgment requires trustless consensus between two
   parties who distrust each other; a single LLM call behind a normal
   backend does the same job.

5. **Freelance-escrow dispute arbitration via screenshot evidence** — client
   and freelancer both stake into escrow; on dispute, the contract judges
   delivered work using `exec_prompt(images=[...])` against screenshots of
   the deliverable/chat log, releasing funds proportionally rather than
   all-or-nothing. *Capabilities: images, native GEN escrow.* Genuinely
   strong — real two-party distrust (Gate B), real value at stake, judgment
   that needs to look at something rather than parse it. Runner-up; see
   "what would have been picked" below.

6. **Semantic duplicate-bounty-report triage via embeddings** — a bug-bounty
   registry uses `VecDB`/`knn` to detect near-duplicate vulnerability
   reports across submitters, with consensus resolving borderline cases.
   *Capability: embeddings.* Rejected on Gate B: duplicate detection is a
   search/ranking problem, not an adversarial-trust problem — the two
   "distrusting parties" here are weak (most submitters aren't actually
   adversarial toward each other), and a good embedding index doesn't need
   blockchain consensus to be trustworthy.

7. **Parametric insurance paying out on live weather/price-feed data** —
   rejected on Gate C: the core question ("did the temperature cross X") is
   answered by parsing a number, not judgment. A regex or a price oracle
   solves it; consensus adds latency without adding trust where it matters.

8. **Content-moderation DAO with stake-weighted removal votes**, judged by
   the contract reading reported content (screenshot evidence) rather than
   trusting reporter claims. *Capabilities: images, native GEN
   staking/slashing.* Real two-party structure (reporter vs. poster) and
   real judgment. Rejected in favor of Vertex per rejection-criteria #3:
   binary keep/remove voting is a common IC pattern already well-explored
   in the ecosystem; Vertex's proportional multi-submission merge is a
   genuinely different mechanism, not just a different application of the
   same one.

9. **Multi-source journalism fact-checker fusing competing articles into one
   verified account** — nearly the same shape as Vertex (fetch multiple
   sources, reason across all of them jointly, no single "winner"). Kept in
   the list deliberately as the honest answer to "which two candidates are
   really the same idea twice" in the self-audit below, rather than pruning
   it to make the list look more diverse than it is.

10. **Cross-contract escrow factory** — a factory IC that deploys
    per-project escrow instances, governed by a shared upgrade/pause
    contract. *Capability: contract factories, cross-contract composition.*
    Rejected on Gate C: the factory/governance layer itself is pure
    deterministic plumbing; wherever real judgment would live is a
    sub-contract, i.e. this is an architecture pattern, not a product with
    a use case a stranger understands in one sentence.

## Why Vertex passes every gate

- **Gate A — counterfactual.** Delete GenLayer: a sponsor (or a centralized
  platform) has to manually read every submission and decide, alone, how
  much each contributor's work mattered. Every contributor has to trust that
  one party's judgment and honesty about the split. That's exactly the
  single-party-must-be-trusted failure mode the gate is checking for.
- **Gate B — two distrusting parties.** Named explicitly: the sponsor (wants
  the reward pool to reflect real contribution, not favoritism) and multiple
  competing contributors (each wants their own work credited fairly against
  the others' — a UX contributor and a security contributor both have a
  stake in the split not favoring the other unfairly). This is a genuine
  multi-party trust problem, not sponsor-vs-one-contributor.
- **Gate C — irreducibly semantic.** "How much did this submission's
  security work contribute to the merged solution, relative to that
  submission's UX work" cannot be answered by a formula. It requires reading
  real code/docs and forming a technical judgment — exactly what
  `gl.eq_principle.prompt_comparative` over fetched evidence is for.
- **Gate D — evidence the contract fetches itself.** `evaluate_bounty`
  fetches every submission's `evidence_url` via `gl.nondet.web.render`
  inside the leader/validator function (`_fetch_submission_evidence`) and
  weighs that over the submitter's own summary — a submitter's claims are
  an input, not a fact the contract trusts.
- **Gate E — would a stranger use this twice.** Sponsors running recurring
  bounty programs and contributors submitting to more than one bounty are
  the base case, not an edge case, for a marketplace.
- **Gate F — path beyond submission.** Any project or DAO currently running
  winner-take-all bounties is a candidate adopter of a proportional-reward
  model; it composes cleanly with the existing GitHub-issue-bounty pattern
  many projects already use, just with the payout logic replaced.
- **Gate G — latency budget.** Bounty creation and submission are plain
  deterministic writes (~20–40s each) — nothing about filling in a form
  waits on consensus. `evaluate_bounty` is a single non-deterministic round
  (one `prompt_comparative` call, N evidence fetches for N submissions) that
  the sponsor explicitly triggers as a separate transaction from anything a
  user is actively waiting on. It is genuinely slower as submission count
  grows — an honest limit, not hidden — and the frontend now surfaces real
  consensus stages (PROPOSING/COMMITTING/REVEALING) rather than a spinner,
  specifically because this is the one step in the app where that latency
  is real.

## Self-audit

- **How many distinct capabilities does the actual *built* contract use?**
  Two: `gl.nondet.web.render` (web evidence fetch) and
  `gl.eq_principle.prompt_comparative` (LLM joint reasoning), plus native
  GEN value via `gl.message.value` / `_send_gen`. Not images, not
  embeddings, not cross-contract composition. The candidate list above
  spans five capability areas during ideation; the shipped product narrows
  to two of them plus native value — a real narrowing, not a false claim of
  breadth.
- **Which two candidates are really the same idea twice?** #1 (Vertex) and
  #9 (journalism fact-checker) — both are "fetch multiple sources, reason
  across all of them jointly, no single winner." #9 exists in this list
  because pretending it's a meaningfully different idea from #1 would be
  dishonest; it's a different *application* of the identical mechanism.
- **What would have been picked if web access did not exist?** #5, the
  freelance-escrow dispute arbitration via screenshot evidence. It has the
  same two-distrusting-parties structure and the same native-value stakes
  as Vertex, just resolved via `exec_prompt(images=[...])` over
  screenshots instead of `web.render` over URLs — proof the web-fetch
  capability wasn't load-bearing for *why this shape of problem* was
  chosen, only for *which evidence format* fit the specific bounty-evidence
  use case (a repo/demo link is a more natural artifact for a software
  bounty than a screenshot).
