"""Direct (in-memory) unit tests for the Vertex Bounty Fusion Intelligent
Contract.

Runs the contract natively via gltest.direct — no simulator, no network. Web
and LLM calls are mocked; full consensus behavior belongs in
tests/integration/ (Studio / GLSim / StudioNet).

Run: pytest tests/direct/ -v
"""

import json
import time
from pathlib import Path

import pytest
from gltest.direct import VMContext, deploy_contract, create_address

CONTRACT = Path(__file__).parent.parent.parent / "contracts" / "vertex_bounty_fusion.py"

GEN = 10**18
NOW = int(time.time())
DEADLINE = NOW + 30 * 86400

OWNER = create_address("owner")
SPONSOR = create_address("sponsor")
ALICE = create_address("alice")     # strongest security
BOB = create_address("bob")         # strongest UX
CAROL = create_address("carol")     # strongest performance


def hx(addr) -> str:
    if isinstance(addr, bytes):
        return "0x" + addr.hex()
    return addr.as_hex


def same(a: str, b: str) -> bool:
    return a.lower() == b.lower()


def iso(unix_ts: int) -> str:
    import datetime

    return datetime.datetime.fromtimestamp(unix_ts, tz=__import__("datetime").timezone.utc).isoformat().replace(
        "+00:00", "Z"
    )


def fresh(vm: VMContext, min_bond_default: int = 0, timeout_grace_seconds: int = 3600):
    """Deploy a fresh contract as OWNER, clock warped to NOW."""
    vm.warp(iso(NOW))
    vm.sender = OWNER
    vm.value = 0
    return deploy_contract(CONTRACT, vm, min_bond_default, timeout_grace_seconds)


def make_bounty(
    vm,
    c,
    sponsor=SPONSOR,
    value=10 * GEN,
    criteria="security,ux,performance,recovery,documentation",
    deadline=DEADLINE,
    title="Build the best decentralized identity platform",
):
    vm.sender = sponsor
    vm.value = value
    bid = c.create_bounty(title, "A DID platform bounty.", "Identity", criteria, deadline)
    vm.value = 0
    return bid


def submit(vm, c, bounty_id, contributor, url, summary):
    vm.sender = contributor
    vm.value = 0
    return c.submit_solution(bounty_id, url, summary)


def mock_web_ok(vm, pattern=r".*", body="Well documented, secure, and performant open-source repo."):
    vm.mock_web(pattern, {"status": 200, "body": body})


def graph_response(allocations: dict, categories: dict, notes="Submissions complement each other.", reasoning="Weighed evidence across all submissions."):
    return json.dumps(
        {
            "allocations": allocations,
            "categories": categories,
            "complementary_notes": notes,
            "reasoning": reasoning,
        }
    )


# ---------------------------------------------------------------------------
# Deployment & config
# ---------------------------------------------------------------------------


def test_deploy_and_config():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        cfg = c.get_config()
        assert same(cfg["owner"], hx(OWNER))
        assert cfg["paused"] is False
        assert cfg["timeout_grace_seconds"] == 3600
        assert c.get_bounty_count() == 0
        assert "security" in c.get_categories()


# ---------------------------------------------------------------------------
# Bounty creation & validation
# ---------------------------------------------------------------------------


def test_create_bounty_happy_path():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        assert bid == 0
        b = c.get_bounty(0)
        assert b["status"] == "OPEN_FOR_SUBMISSIONS"
        assert b["reward_pool"] == 10 * GEN
        assert b["reward_deposited"] == 10 * GEN
        assert same(b["sponsor"], hx(SPONSOR))
        assert b["evaluation_criteria"] == "security,ux,performance,recovery,documentation"
        assert b["created_ts"] == NOW  # from the consensus clock, never an argument


def test_create_bounty_requires_positive_funding():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        vm.sender = SPONSOR
        vm.value = 0
        with vm.expect_revert():
            c.create_bounty("T", "d", "Cat", "security,ux", DEADLINE)


def test_create_bounty_rejects_past_deadline():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        vm.sender = SPONSOR
        vm.value = GEN
        with vm.expect_revert():
            c.create_bounty("T", "d", "Cat", "security,ux", NOW - 10)


def test_create_bounty_rejects_empty_criteria():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        vm.sender = SPONSOR
        vm.value = GEN
        with vm.expect_revert():
            c.create_bounty("T", "d", "Cat", "   ", DEADLINE)


def test_create_bounty_custom_categories_not_hardcoded():
    """Sponsors can define arbitrary categories, not just the 5 example ones."""
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, criteria="innovation,scalability,api-design")
        assert c.get_bounty(bid)["evaluation_criteria"] == "innovation,scalability,api-design"


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------


def test_submit_solution_happy_path():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        sid = submit(vm, c, bid, ALICE, "https://github.com/alice/did-crypto", "Strong cryptography.")
        assert sid == 0
        subs = c.get_submissions(bid)
        assert len(subs) == 1
        assert same(subs[0]["contributor"], hx(ALICE))
        assert subs[0]["influence_weight_bps"] == 0  # unevaluated
        assert subs[0]["reward_owed"] == 0


def test_submit_solution_rejects_bad_url():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        vm.sender = ALICE
        with vm.expect_revert():
            c.submit_solution(bid, "ftp://not-http", "summary")


def test_submit_solution_rejects_after_deadline():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        vm.warp(iso(DEADLINE + 10))
        vm.sender = ALICE
        with vm.expect_revert():
            c.submit_solution(bid, "https://github.com/alice/x", "late")


def test_submit_solution_rejects_when_not_open():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s")
        vm.sender = SPONSOR
        c.close_submissions(bid)
        vm.sender = BOB
        with vm.expect_revert():
            c.submit_solution(bid, "https://github.com/bob/y", "late entry")


# ---------------------------------------------------------------------------
# close_submissions access control
# ---------------------------------------------------------------------------


def test_close_submissions_sponsor_only_before_deadline():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        vm.sender = ALICE  # not sponsor, not owner
        with vm.expect_revert():
            c.close_submissions(bid)
        vm.sender = SPONSOR
        c.close_submissions(bid)
        assert c.get_bounty(bid)["status"] == "EVALUATING"


def test_close_submissions_permissionless_after_deadline():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        vm.warp(iso(DEADLINE + 1))
        vm.sender = BOB  # anyone, after deadline
        c.close_submissions(bid)
        assert c.get_bounty(bid)["status"] == "EVALUATING"


def test_close_submissions_owner_may_close_early_too():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        vm.sender = OWNER
        c.close_submissions(bid)
        assert c.get_bounty(bid)["status"] == "EVALUATING"


# ---------------------------------------------------------------------------
# cancel_bounty
# ---------------------------------------------------------------------------


def test_cancel_bounty_before_submissions_refunds_sponsor():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=5 * GEN)
        vm.sender = SPONSOR
        c.cancel_bounty(bid)
        b = c.get_bounty(bid)
        assert b["status"] == "CANCELLED"
        assert b["reward_deposited"] == 0  # zeroed before the (mocked) transfer


def test_cancel_bounty_rejected_once_submission_exists():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s")
        vm.sender = SPONSOR
        with vm.expect_revert():
            c.cancel_bounty(bid)


def test_cancel_bounty_access_control():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        vm.sender = ALICE  # not sponsor/owner
        with vm.expect_revert():
            c.cancel_bounty(bid)


# ---------------------------------------------------------------------------
# evaluate_bounty — the core Contribution Graph pass
# ---------------------------------------------------------------------------


def test_evaluate_bounty_builds_contribution_graph_and_pays_out():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=10 * GEN)
        submit(vm, c, bid, ALICE, "https://github.com/alice/security", "Best security work.")
        submit(vm, c, bid, BOB, "https://github.com/bob/ux", "Best UX work.")
        submit(vm, c, bid, CAROL, "https://github.com/carol/perf", "Best performance work.")

        vm.sender = SPONSOR
        c.close_submissions(bid)

        mock_web_ok(vm)
        vm.mock_llm(
            r".*",
            graph_response(
                allocations={"0": 4000, "1": 3500, "2": 2500},
                categories={"0": "security", "1": "ux", "2": "performance"},
            ),
        )
        vm.sender = BOB  # evaluation is permissionless once EVALUATING
        result = c.evaluate_bounty(bid)
        assert result["status"] == "SETTLED"

        b = c.get_bounty(bid)
        assert b["status"] == "SETTLED"
        assert b["reward_deposited"] == 0  # zeroed before any payout

        subs = c.get_submissions(bid)
        assert subs[0]["influence_weight_bps"] == 4000
        assert subs[0]["reward_owed"] == 4 * GEN
        assert subs[0]["extracted_category"] == "security"
        assert subs[1]["influence_weight_bps"] == 3500
        assert subs[2]["influence_weight_bps"] == 2500
        assert all(s["paid"] for s in subs)

        graph = c.get_contribution_graph(bid)
        assert graph["contribution_graph_json"]  # persisted reasoning trace
        assert "allocations_bps" in graph["contribution_graph_json"]


def test_evaluate_bounty_normalizes_allocations_over_10000():
    """If the LLM (mock) reports allocations summing above 10000 bps, the
    contract must clamp deterministically rather than over-paying."""
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=10 * GEN)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s1")
        submit(vm, c, bid, BOB, "https://github.com/bob/y", "s2")
        vm.sender = SPONSOR
        c.close_submissions(bid)
        mock_web_ok(vm)
        vm.mock_llm(
            r".*",
            graph_response(
                allocations={"0": 7000, "1": 8000},  # sums to 15000 > 10000
                categories={"0": "security", "1": "ux"},
            ),
        )
        c.evaluate_bounty(bid)
        subs = c.get_submissions(bid)
        assert subs[0]["influence_weight_bps"] + subs[1]["influence_weight_bps"] == 10000
        total_paid = subs[0]["reward_owed"] + subs[1]["reward_owed"]
        assert total_paid <= 10 * GEN


def test_evaluate_bounty_rejects_missing_allocation_defaults_to_zero():
    """A submission id missing from the LLM's allocation map gets 0 bps
    rather than crashing the whole evaluation."""
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=10 * GEN)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s1")
        submit(vm, c, bid, BOB, "https://github.com/bob/y", "s2")
        vm.sender = SPONSOR
        c.close_submissions(bid)
        mock_web_ok(vm)
        # only submission 0 is mentioned
        vm.mock_llm(r".*", graph_response(allocations={"0": 6000}, categories={"0": "security"}))
        c.evaluate_bounty(bid)
        subs = c.get_submissions(bid)
        # missing submission 1 -> 0 bps initially, then remainder routed to
        # the highest-id submission (submission 1) per deterministic rule
        assert subs[0]["influence_weight_bps"] + subs[1]["influence_weight_bps"] == 10000


def test_evaluate_bounty_requires_evaluating_status():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s")
        with vm.expect_revert():  # still OPEN_FOR_SUBMISSIONS
            c.evaluate_bounty(bid)


def test_evaluate_bounty_requires_at_least_one_submission():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c)
        vm.sender = SPONSOR
        c.close_submissions(bid)
        with vm.expect_revert():
            c.evaluate_bounty(bid)


def test_evaluate_bounty_cannot_double_settle():
    """Double-evaluation / double-payout guard: once SETTLED, a second call
    must revert rather than paying out twice."""
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=10 * GEN)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s1")
        submit(vm, c, bid, BOB, "https://github.com/bob/y", "s2")
        vm.sender = SPONSOR
        c.close_submissions(bid)
        mock_web_ok(vm)
        vm.mock_llm(r".*", graph_response({"0": 5000, "1": 5000}, {"0": "security", "1": "ux"}))
        c.evaluate_bounty(bid)
        with vm.expect_revert():
            c.evaluate_bounty(bid)


def test_evaluate_bounty_malformed_llm_output_degrades_gracefully():
    """Non-JSON / garbled model output must not crash evaluation — it should
    parse defensively rather than raising an unrecoverable error."""
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=10 * GEN)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s1")
        vm.sender = SPONSOR
        c.close_submissions(bid)
        mock_web_ok(vm)
        vm.mock_llm(r".*", "```json\n{\"allocations\": \"not-an-object\"}\n```")
        # Should not raise — degrades to a 0-bps-then-remainder allocation.
        result = c.evaluate_bounty(bid)
        assert result["status"] == "SETTLED"


def test_evaluate_bounty_degrades_when_one_of_several_fetches_fails():
    """One dead evidence source among several must not abort the whole
    evaluation — the contract records a fetch-failed excerpt for that
    submission and still reasons/pays out using the sources that did
    resolve."""
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=10 * GEN)
        submit(vm, c, bid, ALICE, "https://dead-link.example/repo", "s1")
        submit(vm, c, bid, BOB, "https://github.com/bob/x", "s2")
        vm.sender = SPONSOR
        c.close_submissions(bid)
        # Only bob's URL is mocked -> alice's fetch raises inside
        # _fetch_submission_evidence, caught and turned into an "ok: False"
        # evidence record. Since bob's succeeded, this is a PARTIAL failure
        # and must still settle.
        mock_web_ok(vm, pattern=r".*bob.*")
        vm.mock_llm(r".*", graph_response({"0": 3000, "1": 7000}, {"0": "security", "1": "ux"}))
        result = c.evaluate_bounty(bid)
        assert result["status"] == "SETTLED"


def test_evaluate_bounty_abstains_when_all_evidence_unreachable():
    """If EVERY submission's evidence fetch fails, the contract must abstain
    rather than let the model force a verdict on no real evidence — a failed
    fetch is never treated as 'the thing is absent, allocate accordingly'.
    The call must fail, and the bounty must remain exactly as it was
    (EVALUATING, not settled, no payout, re-evaluatable once evidence is
    reachable again)."""
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=10 * GEN)
        submit(vm, c, bid, ALICE, "https://dead-link.example/repo", "s1")
        submit(vm, c, bid, BOB, "https://also-dead.example/repo", "s2")
        vm.sender = SPONSOR
        c.close_submissions(bid)
        # No mock_web registered at all -> every fetch fails.
        with vm.expect_revert():
            c.evaluate_bounty(bid)

        bounty = c.get_bounty(bid)
        assert bounty["status"] == "EVALUATING"
        assert bounty["reward_deposited"] == 10 * GEN  # untouched, nothing settled

        # Retryable: once evidence is reachable, a fresh call succeeds.
        mock_web_ok(vm)
        vm.mock_llm(r".*", graph_response({"0": 5000, "1": 5000}, {"0": "security", "1": "ux"}))
        result = c.evaluate_bounty(bid)
        assert result["status"] == "SETTLED"


# ---------------------------------------------------------------------------
# claim_sponsor_timeout — recovery/exit path
# ---------------------------------------------------------------------------


def test_claim_sponsor_timeout_refunds_when_no_submissions():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm, timeout_grace_seconds=3600)
        bid = make_bounty(vm, c, value=5 * GEN, deadline=NOW + 100)
        vm.warp(iso(NOW + 100 + 3600 + 10))
        vm.sender = ALICE  # anyone may trigger
        result = c.claim_sponsor_timeout(bid)
        assert result["status"] == "TIMED_OUT_RECOVERED"
        assert result["refunded"] == 5 * GEN
        assert c.get_bounty(bid)["reward_deposited"] == 0


def test_claim_sponsor_timeout_even_split_with_submissions():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm, timeout_grace_seconds=3600)
        bid = make_bounty(vm, c, value=10 * GEN, deadline=NOW + 100)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s1")
        submit(vm, c, bid, BOB, "https://github.com/bob/y", "s2")
        # sponsor never calls close_submissions/evaluate_bounty
        vm.warp(iso(NOW + 100 + 3600 + 10))
        vm.sender = CAROL  # anyone may trigger
        result = c.claim_sponsor_timeout(bid)
        assert result["status"] == "TIMED_OUT_RECOVERED"
        subs = c.get_submissions(bid)
        assert subs[0]["influence_weight_bps"] + subs[1]["influence_weight_bps"] == 10000
        assert subs[0]["reward_owed"] + subs[1]["reward_owed"] == 10 * GEN


def test_claim_sponsor_timeout_rejected_before_grace_elapses():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm, timeout_grace_seconds=3600)
        bid = make_bounty(vm, c, deadline=NOW + 100)
        vm.warp(iso(NOW + 100 + 10))  # deadline passed, grace not yet
        with vm.expect_revert():
            c.claim_sponsor_timeout(bid)


def test_claim_sponsor_timeout_rejected_after_settlement():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm, timeout_grace_seconds=3600)
        bid = make_bounty(vm, c, value=10 * GEN, deadline=NOW + 100)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s1")
        vm.warp(iso(NOW + 50))
        vm.sender = SPONSOR
        c.close_submissions(bid)
        mock_web_ok(vm)
        vm.mock_llm(r".*", graph_response({"0": 10000}, {"0": "security"}))
        c.evaluate_bounty(bid)
        vm.warp(iso(NOW + 100 + 3600 + 10))
        with vm.expect_revert():
            c.claim_sponsor_timeout(bid)


# ---------------------------------------------------------------------------
# Admin / access control
# ---------------------------------------------------------------------------


def test_pause_blocks_bounty_creation_and_submission():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        vm.sender = OWNER
        c.pause()
        vm.sender = SPONSOR
        vm.value = GEN
        with vm.expect_revert():
            c.create_bounty("T", "d", "Cat", "security,ux", DEADLINE)


def test_only_owner_can_pause():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        vm.sender = ALICE
        with vm.expect_revert():
            c.pause()


def test_set_owner_transfers_admin_rights():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        vm.sender = OWNER
        c.set_owner(hx(ALICE))
        vm.sender = OWNER
        with vm.expect_revert():  # old owner lost rights
            c.pause()
        vm.sender = ALICE
        c.pause()
        assert c.get_platform_stats()["paused"] is True


def test_set_timeout_grace_seconds_owner_only_and_clamped():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        vm.sender = ALICE
        with vm.expect_revert():
            c.set_timeout_grace_seconds(100)
        vm.sender = OWNER
        c.set_timeout_grace_seconds(1)  # below floor -> clamped up
        assert c.get_config()["timeout_grace_seconds"] >= 3600


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------


def test_get_bounties_pagination_and_filters():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        make_bounty(vm, c, title="Bounty A")
        make_bounty(vm, c, title="Bounty B")
        all_bounties = c.get_bounties(limit=10)
        assert len(all_bounties) == 2
        assert all_bounties[0]["title"] == "Bounty B"  # newest first
        open_only = c.get_bounties(status="OPEN_FOR_SUBMISSIONS")
        assert len(open_only) == 2


def test_get_platform_stats_and_activity_log():
    vm = VMContext()
    with vm.activate():
        c = fresh(vm)
        bid = make_bounty(vm, c, value=3 * GEN)
        submit(vm, c, bid, ALICE, "https://github.com/alice/x", "s")
        stats = c.get_platform_stats()
        assert stats["bounty_count"] == 1
        activity = c.get_activity(bid)
        kinds = [a["kind"] for a in activity]
        assert "SUBMIT" in kinds
        assert "CREATE" in kinds
