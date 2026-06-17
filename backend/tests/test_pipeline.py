"""End-to-end integration tests for FraudPipeline."""
import pytest

from pipeline import FraudPipeline


@pytest.fixture(scope="module")
def pipe():
    """Shared pipeline instance — auto_initialize() runs once for the module."""
    p = FraudPipeline()
    p.auto_initialize()
    return p


def _normal_tx(**overrides):
    tx = {
        "transactionId": "TEST001",
        "amount": 1500.0,
        "merchant": "Foodpanda PK",
        "category": "food",
        "userId": "user_test",
        "location": "Karachi",
        "deviceId": "dev_user_test_primary",
        "ipAddress": "192.168.1.1",
    }
    tx.update(overrides)
    return tx


class TestPipelineOutput:
    def test_score_returns_required_keys(self, pipe):
        result = pipe.score_transaction(_normal_tx())
        for key in ("riskScore", "status", "action", "agentReasoning",
                    "isolationScore", "velocityScore", "mahalanobisDistance",
                    "autoencoderError", "mlAnalysis"):
            assert key in result, f"Missing key: {key}"

    def test_risk_score_bounded(self, pipe):
        result = pipe.score_transaction(_normal_tx())
        assert 0.0 <= result["riskScore"] <= 1.0

    def test_normal_transaction_gets_monitor(self, pipe):
        result = pipe.score_transaction(_normal_tx())
        # A small daytime local transaction should not be blocked immediately
        assert result["action"] in ("MONITOR", "REQUEST_OTP"), (
            f"Expected low-risk action for normal tx, got {result['action']}"
        )

    def test_status_values_are_valid(self, pipe):
        result = pipe.score_transaction(_normal_tx())
        assert result["status"] in ("normal", "suspicious", "fraudulent")

    def test_action_values_are_valid(self, pipe):
        result = pipe.score_transaction(_normal_tx())
        assert result["action"] in (
            "MONITOR", "REQUEST_OTP", "SOFT_BLOCK", "HARD_BLOCK", "FREEZE_ACCOUNT"
        )


class TestFraudPatterns:
    def test_large_international_unknown_device_triggers_high_action(self, pipe):
        result = pipe.score_transaction(_normal_tx(
            amount=250_000.0,
            location="Lagos, Nigeria",
            deviceId="dev_unknown_9921",
        ))
        assert result["action"] in ("HARD_BLOCK", "FREEZE_ACCOUNT"), (
            f"Expected high action for fraud pattern, got {result['action']}"
        )

    def test_velocity_burst_triggers_freeze(self, pipe):
        burst_user = "burst_test_user_unique_99"
        from datetime import datetime, timedelta
        # Timestamps must be recent (within 24h) so they survive the purge window
        ts_base = datetime.utcnow() - timedelta(seconds=30)
        for i in range(6):
            pipe.velocity.record(burst_user, 10.0, ts_base + timedelta(seconds=i * 5))

        result = pipe.score_transaction(_normal_tx(userId=burst_user, amount=10.0))
        assert result["action"] == "FREEZE_ACCOUNT", (
            f"Velocity burst should trigger FREEZE_ACCOUNT, got {result['action']}"
        )

    def test_dormant_account_large_spike_flagged(self, pipe):
        result = pipe.score_transaction(_normal_tx(
            userId="fresh_dormant_account_xyz",
            amount=150_000.0,
            merchant="International Remittance",
            location="Dubai, UAE",
        ))
        assert result["riskScore"] > 0.40, (
            f"Dormant account spike should score > 40%, got {result['riskScore']:.2%}"
        )


class TestPipelineState:
    def test_total_samples_increments(self, pipe):
        before = pipe._total_samples
        pipe.score_transaction(_normal_tx())
        assert pipe._total_samples == before + 1

    def test_get_status_returns_4_models(self, pipe):
        status = pipe.get_status()
        assert len(status["models"]) == 4

    def test_model_names_in_status(self, pipe):
        status = pipe.get_status()
        names = {m["name"] for m in status["models"]}
        assert "XGBoost" in names
        assert "Velocity Analyzer" in names
        assert "Gaussian Profile (Welford)" in names
        assert "Autoencoder" in names

    def test_train_requires_min_samples(self, pipe):
        result = pipe.train([{"amount": 100, "userId": "u", "location": "PK", "deviceId": "d"}])
        assert result["success"] is False
