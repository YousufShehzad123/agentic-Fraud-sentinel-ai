"""Tests for VelocityAnalyzer — sliding-window transaction counters."""
from datetime import datetime, timedelta

import pytest

from models.velocity import VelocityAnalyzer


@pytest.fixture
def analyzer():
    return VelocityAnalyzer()


@pytest.fixture
def now():
    return datetime(2026, 6, 5, 14, 30, 0)


class TestVelocityAnalyzer:
    def test_first_transaction_returns_low_score(self, analyzer, now):
        score, reason = analyzer.score("user_1", 500.0, now)
        assert score < 0.5
        assert "Normal velocity" in reason or "Dormant" in reason

    def test_dormant_account_spike_flagged(self, analyzer, now):
        """First-ever transaction for a large amount should trigger a flag."""
        score, reason = analyzer.score("dormant_user", 75000.0, now)
        assert score >= 0.55
        assert "Dormant account spike" in reason

    def test_card_testing_burst_high_risk(self, analyzer, now):
        """5+ transactions in 1 minute should trigger highest velocity score."""
        for i in range(6):
            ts = now + timedelta(seconds=i * 5)
            score, reason = analyzer.score("burst_user", 10.0, ts)

        assert score >= 0.85, f"Expected very high score for burst, got {score}"
        assert "Card-testing burst" in reason

    def test_three_in_one_minute_moderate_risk(self, analyzer, now):
        """3 transactions in 1 minute is suspicious but not extreme."""
        score = 0.0
        for i in range(3):
            ts = now + timedelta(seconds=i * 15)
            score, _ = analyzer.score("user_2", 100.0, ts)

        assert 0.55 <= score < 0.85

    def test_high_5min_volume(self, analyzer, now):
        """8+ transactions in 5 minutes (without 1-min burst) should be flagged."""
        for i in range(8):
            ts = now + timedelta(seconds=i * 35)  # ~35s apart, all in 5 min
            score, reason = analyzer.score("steady_burst", 50.0, ts)

        assert score >= 0.65
        assert "5 minutes" in reason or "burst" in reason.lower()

    def test_window_purges_old_entries(self, analyzer, now):
        """Entries older than 24h should not count toward velocity score."""
        # Old transaction
        analyzer.score("user_3", 100.0, now - timedelta(hours=30))
        # Current transaction
        score, _ = analyzer.score("user_3", 100.0, now)
        # Should NOT see the old one
        assert analyzer.sample_count == 1

    def test_score_is_idempotent_for_different_users(self, analyzer, now):
        """Two different users' transactions don't affect each other's scores."""
        analyzer.score("alice", 100.0, now)
        analyzer.score("alice", 100.0, now + timedelta(seconds=10))
        analyzer.score("alice", 100.0, now + timedelta(seconds=20))

        # Bob's first transaction
        score, _ = analyzer.score("bob", 100.0, now)
        assert score < 0.5  # Bob isn't affected by alice's history

    def test_status_changes_after_first_transaction(self, analyzer, now):
        assert analyzer.status == "not_trained"
        analyzer.score("user_4", 100.0, now)
        assert analyzer.status == "ready"

    def test_sample_count_increases(self, analyzer, now):
        assert analyzer.sample_count == 0
        for i in range(5):
            analyzer.score("user_5", 100.0, now + timedelta(seconds=i))
        assert analyzer.sample_count == 5
