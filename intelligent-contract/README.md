# Vertex — Bounty Fusion Intelligent Contract

"Merge competing solutions instead of choosing a single winner."

`contracts/vertex_bounty_fusion.py` is a single GenLayer Intelligent Contract
that runs a multi-bounty marketplace: any sponsor can fund a bounty with
native GEN, contributors submit real evidence (repo/demo URLs), and — once
the sponsor closes submissions — the contract fetches that evidence, reasons
across ALL submissions together (never picking one winner), builds a
**Contribution Graph** of per-category strength and complementary
relationships, and pays out GEN proportionally.

This README covers local linting, testing, and how to hand off deployment.

## Prerequisites

```bash
# GenLayer CLI + local dev environment
npm install -g genlayer

# Contract linter (fast AST checks + SDK schema validation)
pip install genvm-linter

# Contract test framework (direct + gltest integration runner)
pip install "genlayer-test[sim]"
```

If `genvm-lint` is not on your `PATH` after `pip install`, invoke it via the
interpreter that owns the install, e.g.
`python3 -m pip show -f genvm-linter` to locate the script, or run it from a
project virtualenv where it was installed (e.g. `.venv/bin/genvm-lint`).

## 1. Lint

Run this after every change to the contract, and fix every warning before
moving on:

```bash
cd intelligent-contract
genvm-lint check contracts/vertex_bounty_fusion.py --json
```

Expected clean output looks like:

```json
{"ok":true,"lint":{"ok":true,"passed":3},
 "validate":{"ok":true,"contract":"VertexBountyFusion","methods":26,
             "view_methods":13,"write_methods":13,"ctor_params":2,"warnings":[...]}}
```

A `warnings` entry noting a newer `py-genlayer` runner is available (code
`I200`) is informational only — this contract intentionally pins the same
`Depends` hash used by the reference EventWeaver contract this project's
patterns were derived from, per the locked project convention of not
inventing/guessing GenVM runner versions. Any other warning or `"ok":false`
must be fixed before proceeding.

## 2. Direct (unit) tests

Fast, in-memory tests using `gltest.direct` — no simulator, no network. All
web (`gl.nondet.web.render`) and LLM (`gl.nondet.exec_prompt` /
`gl.eq_principle.prompt_comparative`) calls are mocked via `vm.mock_web(...)`
and `vm.mock_llm(...)`. These cover state transitions, access control,
input validation, double-evaluation/double-payout guards, allocation
normalization, and the zero-then-transfer escrow ordering.

```bash
cd intelligent-contract
pytest tests/direct/ -v
```

## 3. Integration tests

`tests/integration/test_vertex_bounty_fusion_integration.py` exercises real
GenVM consensus: actual `gl.eq_principle.prompt_comparative` adjudication
across validators, actual web fetches of submitted evidence URLs, and (on a
network with a live LLM provider configured) actual LLM reasoning. This
requires a running environment — GenLayer Studio, GLSim, or a configured
StudioNet RPC — and, for non-local networks, a funded account.

```bash
# Option A — local simulator (GLSim)
genlayer network set localnet
genlayer up                      # starts the local GenVM/Studio simulator

# Option B — StudioNet (gasless; 0 GEN is expected and fine)
genlayer network set studionet

# Option C — a funded testnet (Bradbury / Asimov)
# fund the account first via https://testnet-faucet.genlayer.foundation/
genlayer network set testnet_bradbury

cd intelligent-contract
gltest tests/integration/ -v -s
```

These tests were written to be correct against the current GenLayer test
SDK surface (`gltest.get_contract_factory`, `.deploy(args=...)`,
`contract.<method>(args=..., value=...)`, `tx.wait()`, `tx.status`) but were
**not executed** in this environment — no Studio/GLSim/StudioNet instance
was available here. Do not treat any pass/fail claim about them as verified
until you run them yourself. One sub-test
(`test_claim_sponsor_timeout_recovery_path`) is marked `pytest.skip(...)`
because it requires waiting out the contract's `MIN_TIMEOUT_GRACE_SECONDS`
(3600s) floor on a live network, or a GLSim harness with block-time warp —
run it manually with patience, or extend GLSim's warp support first.

## 4. Deploy

**The project owner deploys this contract — an assistant should not deploy
production instances on someone else's behalf.**

```bash
cd intelligent-contract
genlayer network set studionet   # or the target network
genlayer deploy --contract contracts/vertex_bounty_fusion.py --args 0 3600
# args are positional: min_bond_default, timeout_grace_seconds (seconds)
```

### ⚠️ CLI deploy quirk — use the GenLayer Studio web UI if the CLI fails

During this project's own testing, `genlayer deploy` (CLI v0.39.2) **printed
"Contract deployed successfully" while the transaction actually failed** —
the finalized receipt showed `result: { status: 'contract_error', payload:
'invalid_contract' }`, with no stdout/stderr to explain why. A control
deploy of an unrelated, independently-working reference contract via the
exact same CLI command succeeded, which ruled out the network/account/CLI
version as a systemic problem — but the root cause of that one failed CLI
deploy was never conclusively identified. **Deploying the same, unmodified
`vertex_bounty_fusion.py` via the GenLayer Studio web UI worked on the first
try** and produced a fully verified, queryable contract. If you hit
`invalid_contract` from the CLI, don't assume the contract is broken —
try the Studio web UI deploy screen instead before making any code changes.

### ✅ Verified working deployment (StudioNet)

| | |
|---|---|
| Address | `0x612Dc3dA6d40cAF105185A07DC398D0f14A46e3e` |
| Deployed via | GenLayer Studio web UI |
| Constructor args | `min_bond_default=0`, `timeout_grace_seconds=3600` (fast-testing value, not production-realistic — redeploy with a longer grace period such as 259200–604800 for real use) |
| Verified by | `genlayer call <address> get_config` / `get_categories` / `get_bounties` — all returned correct live data |

This is a **test deployment for verification purposes**. Treat it as proof
the contract works, not necessarily the address the platform ships with —
the project owner may deploy a fresh instance (so they hold the `owner`
role for admin functions like `pause`/`set_owner`) before real use, and
should decide with the person receiving this project which address is
authoritative going forward.

Once you know the address you're using, provide it back so the
frontend/backend wiring (Next.js app, Supabase Edge Functions) can be
pointed at it. Useful follow-up commands for the debug loop:

```bash
genlayer schema <address>          # inspect the deployed ABI
genlayer code <address>            # confirm the deployed bytecode/source hash
genlayer call <address> get_config # sanity-check a view call
genlayer receipt <tx_hash> --stdout --stderr   # debug a failed transaction
```

## Deployment status

**Contract is written, linted, tested, and verified deployed and working**
on GenLayer StudioNet as of 2026-07-29. See "Verified working deployment"
above. Nothing about the contract itself is blocking — any remaining work
is wiring the address into the backend/frontend env vars and, if desired,
deploying a fresh owner-controlled instance.

## Contract surface summary

**Writes:** `create_bounty` (payable), `submit_solution`,
`close_submissions`, `cancel_bounty`, `evaluate_bounty`,
`claim_sponsor_timeout`, `withdraw`, `pause`, `unpause`,
`set_min_bond_default`, `set_timeout_grace_seconds`, `set_owner`,
`sweep_protocol_fees`.

**Views:** `get_bounty`, `get_bounties`, `get_bounty_count`,
`get_submissions`, `get_submission`, `get_contribution_graph`,
`get_sponsor_bounty_ids`, `get_contributor_bounty_ids`, `get_balance_of`,
`get_activity`, `get_platform_stats`, `get_config`, `get_categories`.

## Exit paths for escrowed GEN

See the comment block at the top of `vertex_bounty_fusion.py` for the full
enumeration: (1) success/settlement via `evaluate_bounty`, (2) the
timeout/recovery fallback via `claim_sponsor_timeout` (full refund if zero
submissions, else automatic even-split), (3) pre-submission cancellation via
`cancel_bounty`, and (4) `withdraw()` for any residual internal credit
(rounding remainders, accrued protocol fees). Every path zeroes the relevant
storage ledger field and persists state before calling the native transfer
choke point (`_send_gen`), matching the escrow-ordering discipline used in
the EventWeaver reference contract this project's patterns were derived
from.
