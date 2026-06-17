from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, Tuple


class VelocityAnalyzer:
    """
    Sliding-window transaction velocity counters per user/card.

    Catches card-testing bursts, SIM-swap patterns, and dormant-account spikes
    by counting how many transactions a user makes in rolling 1m/5m/1h/24h windows.
    No ML training required — rules fire from the very first transaction.
    """

    def __init__(self):
        self._windows: Dict[str, deque] = defaultdict(deque)
        self._baseline_velocity = 3.0

    def record(self, user_id: str, amount: float, ts: datetime):
        self._windows[user_id].append((ts, amount))
        cutoff = ts - timedelta(hours=24)
        while self._windows[user_id] and self._windows[user_id][0][0] < cutoff:
            self._windows[user_id].popleft()

    def score(self, user_id: str, amount: float, ts: datetime) -> Tuple[float, str]:
        self.record(user_id, amount, ts)
        events = list(self._windows[user_id])

        count_1m  = sum(1 for t, _ in events if t >= ts - timedelta(minutes=1))
        count_5m  = sum(1 for t, _ in events if t >= ts - timedelta(minutes=5))
        count_1h  = sum(1 for t, _ in events if t >= ts - timedelta(hours=1))
        count_24h = len(events)

        if count_1m >= 5:
            return 0.90, f"Card-testing burst: {count_1m} transactions in 1 minute"
        if count_1m >= 3:
            return 0.65, f"Velocity spike: {count_1m} transactions in 1 minute"
        if count_5m >= 8:
            return 0.75, f"High velocity: {count_5m} transactions in 5 minutes"
        if count_1h >= 20:
            return 0.55, f"Unusual hourly volume: {count_1h} transactions"
        if count_24h == 1 and amount > 50_000:
            return 0.60, f"Dormant account spike: first transaction is PKR {amount:,.0f}"

        baseline_ratio = count_1h / max(self._baseline_velocity, 1)
        score = min(0.40, baseline_ratio * 0.10)
        return float(score), f"Normal velocity: {count_1h}/hr, {count_24h}/24hr"

    @property
    def status(self) -> str:
        return "ready" if len(self._windows) > 0 else "not_trained"

    @property
    def sample_count(self) -> int:
        return sum(len(v) for v in self._windows.values())
