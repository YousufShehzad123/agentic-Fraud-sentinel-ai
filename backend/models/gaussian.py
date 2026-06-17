from typing import Any, Dict, Tuple

import numpy as np


class WelfordGaussianProfiler:
    """
    Per-user behavioral baseline using Welford's online algorithm.

    Tracks each user's typical (amount, hour, international-flag) profile using
    a running mean and variance — only 3 numbers per user, no stored history.

    A high Mahalanobis distance means this transaction is far from what this
    specific user normally does, regardless of whether the amount looks large
    in absolute terms.  That's the signal XGBoost cannot learn on its own.
    """

    def __init__(self):
        self._profiles: Dict[str, Dict[str, Any]] = {}

    def _init_profile(self) -> Dict[str, Any]:
        return {"n": 0, "mean": np.zeros(3), "M2": np.zeros(3)}

    def _features(self, amount: float, hour: int, is_international: bool) -> np.ndarray:
        return np.array([np.log1p(amount), float(hour), float(is_international)])

    def update(self, user_id: str, amount: float, hour: int, is_international: bool):
        if user_id not in self._profiles:
            self._profiles[user_id] = self._init_profile()
        p = self._profiles[user_id]
        x = self._features(amount, hour, is_international)
        p["n"] += 1
        delta = x - p["mean"]
        p["mean"] += delta / p["n"]
        p["M2"] += delta * (x - p["mean"])

    def score(self, user_id: str, amount: float, hour: int, is_international: bool) -> Tuple[float, str]:
        if user_id not in self._profiles or self._profiles[user_id]["n"] < 3:
            self.update(user_id, amount, hour, is_international)
            return 0.30, "Insufficient history — using prior"

        p = self._profiles[user_id]
        x = self._features(amount, hour, is_international)
        variance = p["M2"] / (p["n"] - 1)
        variance = np.where(variance < 1e-8, 1e-8, variance)

        mahal = float(np.sqrt(np.sum(((x - p["mean"]) ** 2) / variance)))
        normalized = min(1.0, mahal / 5.0)

        if mahal > 4.0:
            reason = f"Mahalanobis distance {mahal:.2f} — transaction in low-probability region of behavioral Gaussian"
        elif mahal > 2.5:
            reason = f"Mahalanobis distance {mahal:.2f} — moderately unusual for this user"
        else:
            reason = f"Mahalanobis distance {mahal:.2f} — within expected behavioral distribution"

        self.update(user_id, amount, hour, is_international)
        return float(normalized), reason

    @property
    def status(self) -> str:
        return "ready" if len(self._profiles) > 0 else "not_trained"

    @property
    def sample_count(self) -> int:
        return sum(p["n"] for p in self._profiles.values())
