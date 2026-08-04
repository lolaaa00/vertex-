# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# Vertex — Bounty Fusion Intelligent Contract
# ============================================================================
# "Merge competing solutions instead of choosing a single winner."
#
# A bounty marketplace where ONE GenLayer Intelligent Contract evaluates ALL
# submissions to a bounty together (never picking a single winner), fetches
# real web evidence for each submission (never trusting submitter claims
# alone), reasons across every submission at once to build a Contribution
# Graph (who influenced the merged solution and in which category — e.g.
# security / UX / performance / recovery / documentation / innovation), and
# distributes native GEN rewards proportionally via basis-point allocations
# that must sum to <= 10000 bps.
#
# Structural pattern credit: this file borrows its *engineering patterns*
# (not its business logic) from a prior, separately-shipped GenLayer project,
# EventWeaver (causal-chain prediction markets) — specifically the
# `_Recipient` / `_send_gen` native-payout choke point, the
# zero-ledger-then-persist-then-transfer escrow ordering, the internal
# `balances: TreeMap[Address, u256]` withdrawable-credit pattern, the
# `gl.nondet.web.render` defensive per-source fetch, the
# `gl.eq_principle.prompt_comparative(leader, principle)` non-deterministic
# consensus pattern, and the defensive LLM-JSON parsing helpers. All bounty /
# submission / Contribution Graph business logic below is new to Vertex.
#
# ----------------------------------------------------------------------------
#  EXIT-PATH ENUMERATION — every way native GEN can leave this contract
# ----------------------------------------------------------------------------
#  1. SUCCESS / SETTLEMENT PATH — evaluate_bounty(bounty_id)
#     Sponsor (or anyone, post-timeout — see path 2) triggers evaluation.
#     The contract fetches real evidence for every submission, reasons across
#     all of them jointly under gl.eq_principle.prompt_comparative, computes
#     a Contribution Graph + per-submission influence_weight_bps, zeroes
#     bounty.reward_deposited to 0 and persists state, THEN pays each
#     contributor their reward_owed via _send_gen. Bounty -> SETTLED.
#
#  2. TIMEOUT / RECOVERY PATH — claim_sponsor_timeout(bounty_id)
#     If submissions closed but the sponsor never triggers evaluation before
#     deadline + TIMEOUT_GRACE_SECONDS, ANY address may call this. If zero
#     submissions exist, the full reward_deposited is zeroed then refunded to
#     the sponsor. If submissions exist, an automatic even-split evaluation
#     runs (equal influence_weight_bps across all submissions) and pays out
#     exactly like the success path. Bounty -> TIMED_OUT_RECOVERED.
#
#  3. CANCELLATION PATH — cancel_bounty(bounty_id)
#     Sponsor (or owner) may cancel ONLY while zero submissions exist.
#     reward_deposited is zeroed then refunded in full to the sponsor.
#     Bounty -> CANCELLED.
#
#  4. WITHDRAWAL PATH — withdraw()
#     Every payout above credits an internal `balances[address]` ledger
#     rather than transferring immediately in some code paths (accrued
#     protocol fees, rounding remainders). withdraw() zeroes the caller's
#     internal credit then emits the real transfer. This is the only path
#     that touches accrued_protocol_fees.
#
#  No other function in this contract ever calls `_send_gen` or
#  `_credit_balance` with contract-held funds. Every path above zeroes the
#  relevant ledger field(s) in storage and persists BEFORE the transfer call,
#  matching the EventWeaver escrow-ordering discipline, to prevent
#  reentrancy / double-spend.
# ----------------------------------------------------------------------------

import datetime
import json
import typing
from dataclasses import dataclass

from genlayer import *


# ============================================================================
#  Constants — statuses, categories, limits
# ============================================================================

# Bounty lifecycle statuses. Stored as small ints for cheap storage;
# translated to strings at the view boundary (see STATUS_NAMES).
STATUS_OPEN_FOR_SUBMISSIONS: int = 0
STATUS_EVALUATING: int = 1
STATUS_SETTLED: int = 2
STATUS_CANCELLED: int = 3
STATUS_TIMED_OUT_RECOVERED: int = 4

STATUS_NAMES: dict[int, str] = {
    STATUS_OPEN_FOR_SUBMISSIONS: "OPEN_FOR_SUBMISSIONS",
    STATUS_EVALUATING: "EVALUATING",
    STATUS_SETTLED: "SETTLED",
    STATUS_CANCELLED: "CANCELLED",
    STATUS_TIMED_OUT_RECOVERED: "TIMED_OUT_RECOVERED",
}

# Sub-state guarding evaluate_bounty against re-entrant / duplicate calls.
# A bounty is "EVALUATING" the instant close_submissions() runs, but we also
# track whether an evaluation PASS is currently mid-flight so a second call
# arriving before the first one finishes (e.g. retried transaction) cannot
# double-settle. GenVM executes contract calls to completion one at a time,
# but this flag is cheap insurance and documents intent explicitly.
EVAL_LOCK_IDLE: int = 0
EVAL_LOCK_RUNNING: int = 1
EVAL_LOCK_DONE: int = 2

# Hard limits — sanity rails, generous enough not to constrain real use.
MAX_TITLE_LEN: int = 200
MAX_DESCRIPTION_LEN: int = 3000
MAX_CATEGORY_LEN: int = 40
MAX_CRITERIA_LEN: int = 400
MAX_URL_LEN: int = 500
MAX_SUMMARY_LEN: int = 1200
MAX_SUBMISSIONS_PER_BOUNTY: int = 40
MAX_EVIDENCE_EXCERPT: int = 1500   # chars of rendered page fed to the LLM per submission
MAX_REASONING_STORED: int = 6000  # chars of Contribution Graph JSON persisted per bounty
MAX_CATEGORY_TAG_LEN: int = 40

BPS_DENOMINATOR: int = 10000
# Comparative-equivalence tolerance band for the Contribution Graph — two
# validator results are treated as equivalent if every contributor's bps
# allocation is within this many bps of the leader's. Mirrors the
# EventWeaver confidence-band tolerance idea applied to reward splits.
ALLOCATION_TOLERANCE_BPS: int = 500

# Grace period after a bounty's submission deadline before ANYONE may
# trigger the timeout/recovery fallback if the sponsor never evaluates.
DEFAULT_TIMEOUT_GRACE_SECONDS: int = 7 * 24 * 60 * 60  # 7 days
MIN_TIMEOUT_GRACE_SECONDS: int = 60 * 60               # 1 hour floor (tests / demos)
MAX_TIMEOUT_GRACE_SECONDS: int = 90 * 24 * 60 * 60      # 90 days ceiling

DEFAULT_CATEGORIES: list[str] = [
    "security",
    "ux",
    "performance",
    "recovery",
    "documentation",
]

# Error prefixes — deterministic, machine-parseable failure classes.
ERR_EXPECTED = "EXPECTED: "     # caller mistake (bad input, wrong state)
ERR_EXTERNAL = "EXTERNAL: "     # upstream/web failure
ERR_TRANSIENT = "TRANSIENT: "   # retryable condition
ERR_LLM = "LLM_ERROR: "         # model output unusable after sanitation


# ============================================================================
#  Storage dataclasses
# ============================================================================

@allow_storage
@dataclass
class Bounty:
    """A single bounty: funded task, evaluation criteria, and lifecycle."""
    id: u64
    sponsor: Address
    title: str
    description: str
    category: str
    reward_pool: u256              # agreed/advertised reward amount
    reward_deposited: u256         # actual escrowed GEN balance (separate ledger)
    status: u8
    created_ts: u64
    submission_deadline_ts: u64
    evaluation_criteria: str       # comma-separated categories, e.g. "security,ux,performance,recovery,documentation"
    min_bond: u256                 # anti-spam: reserved for future per-submission bonding
    settlement_ts: u64
    contribution_graph_json: str   # persisted reasoning trace / result summary (truncated)
    eval_lock: u8                  # EVAL_LOCK_IDLE / RUNNING / DONE — double-evaluation guard
    submission_count: u32


@allow_storage
@dataclass
class Submission:
    """One contributor's entry to a bounty."""
    id: u32
    bounty_id: u64
    contributor: Address
    evidence_url: str              # real web-fetchable evidence (repo / demo)
    summary: str                   # submitter's own pitch (capped, never trusted alone)
    submitted_ts: u64
    extracted_category: str        # dominant category the LLM attributed this submission to; "" until evaluated
    influence_weight_bps: u32      # 0..10000 share of the reward pool; 0 until evaluated
    reward_owed: u256              # computed payout; 0 until evaluated
    paid: bool                     # true once _send_gen has fired for this submission


@allow_storage
@dataclass
class BountyActivity:
    """Append-only activity log entry for a bounty (lifecycle / audit trail)."""
    kind: str          # "CREATE" | "SUBMIT" | "CLOSE" | "EVALUATE" | "SETTLE" | "CANCEL" | "TIMEOUT"
    actor: Address
    amount: u256
    ts: u64
    note: str


# ============================================================================
#  Pure helpers (deterministic — safe anywhere)
# ============================================================================

def _require(cond: bool, message: str) -> None:
    """Deterministic guard that raises a user-facing EXPECTED error."""
    if not cond:
        raise gl.vm.UserError(ERR_EXPECTED + message)


def _clamp_int(value: int, low: int, high: int) -> int:
    """Clamp an int into [low, high]."""
    if value < low:
        return low
    if value > high:
        return high
    return value


def _truncate(text: str, limit: int) -> str:
    """Trim text to a storage-safe length without exploding mid-codepoint."""
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def _normalize_url(url: str) -> str:
    """Light URL validation/normalization. Rejects obviously invalid input."""
    u = url.strip()
    _require(0 < len(u) <= MAX_URL_LEN, f"evidence URL must be 1..{MAX_URL_LEN} chars")
    _require(
        u.startswith("https://") or u.startswith("http://"),
        f"evidence URL must start with http(s):// — got '{u[:40]}'",
    )
    return u


def _normalize_criteria(criteria: str) -> list[str]:
    """Parse a comma-separated evaluation-criteria string into a clean,
    de-duplicated, lower-cased list of category tags."""
    _require(0 < len(criteria.strip()) <= MAX_CRITERIA_LEN, "evaluation_criteria required")
    raw_parts = [p.strip().lower() for p in criteria.split(",")]
    parts = [p for p in raw_parts if p]
    _require(len(parts) > 0, "evaluation_criteria must contain at least one category")
    seen: list[str] = []
    for p in parts:
        _require(len(p) <= MAX_CATEGORY_TAG_LEN, f"category tag too long: '{p}'")
        if p not in seen:
            seen.append(p)
    return seen


def _first_present(payload: dict, keys: list[str]) -> typing.Any:
    """Return the first present key from a list of aliases, else None."""
    for key in keys:
        if key in payload:
            return payload[key]
    return None


def _sanitize_json_text(text: str) -> str:
    """Strip markdown fences and leading chatter around a JSON object/array."""
    stripped = text.strip()
    if stripped.startswith("```"):
        first_newline = stripped.find("\n")
        if first_newline != -1:
            stripped = stripped[first_newline + 1 :]
        if stripped.rstrip().endswith("```"):
            stripped = stripped.rstrip()[:-3]
    # fall back to the outermost object braces if there is chatter around it
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end != -1 and end > start:
        stripped = stripped[start : end + 1]
    return stripped.strip()


def _coerce_bps(raw: typing.Any) -> int:
    """Coerce arbitrary LLM allocation output into an int 0..10000 bps.
    Accepts ints, floats, percentage strings ("30%"), and fractions (0.3)."""
    try:
        if isinstance(raw, bool):
            value = 0.0
        elif isinstance(raw, (int, float)):
            value = float(raw)
        elif isinstance(raw, str):
            cleaned = raw.strip().rstrip("%").strip()
            value = float(cleaned)
        else:
            value = 0.0
    except (ValueError, TypeError):
        value = 0.0
    if 0.0 < value <= 1.0:
        value *= 10000.0
    elif 1.0 < value <= 100.0:
        # Ambiguous band: LLM may report either "30" meaning 30% or already
        # bps-scale. Treat anything <=100 as a percentage — bps values from
        # a well-behaved prompt are expected to be >100 for any nontrivial
        # allocation, and the tolerance-band comparative principle absorbs
        # any resulting rounding drift.
        value *= 100.0
    value = max(0.0, min(float(BPS_DENOMINATOR), value))
    return int(round(value))


def _parse_contribution_graph_payload(raw: typing.Any, submission_ids: list[int]) -> dict:
    """Normalize an LLM Contribution Graph verdict into a canonical dict:
    {
      "allocations": {submission_id_str: bps_int, ...},
      "categories": {submission_id_str: category_str, ...},
      "complementary_notes": str,
      "reasoning": str,
    }

    Tolerant of alias keys and stringly-typed values. Any submission id
    missing from the model's allocation map defaults to 0 bps rather than
    raising — an incomplete verdict degrades gracefully instead of
    aborting settlement.
    """
    payload: typing.Any = raw
    if isinstance(payload, str):
        try:
            payload = json.loads(_sanitize_json_text(payload))
        except (json.JSONDecodeError, ValueError):
            raise gl.vm.UserError(ERR_LLM + "contribution graph verdict was not parseable JSON")
    if not isinstance(payload, dict):
        raise gl.vm.UserError(ERR_LLM + "contribution graph verdict JSON was not an object")

    alloc_raw = _first_present(
        payload, ["allocations", "allocation", "rewards", "bps_allocations", "distribution"]
    )
    allocations: dict[str, int] = {}
    if isinstance(alloc_raw, dict):
        for k, v in alloc_raw.items():
            allocations[str(k)] = _coerce_bps(v)
    elif isinstance(alloc_raw, list):
        # tolerate [{"submission_id": .., "bps": ..}, ...] shape
        for item in alloc_raw:
            if isinstance(item, dict):
                sid = _first_present(item, ["submission_id", "id", "sid"])
                bps = _first_present(item, ["bps", "allocation_bps", "weight", "percent", "pct"])
                if sid is not None:
                    allocations[str(sid)] = _coerce_bps(bps)

    # Ensure every known submission id has an entry (default 0).
    for sid in submission_ids:
        allocations.setdefault(str(sid), 0)

    cat_raw = _first_present(payload, ["categories", "extracted_categories", "category_map", "top_category"])
    categories: dict[str, str] = {}
    if isinstance(cat_raw, dict):
        for k, v in cat_raw.items():
            categories[str(k)] = _truncate(str(v).strip().lower(), MAX_CATEGORY_TAG_LEN)

    notes_raw = _first_present(
        payload, ["complementary_notes", "complementary", "synergies", "notes"]
    )
    complementary_notes = str(notes_raw) if notes_raw is not None else ""

    reasoning_raw = _first_present(payload, ["reasoning", "rationale", "explanation", "analysis"])
    reasoning = str(reasoning_raw) if reasoning_raw is not None else ""

    return {
        "allocations": allocations,
        "categories": categories,
        "complementary_notes": complementary_notes,
        "reasoning": reasoning,
    }


def _normalize_allocations(allocations: dict[str, int], submission_ids: list[int]) -> dict[str, int]:
    """Clamp each allocation into [0, 10000], cap the sum at 10000 bps, and
    deterministically route any rounding remainder/shortfall so totals are
    exact. Redistribution order is by ascending submission id, so every
    validator computes an identical result regardless of dict iteration
    order returned by the LLM."""
    ordered_ids = sorted(submission_ids)
    cleaned: dict[str, int] = {}
    total = 0
    for sid in ordered_ids:
        key = str(sid)
        val = _clamp_int(int(allocations.get(key, 0)), 0, BPS_DENOMINATOR)
        cleaned[key] = val
        total += val

    if total > BPS_DENOMINATOR:
        # Scale down proportionally, then fix residual rounding by trimming
        # from the largest allocations first (deterministic: ties broken by
        # ascending submission id, already our iteration order).
        overflow = total - BPS_DENOMINATOR
        # Trim from the end (highest ids) first is arbitrary but
        # deterministic; instead trim proportionally to each share size for
        # fairness, largest first.
        order_by_size = sorted(ordered_ids, key=lambda sid: cleaned[str(sid)], reverse=True)
        idx = 0
        while overflow > 0 and order_by_size:
            key = str(order_by_size[idx % len(order_by_size)])
            if cleaned[key] > 0:
                cleaned[key] -= 1
                overflow -= 1
            idx += 1
            if idx > BPS_DENOMINATOR * 2:
                break  # safety valve, should never trigger
        total = BPS_DENOMINATOR
    elif total < BPS_DENOMINATOR and ordered_ids:
        # Route the unallocated remainder deterministically to the last
        # (highest-id) submission — matches "rounding-safe last recipient"
        # per the spec, rather than leaving GEN un-distributed.
        remainder = BPS_DENOMINATOR - total
        last_key = str(ordered_ids[-1])
        cleaned[last_key] = min(BPS_DENOMINATOR, cleaned[last_key] + remainder)

    return cleaned


# ============================================================================
#  Native transfer target — payouts go to wallets (EOAs), not other
#  Intelligent Contracts. The EOA/EVM path requires this contract-interface
#  stub; gl.get_contract_at(...).emit_transfer(...) is the IC-to-IC path and
#  would not settle a real balance for an externally-owned account.
# ============================================================================

@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


def _send_gen(to_address: Address, amount: int) -> None:
    """Single emission choke point for every native-token payout. Zero the
    ledger field and persist state BEFORE calling this — never after —
    so a reentrant call always finds the balance already zeroed."""
    if amount <= 0:
        return
    _Recipient(to_address).emit_transfer(value=u256(int(amount)))


# ============================================================================
#  The Contract
# ============================================================================

class VertexBountyFusion(gl.Contract):
    """A bounty marketplace where every submission is evaluated together and
    rewarded proportionally via an LLM-built Contribution Graph, with real
    native GEN escrow and payout."""

    # ---- ownership / config -------------------------------------------------
    owner: Address
    paused: bool
    min_bond_default: u256
    timeout_grace_seconds: u64
    accrued_protocol_fees: u256

    # ---- bounty storage -------------------------------------------------
    bounty_count: u64
    bounties: TreeMap[u32, Bounty]
    bounty_submissions: TreeMap[u32, DynArray[Submission]]

    # per-sponsor list of bounty ids they created
    sponsor_bounties: TreeMap[Address, DynArray[u64]]
    # per-contributor list of (bounty_id) they submitted to — for quick lookup
    contributor_bounties: TreeMap[Address, DynArray[u64]]
    # per-bounty activity log
    activity: TreeMap[u32, DynArray[BountyActivity]]

    # internal withdrawable native balances (rounding remainders, accrued
    # protocol fees, or any credit path); withdraw() turns credits into real
    # transfers. Direct bounty settlement pays contributors immediately via
    # _send_gen rather than crediting this ledger, per the locked "pay in
    # the same call" decision — this ledger exists for the residual cases.
    balances: TreeMap[Address, u256]

    # ---- platform metrics -----------------------------------------------
    total_volume: u256
    total_bounties_settled: u64
    total_payouts: u256

    # ------------------------------------------------------------------------
    #  Construction
    # ------------------------------------------------------------------------

    def __init__(
        self,
        min_bond_default: int = 0,
        timeout_grace_seconds: int = DEFAULT_TIMEOUT_GRACE_SECONDS,
    ):
        """Deploy the platform.

        Args:
            min_bond_default: default anti-spam bond (native units) applied
                to bounties that don't override it. 0 disables.
            timeout_grace_seconds: seconds past a bounty's submission
                deadline before anyone may trigger claim_sponsor_timeout().
        """
        self.owner = gl.message.sender_address
        self.paused = False
        self.min_bond_default = u256(max(0, min_bond_default))
        self.timeout_grace_seconds = u64(
            _clamp_int(int(timeout_grace_seconds), MIN_TIMEOUT_GRACE_SECONDS, MAX_TIMEOUT_GRACE_SECONDS)
        )
        self.accrued_protocol_fees = u256(0)
        self.bounty_count = u64(0)
        self.total_volume = u256(0)
        self.total_bounties_settled = u64(0)
        self.total_payouts = u256(0)

    # ------------------------------------------------------------------------
    #  Internal utilities
    # ------------------------------------------------------------------------

    def _not_paused(self) -> None:
        if self.paused:
            raise gl.vm.UserError(ERR_EXPECTED + "platform is paused")

    def _only_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(ERR_EXPECTED + "only the owner may call this")

    def _now_ts(self) -> int:
        """Authenticated, consensus-agreed clock. GenVM patches
        datetime.now() to the network's block time, which every validator
        computes identically — it is never read from caller-supplied
        arguments or calldata, so it cannot be spoofed by a transaction
        sender to fabricate a future or past time."""
        return int(datetime.datetime.now(datetime.timezone.utc).timestamp())

    def _get_bounty(self, bounty_id: int) -> Bounty:
        bid = u32(bounty_id)
        bounty = self.bounties.get(bid)
        if bounty is None:
            raise gl.vm.UserError(ERR_EXPECTED + f"bounty {bounty_id} does not exist")
        return bounty

    def _get_submissions(self, bounty_id: int) -> list:
        arr = self.bounty_submissions.get(u32(bounty_id))
        return list(arr) if arr is not None else []

    def _only_sponsor_or_owner(self, bounty: Bounty) -> None:
        sender = gl.message.sender_address
        _require(
            sender == bounty.sponsor or sender == self.owner,
            "only the bounty sponsor or the platform owner may call this",
        )

    def _credit_balance(self, addr: Address, amount: int) -> None:
        """Credit an internal withdrawable balance (value stays in-contract
        until withdraw() emits the real native transfer)."""
        if amount <= 0:
            return
        current = self.balances.get(addr)
        base = int(current) if current is not None else 0
        self.balances[addr] = u256(base + int(amount))

    def _log(self, bounty_id: int, kind: str, actor: Address, amount: int, ts: int, note: str) -> None:
        """Append to the bounty's activity log."""
        bid = u32(bounty_id)
        if self.activity.get(bid) is None:
            self.activity[bid] = []
        self.activity[bid].append(
            BountyActivity(
                kind=kind,
                actor=actor,
                amount=u256(max(0, amount)),
                ts=u64(max(0, ts)),
                note=_truncate(note, 200),
            )
        )

    def _record_sponsor_bounty(self, addr: Address, bounty_id: int) -> None:
        if self.sponsor_bounties.get(addr) is None:
            self.sponsor_bounties[addr] = []
        self.sponsor_bounties[addr].append(u64(bounty_id))

    def _record_contributor_bounty(self, addr: Address, bounty_id: int) -> None:
        if self.contributor_bounties.get(addr) is None:
            self.contributor_bounties[addr] = []
        arr = self.contributor_bounties[addr]
        bid = u64(bounty_id)
        for existing in arr:
            if existing == bid:
                return
        arr.append(bid)

    def _send_native(self, recipient: Address, amount: int) -> None:
        """Emit an actual native-token transfer from this contract to
        `recipient` (a wallet/EOA). Delegates to the module-level
        `_send_gen` choke point — callers must zero and persist the ledger
        field(s) BEFORE invoking this."""
        _send_gen(recipient, amount)

    # ------------------------------------------------------------------------
    #  Serialization for views (schema-safe primitives only)
    # ------------------------------------------------------------------------

    def _submission_dict(self, sub: Submission) -> dict:
        return {
            "id": int(sub.id),
            "bounty_id": int(sub.bounty_id),
            "contributor": sub.contributor.as_hex,
            "evidence_url": sub.evidence_url,
            "summary": sub.summary,
            "submitted_ts": int(sub.submitted_ts),
            "extracted_category": sub.extracted_category,
            "influence_weight_bps": int(sub.influence_weight_bps),
            "reward_owed": int(sub.reward_owed),
            "paid": bool(sub.paid),
        }

    def _bounty_dict(self, bounty: Bounty) -> dict:
        return {
            "id": int(bounty.id),
            "sponsor": bounty.sponsor.as_hex,
            "title": bounty.title,
            "description": bounty.description,
            "category": bounty.category,
            "reward_pool": int(bounty.reward_pool),
            "reward_deposited": int(bounty.reward_deposited),
            "status": STATUS_NAMES.get(int(bounty.status), "OPEN_FOR_SUBMISSIONS"),
            "created_ts": int(bounty.created_ts),
            "submission_deadline_ts": int(bounty.submission_deadline_ts),
            "evaluation_criteria": bounty.evaluation_criteria,
            "min_bond": int(bounty.min_bond),
            "settlement_ts": int(bounty.settlement_ts),
            "submission_count": int(bounty.submission_count),
        }

    # ========================================================================
    #  PUBLIC WRITES — bounty lifecycle
    # ========================================================================

    @gl.public.write.payable
    def create_bounty(
        self,
        title: str,
        description: str,
        category: str,
        evaluation_criteria: str,
        submission_deadline_ts: int,
        min_bond: int = 0,
    ) -> int:
        """Create and fund a bounty. Attach native GEN via message value —
        this becomes both `reward_pool` (the agreed amount) and
        `reward_deposited` (the actual escrow ledger).

        Args:
            title / description / category: bounty metadata.
            evaluation_criteria: comma-separated categories the sponsor cares
                about, e.g. "security,ux,performance,recovery,documentation".
                Not hardcoded — sponsors may define their own category set.
            submission_deadline_ts: unix time after which new submissions are
                rejected (sponsor may still close early).
            min_bond: reserved anti-spam knob for future per-submission
                bonding; defaults to the platform default when 0.

        Returns: the new bounty id.
        """
        self._not_paused()
        sender = gl.message.sender_address
        deposited = int(gl.message.value)
        now_ts = self._now_ts()

        _require(deposited > 0, "must fund the bounty with a positive GEN amount")
        _require(0 < len(title.strip()) <= MAX_TITLE_LEN, f"title must be 1..{MAX_TITLE_LEN} chars")
        _require(len(description) <= MAX_DESCRIPTION_LEN, f"description exceeds {MAX_DESCRIPTION_LEN} chars")
        _require(0 < len(category.strip()) <= MAX_CATEGORY_LEN, "category required")
        _require(submission_deadline_ts > now_ts, "submission_deadline_ts must be in the future")
        criteria_list = _normalize_criteria(evaluation_criteria)

        bond = int(min_bond) if int(min_bond) > 0 else int(self.min_bond_default)
        _require(bond >= 0, "min_bond must be non-negative")

        bounty_id = int(self.bounty_count)
        self.bounty_count = u64(bounty_id + 1)
        bid = u32(bounty_id)

        self.bounties[bid] = Bounty(
            id=u64(bounty_id),
            sponsor=sender,
            title=title.strip(),
            description=description.strip(),
            category=category.strip(),
            reward_pool=u256(deposited),
            reward_deposited=u256(deposited),
            status=u8(STATUS_OPEN_FOR_SUBMISSIONS),
            created_ts=u64(now_ts),
            submission_deadline_ts=u64(submission_deadline_ts),
            evaluation_criteria=",".join(criteria_list),
            min_bond=u256(bond),
            settlement_ts=u64(0),
            contribution_graph_json="",
            eval_lock=u8(EVAL_LOCK_IDLE),
            submission_count=u32(0),
        )
        self.bounty_submissions[bid] = []

        self._record_sponsor_bounty(sender, bounty_id)
        self.total_volume = u256(int(self.total_volume) + deposited)
        self._log(bounty_id, "CREATE", sender, deposited, now_ts, title.strip()[:100])
        return bounty_id

    @gl.public.write
    def submit_solution(self, bounty_id: int, evidence_url: str, summary: str) -> int:
        """Submit a solution to an open bounty. No payment required from the
        contributor. `evidence_url` must be a real http(s) link (GitHub repo,
        deployed demo, etc.) — the contract fetches this at evaluation time
        rather than trusting `summary` alone.

        Returns: the new submission id (scoped to this bounty).
        """
        self._not_paused()
        now_ts = self._now_ts()
        bounty = self._get_bounty(bounty_id)
        _require(
            int(bounty.status) == STATUS_OPEN_FOR_SUBMISSIONS,
            "bounty is not open for submissions",
        )
        _require(now_ts <= int(bounty.submission_deadline_ts), "submission deadline has passed")

        url = _normalize_url(evidence_url)
        clean_summary = _truncate(summary.strip(), MAX_SUMMARY_LEN)
        _require(len(clean_summary) > 0, "summary must not be empty")

        existing = self._get_submissions(bounty_id)
        _require(len(existing) < MAX_SUBMISSIONS_PER_BOUNTY, "bounty has reached its submission cap")

        sender = gl.message.sender_address
        sub_id = len(existing)
        bid = u32(bounty_id)
        self.bounty_submissions[bid].append(
            Submission(
                id=u32(sub_id),
                bounty_id=u64(bounty_id),
                contributor=sender,
                evidence_url=url,
                summary=clean_summary,
                submitted_ts=u64(now_ts),
                extracted_category="",
                influence_weight_bps=u32(0),
                reward_owed=u256(0),
                paid=False,
            )
        )
        bounty.submission_count = u32(int(bounty.submission_count) + 1)
        self._record_contributor_bounty(sender, bounty_id)
        self._log(bounty_id, "SUBMIT", sender, 0, now_ts, url[:100])
        return sub_id

    @gl.public.write
    def close_submissions(self, bounty_id: int) -> None:
        """Move a bounty from OPEN_FOR_SUBMISSIONS to EVALUATING. Callable by
        the sponsor (or owner) at any time — an explicit human action that
        triggers the non-deterministic evaluation phase — OR by anyone once
        the submission deadline has passed."""
        self._not_paused()
        now_ts = self._now_ts()
        bounty = self._get_bounty(bounty_id)
        _require(
            int(bounty.status) == STATUS_OPEN_FOR_SUBMISSIONS,
            "bounty is not open for submissions",
        )
        deadline_passed = now_ts > int(bounty.submission_deadline_ts)
        if not deadline_passed:
            self._only_sponsor_or_owner(bounty)
        bounty.status = u8(STATUS_EVALUATING)
        self._log(bounty_id, "CLOSE", gl.message.sender_address, 0, now_ts, "")

    @gl.public.write
    def cancel_bounty(self, bounty_id: int) -> None:
        """Sponsor (or owner) cancels a bounty BEFORE any submissions exist,
        refunding the full escrow. Zero-then-transfer ordering."""
        now_ts = self._now_ts()
        bounty = self._get_bounty(bounty_id)
        self._only_sponsor_or_owner(bounty)
        _require(
            int(bounty.status) == STATUS_OPEN_FOR_SUBMISSIONS,
            "only an open bounty can be cancelled",
        )
        _require(int(bounty.submission_count) == 0, "cannot cancel once submissions exist")

        refund = int(bounty.reward_deposited)
        bounty.reward_deposited = u256(0)
        bounty.status = u8(STATUS_CANCELLED)
        bounty.settlement_ts = u64(now_ts)
        bounty.contribution_graph_json = "Cancelled before any submissions were received; full refund issued."
        self._log(bounty_id, "CANCEL", gl.message.sender_address, refund, now_ts, "")
        # zero + persist happened above; transfer happens last
        self._send_native(bounty.sponsor, refund)

    # ========================================================================
    #  PUBLIC WRITES — non-deterministic evaluation core
    # ========================================================================

    def _fetch_submission_evidence(self, submissions: list) -> list[dict]:
        """Fetch each submission's evidence URL defensively inside the
        nondet block. Runs INSIDE a leader/validator function — never call
        from deterministic code. A dead or slow source degrades to an error
        record instead of aborting the whole evaluation."""
        evidence: list[dict] = []
        for sub in submissions:
            try:
                text = gl.nondet.web.render(str(sub.evidence_url), mode="text")
                excerpt = str(text)[:MAX_EVIDENCE_EXCERPT]
                evidence.append({"id": int(sub.id), "url": str(sub.evidence_url), "ok": True, "excerpt": excerpt})
            except Exception as exc:  # noqa: BLE001 — degrade per-source, never abort
                evidence.append(
                    {
                        "id": int(sub.id),
                        "url": str(sub.evidence_url),
                        "ok": False,
                        "excerpt": f"[fetch failed: {str(exc)[:150]}]",
                    }
                )
        return evidence

    def _build_contribution_graph_prompt(
        self,
        bounty_title: str,
        bounty_description: str,
        criteria: list[str],
        submissions: list,
        evidence: list[dict],
    ) -> str:
        """Compose the joint reasoning prompt that asks the LLM to reason
        ACROSS ALL submissions together — never one-in-isolation — and
        produce a Contribution Graph: strongest submission per criterion,
        complementary relationships, and a percentage allocation across
        contributors summing to 100%."""
        evidence_by_id = {item["id"]: item for item in evidence}
        blocks = []
        for sub in submissions:
            item = evidence_by_id.get(int(sub.id), {"ok": False, "excerpt": "(no evidence fetched)"})
            status = "OK" if item.get("ok") else "FETCH_FAILED"
            blocks.append(
                f"--- SUBMISSION #{int(sub.id)} by {sub.contributor.as_hex} "
                f"(evidence {status}: {sub.evidence_url})\n"
                f"Submitter summary: {sub.summary}\n"
                f"Fetched evidence excerpt:\n{item.get('excerpt', '')}"
            )
        submissions_text = "\n\n".join(blocks) if blocks else "(no submissions)"
        criteria_text = ", ".join(criteria)
        submission_ids = ", ".join(str(int(s.id)) for s in submissions)

        return f"""You are a neutral technical judge evaluating ALL submissions to a single \
bounty together, as one merged solution — you are NOT picking one winner.

BOUNTY: "{bounty_title}"
DESCRIPTION: {bounty_description}
EVALUATION CRITERIA (categories the sponsor cares about): {criteria_text}

You will be shown every submission's own pitch AND real evidence fetched \
from each submission's public URL. Weigh the fetched evidence more heavily \
than the submitter's own claims — submitters may oversell their work.

For EACH criterion, decide which submission(s) contribute the strongest \
work. Then reason about how the submissions COMPLEMENT each other (e.g. one \
has the strongest security, another the best UX) as if they were being \
merged into one final solution. Finally compute a reward allocation across \
ALL submission ids ({submission_ids}) expressed in basis points (bps, out \
of 10000 total) reflecting each contributor's influence on the merged \
solution. The allocations must sum to 10000 (or less, if you intentionally \
withhold some as unallocated — but prefer summing to 10000).

SUBMISSIONS:
{submissions_text}

Respond with ONLY a JSON object, no markdown, with exactly these keys:
{{
  "allocations": {{"<submission_id>": <bps_integer_0_to_10000>, ...}} for \
EVERY submission id listed above,
  "categories": {{"<submission_id>": "<single strongest category from the \
evaluation criteria for that submission>", ...}},
  "complementary_notes": "one short paragraph on how the submissions \
complement each other",
  "reasoning": "one short paragraph explaining the overall allocation \
rationale"
}}

Rules:
- Base "strongest category" judgments on the fetched evidence, not just the \
submitter's summary.
- If a submission's evidence fetch failed, allocate it a low but non-zero \
weight only if the summary is independently credible; otherwise allocate 0.
- Keep reasoning and complementary_notes each under 150 words.
- Allocations must be non-negative integers summing to at most 10000."""

    def _evaluate_contribution_graph_nondet(
        self,
        bounty: Bounty,
        submissions: list,
        criteria: list[str],
    ) -> dict:
        """Run the full web-fetch + LLM joint-reasoning pass under a
        comparative equivalence principle.

        The principle is deliberately outcome-focused and tolerant: the
        leader's result stands as long as validators agree, PER CONTRIBUTOR,
        on the bps allocation within ALLOCATION_TOLERANCE_BPS, and on the
        same top category per contributor — regardless of exact wording,
        JSON key order, or minor percentage rounding. This mirrors the
        EventWeaver step-verdict comparative pattern and is what prevents
        leader-rotation / Undetermined status on inherently fuzzy,
        cross-submission qualitative reasoning.
        """
        submission_ids = [int(s.id) for s in submissions]

        def leader() -> str:
            evidence = self._fetch_submission_evidence(submissions)
            # Abstention path: a failed fetch is never treated as "the
            # evidence is absent, allocate accordingly" — if EVERY source
            # was unreachable there is nothing to judge submissions on, so
            # abstain rather than let the model force a verdict on no real
            # evidence. Raising here fails the whole evaluate_bounty
            # transaction atomically (GenVM write transactions are all-or-
            # nothing) — bounty.status stays EVALUATING, eval_lock is never
            # persisted as RUNNING, nothing settles, and the sponsor can
            # simply call evaluate_bounty again once sources are reachable.
            if submissions and all(not item.get("ok") for item in evidence):
                raise gl.vm.UserError(
                    ERR_TRANSIENT
                    + "every submission's evidence source was unreachable — abstaining rather than "
                    + "settling on no real evidence; retry evaluate_bounty once sources are reachable"
                )
            prompt = self._build_contribution_graph_prompt(
                bounty.title, bounty.description, criteria, submissions, evidence
            )
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _parse_contribution_graph_payload(raw, submission_ids)
            normalized_allocations = _normalize_allocations(parsed["allocations"], submission_ids)
            # Canonical sorted-key JSON — comparative equivalence then
            # compares MEANING (per-contributor bps within tolerance, same
            # top category), never exact bytes.
            return json.dumps(
                {
                    "allocations": {k: normalized_allocations[k] for k in sorted(normalized_allocations)},
                    "categories": {k: parsed["categories"].get(k, "") for k in sorted(parsed["categories"])},
                    "complementary_notes": _truncate(parsed["complementary_notes"], 1000),
                    "reasoning": _truncate(parsed["reasoning"], 1500),
                },
                sort_keys=True,
            )

        principle = (
            "Both results are JSON Contribution Graph verdicts distributing a "
            "reward pool across the SAME set of submission ids for one bounty. "
            "Treat them as equivalent if, for EVERY submission id, the "
            f"'allocations' bps value differs by no more than {ALLOCATION_TOLERANCE_BPS} "
            "basis points, AND the 'categories' entry for that submission id names "
            "the same or a clearly synonymous strongest category (e.g. 'ux' and "
            "'user experience' are the same). Differences in 'reasoning' or "
            "'complementary_notes' wording, formatting, key order, or minor "
            "percentage rounding within the tolerance band are NOT grounds for "
            "disagreement — validators must not require exact-byte or exact-wording "
            "matches, only agreement on the substantive allocation and category "
            "conclusions."
        )

        raw_result = gl.eq_principle.prompt_comparative(leader, principle)
        parsed = _parse_contribution_graph_payload(raw_result, submission_ids)
        parsed["allocations"] = _normalize_allocations(parsed["allocations"], submission_ids)
        return parsed

    def _apply_contribution_graph(
        self, bounty: Bounty, submissions: list, graph: dict, now_ts: int
    ) -> None:
        """Fold a Contribution Graph verdict into submission state and pay
        out. Zero-then-transfer ordering: reward_deposited is zeroed and
        persisted BEFORE any _send_gen call below."""
        allocations = graph["allocations"]
        categories = graph["categories"]
        pool = int(bounty.reward_deposited)

        # zero the ledger + persist BEFORE any transfer
        bounty.reward_deposited = u256(0)

        payouts: list[tuple[Address, int]] = []
        for sub in submissions:
            key = str(int(sub.id))
            bps = int(allocations.get(key, 0))
            owed = (pool * bps) // BPS_DENOMINATOR
            sub.influence_weight_bps = u32(bps)
            sub.reward_owed = u256(owed)
            sub.extracted_category = _truncate(categories.get(key, ""), MAX_CATEGORY_TAG_LEN)
            if owed > 0:
                payouts.append((sub.contributor, owed))

        summary = {
            "bounty_id": int(bounty.id),
            "reward_pool_distributed": pool,
            "allocations_bps": allocations,
            "categories": categories,
            "complementary_notes": graph.get("complementary_notes", ""),
            "reasoning": graph.get("reasoning", ""),
        }
        bounty.contribution_graph_json = _truncate(json.dumps(summary, sort_keys=True), MAX_REASONING_STORED)
        bounty.settlement_ts = u64(now_ts)

        # transfers happen last, after every ledger field above is zeroed
        # and the mutated dataclasses are the live storage objects
        for recipient, amount in payouts:
            self._send_native(recipient, amount)
        for sub in submissions:
            if int(sub.reward_owed) > 0:
                sub.paid = True

        self.total_payouts = u256(int(self.total_payouts) + pool)

    @gl.public.write
    def evaluate_bounty(self, bounty_id: int) -> dict:
        """The core non-deterministic function: fetch real evidence for
        every submission, reason across ALL of them jointly to build the
        Contribution Graph, compute proportional GEN payouts, and settle.

        Guards against double-evaluation/double-payout by re-deriving
        status from storage on every call — a bounty already EVALUATING (a
        prior pass never got here) can be evaluated once; SETTLED,
        CANCELLED, or TIMED_OUT_RECOVERED bounties reject outright.

        Returns the persisted Contribution Graph summary dict.
        """
        self._not_paused()
        now_ts = self._now_ts()
        bounty = self._get_bounty(bounty_id)
        status = int(bounty.status)
        _require(status == STATUS_EVALUATING, "bounty must be EVALUATING (call close_submissions first)")
        _require(int(bounty.eval_lock) != EVAL_LOCK_DONE, "bounty has already been evaluated")

        submissions = self._get_submissions(bounty_id)
        _require(len(submissions) > 0, "bounty has no submissions to evaluate")

        criteria = [c for c in bounty.evaluation_criteria.split(",") if c]

        # Deliberately no EVAL_LOCK_RUNNING write before this call. This
        # nondet call can now abstain by raising (see the abstention-path
        # comment in _evaluate_contribution_graph_nondet's leader()), and a
        # write transaction that raises is not guaranteed to have every
        # prior mutation observably rolled back across every harness this
        # contract is tested in (direct-mode's in-memory VM does not model
        # transactional rollback the way real GenVM consensus does) — so
        # eval_lock is only ever set once, after we know evaluation
        # actually completed, rather than relying on that guarantee.
        graph = self._evaluate_contribution_graph_nondet(bounty, submissions, criteria)
        self._apply_contribution_graph(bounty, submissions, graph, now_ts)

        bounty.status = u8(STATUS_SETTLED)
        bounty.eval_lock = u8(EVAL_LOCK_DONE)
        self.total_bounties_settled = u64(int(self.total_bounties_settled) + 1)
        self._log(bounty_id, "SETTLE", gl.message.sender_address, 0, now_ts, "evaluated + paid")
        return {
            "bounty_id": bounty_id,
            "status": STATUS_NAMES[int(bounty.status)],
            "contribution_graph_json": bounty.contribution_graph_json,
        }

    @gl.public.write
    def claim_sponsor_timeout(self, bounty_id: int) -> dict:
        """Recovery/exit path: if a bounty's submissions closed (or its
        deadline passed) but the sponsor never triggered evaluate_bounty
        within `timeout_grace_seconds` of the deadline, ANY address may call
        this. Zero submissions -> full refund to sponsor. One or more
        submissions -> automatic even-split evaluation across all
        submissions (equal influence_weight_bps), paid identically to the
        success path. Zero-then-transfer ordering throughout.
        """
        self._not_paused()
        now_ts = self._now_ts()
        bounty = self._get_bounty(bounty_id)
        status = int(bounty.status)
        _require(
            status in (STATUS_OPEN_FOR_SUBMISSIONS, STATUS_EVALUATING),
            "bounty is not in a timeout-eligible state",
        )
        grace_deadline = int(bounty.submission_deadline_ts) + int(self.timeout_grace_seconds)
        _require(now_ts > grace_deadline, "timeout grace period has not elapsed yet")
        _require(int(bounty.eval_lock) != EVAL_LOCK_DONE, "bounty has already been evaluated")

        submissions = self._get_submissions(bounty_id)

        if len(submissions) == 0:
            refund = int(bounty.reward_deposited)
            bounty.reward_deposited = u256(0)
            bounty.status = u8(STATUS_TIMED_OUT_RECOVERED)
            bounty.settlement_ts = u64(now_ts)
            bounty.contribution_graph_json = "Sponsor timeout with zero submissions; full refund issued."
            bounty.eval_lock = u8(EVAL_LOCK_DONE)
            self._log(bounty_id, "TIMEOUT", gl.message.sender_address, refund, now_ts, "refund, no submissions")
            self._send_native(bounty.sponsor, refund)
            return {
                "bounty_id": bounty_id,
                "status": STATUS_NAMES[int(bounty.status)],
                "refunded": refund,
            }

        # Automatic even-split fallback — deterministic, no LLM call needed.
        even_bps = BPS_DENOMINATOR // len(submissions)
        allocations = {str(int(s.id)): even_bps for s in submissions}
        allocations = _normalize_allocations(allocations, [int(s.id) for s in submissions])
        graph = {
            "allocations": allocations,
            "categories": {str(int(s.id)): "unevaluated_timeout_split" for s in submissions},
            "complementary_notes": "",
            "reasoning": (
                "Sponsor did not trigger evaluation within the timeout grace "
                "period; reward was split evenly across all submissions as a "
                "deterministic fallback."
            ),
        }
        bounty.eval_lock = u8(EVAL_LOCK_RUNNING)
        self._apply_contribution_graph(bounty, submissions, graph, now_ts)
        bounty.status = u8(STATUS_TIMED_OUT_RECOVERED)
        bounty.eval_lock = u8(EVAL_LOCK_DONE)
        self._log(bounty_id, "TIMEOUT", gl.message.sender_address, 0, now_ts, "even-split fallback")
        return {
            "bounty_id": bounty_id,
            "status": STATUS_NAMES[int(bounty.status)],
            "contribution_graph_json": bounty.contribution_graph_json,
        }

    # ========================================================================
    #  PUBLIC WRITES — internal balance / administration
    # ========================================================================

    @gl.public.write
    def withdraw(self, amount: int) -> None:
        """Withdraw internal balance as a REAL native-token transfer from the
        contract to the caller. Used for rounding remainders / accrued
        protocol fees credited via _credit_balance."""
        sender = gl.message.sender_address
        try:
            amount = int(amount)  # tolerate stringly-typed calldata amounts
        except (ValueError, TypeError):
            raise gl.vm.UserError(ERR_EXPECTED + "amount must be an integer")
        current = self.balances.get(sender)
        available = int(current) if current is not None else 0
        _require(amount > 0, "withdraw amount must be positive")
        _require(amount <= available, f"insufficient balance: have {available}")
        self.balances[sender] = u256(available - amount)
        self.total_payouts = u256(int(self.total_payouts) + amount)
        self._send_native(sender, amount)

    @gl.public.write
    def pause(self) -> None:
        """Owner: halt bounty creation, submission, and evaluation."""
        self._only_owner()
        self.paused = True

    @gl.public.write
    def unpause(self) -> None:
        """Owner: resume operations."""
        self._only_owner()
        self.paused = False

    @gl.public.write
    def set_min_bond_default(self, min_bond_default: int) -> None:
        """Owner: update the platform-wide default anti-spam bond."""
        self._only_owner()
        _require(int(min_bond_default) >= 0, "min_bond_default must be non-negative")
        self.min_bond_default = u256(int(min_bond_default))

    @gl.public.write
    def set_timeout_grace_seconds(self, timeout_grace_seconds: int) -> None:
        """Owner: update the grace period after which claim_sponsor_timeout
        becomes callable by anyone."""
        self._only_owner()
        clamped = _clamp_int(int(timeout_grace_seconds), MIN_TIMEOUT_GRACE_SECONDS, MAX_TIMEOUT_GRACE_SECONDS)
        self.timeout_grace_seconds = u64(clamped)

    @gl.public.write
    def set_owner(self, new_owner: str) -> None:
        """Owner: transfer ownership to a new address (hex string)."""
        self._only_owner()
        self.owner = Address(new_owner)

    @gl.public.write
    def sweep_protocol_fees(self) -> int:
        """Owner: move accrued protocol fees into the owner's withdrawable
        balance. Returns the swept amount. (No protocol fee is currently
        assessed on settlements — this exists for a future fee schedule and
        is kept at 0 unless credited elsewhere.)"""
        self._only_owner()
        amount = int(self.accrued_protocol_fees)
        _require(amount > 0, "no fees accrued")
        self.accrued_protocol_fees = u256(0)
        self._credit_balance(self.owner, amount)
        return amount

    # ========================================================================
    #  PUBLIC VIEWS
    # ========================================================================

    @gl.public.view
    def get_bounty(self, bounty_id: int) -> dict:
        """Full bounty summary (without submissions)."""
        return self._bounty_dict(self._get_bounty(bounty_id))

    @gl.public.view
    def get_bounties(
        self,
        offset: int = 0,
        limit: int = 20,
        status: str = "",
        category: str = "",
    ) -> list[dict]:
        """Paginated bounty summaries, newest first, optionally filtered by
        status name (e.g. "OPEN_FOR_SUBMISSIONS") and/or category
        (case-insensitive exact match)."""
        count = int(self.bounty_count)
        capped_limit = _clamp_int(int(limit), 1, 50)
        wanted_status = status.strip().upper()
        wanted_category = category.strip().lower()

        result: list[dict] = []
        idx = count - 1 - max(0, int(offset))
        scanned = 0
        while idx >= 0 and len(result) < capped_limit and scanned < count:
            bounty = self.bounties.get(u32(idx))
            scanned += 1
            idx -= 1
            if bounty is None:
                continue
            if wanted_status and STATUS_NAMES.get(int(bounty.status)) != wanted_status:
                continue
            if wanted_category and bounty.category.strip().lower() != wanted_category:
                continue
            result.append(self._bounty_dict(bounty))
        return result

    @gl.public.view
    def get_bounty_count(self) -> int:
        return int(self.bounty_count)

    @gl.public.view
    def get_submissions(self, bounty_id: int) -> list[dict]:
        """All submissions to a bounty, in submission order."""
        self._get_bounty(bounty_id)
        return [self._submission_dict(s) for s in self._get_submissions(bounty_id)]

    @gl.public.view
    def get_submission(self, bounty_id: int, submission_id: int) -> dict:
        self._get_bounty(bounty_id)
        subs = self._get_submissions(bounty_id)
        _require(0 <= submission_id < len(subs), "submission index out of range")
        return self._submission_dict(subs[submission_id])

    @gl.public.view
    def get_contribution_graph(self, bounty_id: int) -> dict:
        """Full reasoning trace + allocations for a bounty's evaluation, if
        it has been evaluated (empty string until then)."""
        bounty = self._get_bounty(bounty_id)
        return {
            "bounty_id": int(bounty.id),
            "status": STATUS_NAMES.get(int(bounty.status), "OPEN_FOR_SUBMISSIONS"),
            "settlement_ts": int(bounty.settlement_ts),
            "contribution_graph_json": bounty.contribution_graph_json,
            "submissions": [self._submission_dict(s) for s in self._get_submissions(bounty_id)],
        }

    @gl.public.view
    def get_sponsor_bounty_ids(self, address: str) -> list[int]:
        arr = self.sponsor_bounties.get(Address(address))
        if arr is None:
            return []
        return [int(x) for x in arr]

    @gl.public.view
    def get_contributor_bounty_ids(self, address: str) -> list[int]:
        arr = self.contributor_bounties.get(Address(address))
        if arr is None:
            return []
        return [int(x) for x in arr]

    @gl.public.view
    def get_balance_of(self, address: str) -> int:
        """Internal withdrawable native balance of an address."""
        current = self.balances.get(Address(address))
        return int(current) if current is not None else 0

    @gl.public.view
    def get_activity(self, bounty_id: int, offset: int = 0, limit: int = 25) -> list[dict]:
        """Recent activity log entries for a bounty, newest first."""
        self._get_bounty(bounty_id)
        log = self.activity.get(u32(bounty_id))
        if log is None:
            return []
        total = len(log)
        capped = _clamp_int(int(limit), 1, 100)
        start = total - 1 - max(0, int(offset))
        result: list[dict] = []
        idx = start
        while idx >= 0 and len(result) < capped:
            evt = log[idx]
            result.append(
                {
                    "kind": evt.kind,
                    "actor": evt.actor.as_hex,
                    "amount": int(evt.amount),
                    "ts": int(evt.ts),
                    "note": evt.note,
                }
            )
            idx -= 1
        return result

    @gl.public.view
    def get_platform_stats(self) -> dict:
        return {
            "bounty_count": int(self.bounty_count),
            "total_volume": int(self.total_volume),
            "total_bounties_settled": int(self.total_bounties_settled),
            "total_payouts": int(self.total_payouts),
            "accrued_protocol_fees": int(self.accrued_protocol_fees),
            "paused": bool(self.paused),
        }

    @gl.public.view
    def get_config(self) -> dict:
        return {
            "owner": self.owner.as_hex,
            "paused": bool(self.paused),
            "min_bond_default": int(self.min_bond_default),
            "timeout_grace_seconds": int(self.timeout_grace_seconds),
            "allocation_tolerance_bps": ALLOCATION_TOLERANCE_BPS,
            "max_submissions_per_bounty": MAX_SUBMISSIONS_PER_BOUNTY,
        }

    @gl.public.view
    def get_categories(self) -> list[str]:
        """Example/default evaluation categories. Sponsors are not limited
        to these — evaluation_criteria is a free-form comma-separated field
        per bounty."""
        return list(DEFAULT_CATEGORIES)
