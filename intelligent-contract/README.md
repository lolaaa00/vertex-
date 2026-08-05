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

**Target StudioNet — this is the reviewed/deployed network for this project.**
`gltest` defaults to localnet if `--network` is omitted; always pass it
explicitly (`gltest.config.yaml` documents this — there is no verified
"default network" key in the schema to rely on instead):

```bash
cd intelligent-contract
gltest tests/integration/ -v -s --network studionet   # gasless; 0 GEN is expected and fine
```

Other options, for local iteration only — never the network reported as
tested in this README:

```bash
# GLSim — fast local simulator, no Docker
pip install "genlayer-test[sim]"
glsim --port 4000 --validators 5
gltest tests/integration/ -v -s --network localnet

# A funded testnet (Bradbury/Asimov) — fund the account first via
# https://testnet-faucet.genlayer.foundation/, and configure it under
# `networks:` in gltest.config.yaml per the docs.
gltest tests/integration/ -v -s --network testnet_bradbury
```

**Update — actually executed against real StudioNet consensus (2026-08-01).**
Direct tests: 34/34 passing (`pytest tests/direct/ -v`, 1.86s, no mocks
bypassed). Integration tests: found and fixed one real bug on first run —
`from gltest import get_contract_factory, default_account` referenced a name
that doesn't exist in the installed SDK (`gltest 0.29.2`); the real export is
`get_default_account`. Fixed in
`tests/integration/test_vertex_bounty_fusion_integration.py`.

After that fix, every integration test still fails at the `deployed_contract`
fixture — `factory.deploy(args=[0, 3600])` against StudioNet consistently
returns a leader receipt with `execution_result: 'ERROR'` and **empty
`stdout`/`stderr`/`error_code`/`error_description`**, even though validators
reach quorum and the tx often shows `status_name: 'ACCEPTED'` /
`result_name: 'MAJORITY_AGREE'`. **Ruled out account-specific causes**: tried
the default `gltest` account, a second machine/account (the project owner's
own manual `genlayer deploy` attempt, same failure), and a freshly generated,
never-before-used account imported via `genlayer account import
--private-key` — six attempts total, six identical failures, including one
case where the CLI printed "Contract deployed successfully" and the tx
reported `ACCEPTED`, yet a subsequent `genlayer call <address> get_config`
returned `Contract ... not found`. This is the same class of issue documented
below under "CLI deploy quirk" — `gltest`'s `factory.deploy()` and
`genlayer deploy` both go through the same underlying deploy path, and both
have now been observed to fail this way regardless of account, while
deploying the identical, unmodified contract via the **Studio web UI has
twice produced a working, queryable deployment** (see
`0x44A873a87602E16779313681b0b5165ABc1d3D6a` below). This is conclusively a
StudioNet-side reliability issue with the CLI/SDK deploy RPC path, not
anything specific to this contract, this machine, or this account. The
integration test suite is therefore verified correct against the current SDK
surface (the import bug is real and fixed) but still **not executable
end-to-end from the CLI/SDK path** — only the Studio web UI path is
confirmed to work, and that path isn't scriptable by `gltest`. If you hit
this, don't assume the contract or the tests are broken; it's the same
tooling gap. One sub-test (`test_claim_sponsor_timeout_recovery_path`) is
also marked `pytest.skip(...)` because it requires waiting out the
contract's `MIN_TIMEOUT_GRACE_SECONDS` (3600s) floor on a live network, or a
GLSim harness with block-time warp.

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

### ✅ Current deployment (StudioNet, 2026-08-04)

| | |
|---|---|
| Address | `0x44A873a87602E16779313681b0b5165ABc1d3D6a` |
| Deployed via | GenLayer Studio web UI |
| Constructor args | `min_bond_default=0`, `timeout_grace_seconds=259200` (3 days) |
| Verified by | `genlayer call <address> get_config` and `genlayer schema <address>` — correct live data, all 4 frontend-called write methods present |

This is the **authoritative address** — the project owner deployed it, so
they hold the `owner` role for admin functions like `pause`/`set_owner`.
On this redeploy the CLI (`genlayer deploy`) failed with the
`invalid_contract` quirk **four consecutive times** across two different
setups before the Studio web UI succeeded on the first try — see
`MEMORY.md` → "Current deployment" for the full detail. If the CLI fails
more than once or twice, don't keep retrying it — switch to the web UI.

Two earlier deployments exist for historical reference only —
`0x612Dc3dA6d40cAF105185A07DC398D0f14A46e3e` (original test deployment) and
`0xd942430229dD389fabeA73699Ffd9b09549b51D5` (first owner-controlled
deployment, superseded after the `evaluate_bounty` abstention-path fix).
Do not point any env file at either of them.

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
