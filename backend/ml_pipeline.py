"""
Backwards-compatibility shim.

The pipeline has been refactored into dedicated modules:
  backend/models/velocity.py      — VelocityAnalyzer
  backend/models/gaussian.py      — WelfordGaussianProfiler
  backend/models/autoencoder.py   — SimpleAutoencoder
  backend/models/xgboost_scorer.py — XGBoostScorer  (replaces IsolationForest)
  backend/pipeline.py             — FraudPipeline + pipeline singleton

Import directly from those modules.  This file exists so that any
`from ml_pipeline import X` import sites continue to resolve without edits.
"""
from pipeline import FraudPipeline, pipeline, ACTION_THRESHOLDS, WEIGHTS, FEATURE_NAMES  # noqa: F401
from models.velocity import VelocityAnalyzer          # noqa: F401
from models.gaussian import WelfordGaussianProfiler   # noqa: F401
from models.autoencoder import SimpleAutoencoder      # noqa: F401
from models.xgboost_scorer import XGBoostScorer       # noqa: F401
