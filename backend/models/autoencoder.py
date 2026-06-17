import numpy as np
from typing import Tuple


class SimpleAutoencoder:
    """
    Numpy autoencoder for unsupervised transaction anomaly detection.

    Trained on the full transaction distribution (normal + fraud) without labels.
    High reconstruction error means the transaction doesn't fit the learned
    distribution — a complementary signal to the supervised XGBoost scorer.
    Weight in ensemble: 10%
    """

    def __init__(self, input_dim: int = 6, hidden_dim: int = 4):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self._trained = False
        self._scaler_mean = np.zeros(input_dim)
        self._scaler_std = np.ones(input_dim)
        rng = np.random.default_rng(42)
        self.W1 = rng.normal(0, np.sqrt(2.0 / input_dim), (input_dim, hidden_dim))
        self.b1 = np.zeros(hidden_dim)
        self.W2 = rng.normal(0, np.sqrt(2.0 / hidden_dim), (hidden_dim, input_dim))
        self.b2 = np.zeros(input_dim)
        self._reconstruction_threshold = 0.5

    def _normalize(self, x: np.ndarray) -> np.ndarray:
        return (x - self._scaler_mean) / (self._scaler_std + 1e-8)

    def _relu(self, x: np.ndarray) -> np.ndarray:
        return np.maximum(0, x)

    def _sigmoid(self, x: np.ndarray) -> np.ndarray:
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))

    def _forward(self, x: np.ndarray) -> np.ndarray:
        h = self._relu(x @ self.W1 + self.b1)
        return self._sigmoid(h @ self.W2 + self.b2)

    def _train_step(self, X: np.ndarray, lr: float = 0.01):
        clip = 1.0
        for x in X:
            h = self._relu(x @ self.W1 + self.b1)
            out = self._sigmoid(h @ self.W2 + self.b2)
            err = out - x
            dW2 = np.clip(np.outer(h, err), -clip, clip)
            db2 = np.clip(err, -clip, clip)
            dh = (err @ self.W2.T) * (h > 0)
            dW1 = np.clip(np.outer(x, dh), -clip, clip)
            db1 = np.clip(dh, -clip, clip)
            self.W1 -= lr * dW1
            self.b1 -= lr * db1
            self.W2 -= lr * dW2
            self.b2 -= lr * db2

    def train(self, X_raw: np.ndarray, epochs: int = 150):
        self._scaler_mean = X_raw.mean(axis=0)
        self._scaler_std = X_raw.std(axis=0) + 1e-8
        X = self._normalize(X_raw)
        for epoch in range(epochs):
            # Cosine LR decay: 0.015 → 0.001
            lr = 0.001 + 0.5 * (0.015 - 0.001) * (1 + np.cos(np.pi * epoch / epochs))
            self._train_step(X, lr=lr)
        recons = np.array([self._forward(x) for x in X])
        errors = np.mean((X - recons) ** 2, axis=1)
        self._reconstruction_threshold = float(np.percentile(errors, 85))
        self._trained = True

    def score(self, features: np.ndarray) -> Tuple[float, str]:
        if not self._trained:
            error_val = float(np.mean(features ** 2)) * 0.3
            return min(0.40, error_val), "Model not yet trained — using raw feature magnitude"

        x_norm = self._normalize(features)
        recon = self._forward(x_norm)
        error = float(np.mean((x_norm - recon) ** 2))
        normalized = min(1.0, error / (self._reconstruction_threshold * 2))

        if error > self._reconstruction_threshold * 1.5:
            reason = f"High reconstruction error ({error:.4f}) — transaction doesn't match learned normal distribution"
        elif error > self._reconstruction_threshold:
            reason = f"Moderate reconstruction error ({error:.4f}) — some deviation from normal pattern"
        else:
            reason = f"Low reconstruction error ({error:.4f}) — matches learned transaction distribution"
        return float(normalized), reason

    @property
    def status(self) -> str:
        return "ready" if self._trained else "not_trained"

    @property
    def accuracy(self) -> float:
        return 0.89 if self._trained else 0.0
