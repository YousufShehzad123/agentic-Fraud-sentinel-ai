"""Tests for XGBoostScorer — supervised primary ML fraud classifier."""
import numpy as np
import pytest

from models.xgboost_scorer import XGB_AVAILABLE, XGBoostScorer


@pytest.fixture
def scorer():
    return XGBoostScorer()


@pytest.fixture
def trained_scorer():
    rng = np.random.default_rng(0)
    n_normal, n_fraud = 100, 25

    X_normal = np.column_stack([
        np.log1p(rng.uniform(500, 30_000, n_normal)),
        rng.uniform(8, 20, n_normal) / 23.0,
        rng.integers(0, 7, n_normal) / 6.0,
        rng.choice([0.0, 1.0], n_normal, p=[0.97, 0.03]),
        rng.choice([0.0, 1.0], n_normal, p=[0.98, 0.02]),
        rng.uniform(500, 30_000, n_normal) / 500_000.0,
    ])
    X_fraud = np.column_stack([
        np.log1p(rng.uniform(80_000, 400_000, n_fraud)),
        rng.uniform(0, 5, n_fraud) / 23.0,
        rng.integers(0, 7, n_fraud) / 6.0,
        rng.choice([0.0, 1.0], n_fraud, p=[0.20, 0.80]),
        rng.choice([0.0, 1.0], n_fraud, p=[0.20, 0.80]),
        rng.uniform(80_000, 400_000, n_fraud) / 500_000.0,
    ])

    s = XGBoostScorer()
    s.train(X_normal, X_fraud)
    return s


class TestXGBoostScorerUntrained:
    def test_untrained_returns_valid_score(self, scorer):
        features = np.array([np.log1p(1000), 14/23.0, 2/6.0, 0.0, 0.0, 1000/500_000.0])
        score, reason = scorer.score(features)
        assert 0.0 <= score <= 1.0
        assert isinstance(reason, str)

    def test_heuristic_low_for_normal_transaction(self, scorer):
        # Normal PKR 1000 transaction: daytime, local, known device
        features = np.array([np.log1p(1000), 14/23.0, 2/6.0, 0.0, 0.0, 1000/500_000.0])
        score, _ = scorer.score(features)
        assert score < 0.3, f"Expected low heuristic score for normal tx, got {score}"

    def test_heuristic_high_for_fraud_pattern(self, scorer):
        # PKR 200k at 3am, international, unknown device
        features = np.array([np.log1p(200_000), 3/23.0, 2/6.0, 1.0, 1.0, 200_000/500_000.0])
        score, _ = scorer.score(features)
        assert score > 0.7, f"Expected high heuristic score for fraud pattern, got {score}"

    def test_status_when_untrained(self, scorer):
        assert scorer.status == "heuristic_fallback"

    def test_accuracy_zero_when_untrained(self, scorer):
        assert scorer.accuracy == 0.0


@pytest.mark.skipif(not XGB_AVAILABLE, reason="xgboost not installed")
class TestXGBoostScorerTrained:
    def test_trained_status(self, trained_scorer):
        assert trained_scorer.status == "ready"

    def test_trained_accuracy(self, trained_scorer):
        assert trained_scorer.accuracy == 0.93

    def test_score_bounded(self, trained_scorer):
        features = np.array([np.log1p(5000), 12/23.0, 1/6.0, 0.0, 0.0, 5000/500_000.0])
        score, _ = trained_scorer.score(features)
        assert 0.0 <= score <= 1.0

    def test_fraud_pattern_scores_higher_than_normal(self, trained_scorer):
        normal  = np.array([np.log1p(2000),   14/23.0, 2/6.0, 0.0, 0.0, 2000/500_000.0])
        fraud   = np.array([np.log1p(200_000), 2/23.0, 2/6.0, 1.0, 1.0, 200_000/500_000.0])
        normal_score, _ = trained_scorer.score(normal)
        fraud_score,  _ = trained_scorer.score(fraud)
        assert fraud_score > normal_score, (
            f"Fraud pattern should score higher: fraud={fraud_score:.3f}, normal={normal_score:.3f}"
        )

    def test_reason_mentions_xgboost(self, trained_scorer):
        features = np.array([np.log1p(5000), 12/23.0, 1/6.0, 0.0, 0.0, 5000/500_000.0])
        _, reason = trained_scorer.score(features)
        assert "XGBoost" in reason
