import os
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

ANTHROPIC_AVAILABLE = False
anthropic_client = None

try:
    import anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        anthropic_client = anthropic.Anthropic(api_key=api_key)
        ANTHROPIC_AVAILABLE = True
except ImportError:
    pass

PAKISTAN_FRAUD_CONTEXT = """You are SentinelAI, an expert fraud detection agent for Pakistani mobile wallet transactions (Easypaisa / JazzCash).

Key Pakistan-specific fraud patterns you watch for:
- SIM Swap: New device ID for existing user number, often followed by large transfer
- OTP Theft: Social engineering to obtain OTP, then large international transfer
- Structuring: Multiple sub-threshold transactions (PKR 9,000–9,999) to avoid AML triggers
- Dormant Account Spike: Inactive account suddenly sending large sums to unknown payees
- Card Testing: Rapid micro-transactions (PKR 1–50) to verify stolen card details
- Account Takeover (ATO): Unknown device + international IP + high amount combination
- Round-Trip / Money Mule: Funds transferred to mule account and immediately forwarded

Geographic risk signals:
- High risk: Lagos Nigeria, Kabul Afghanistan, unknown international locations
- Medium risk: Dubai UAE, London UK (common for overseas Pakistani workers but also exploited)
- Low risk: Karachi, Lahore, Islamabad, other Pakistani cities

Merchant risk signals:
- High risk: "Overseas FX Transfer", "International Remittance", "Unknown Merchant", "Crypto Exchange"
- Medium risk: Any international wire transfer, foreign currency exchange
- Low risk: Jazz Top-Up, Telenor Top-Up, utility bills (K-Electric, LESCO, SNGPL), food delivery

Amount patterns:
- PKR 100-2,000: Normal mobile top-up or food order
- PKR 2,000-20,000: Normal retail or utility payment
- PKR 20,000-100,000: Large transaction — requires scrutiny
- PKR 100,000+: High-value — almost always requires OTP or block

Your actions (graduated response system):
- MONITOR: < 25% risk — allow through
- REQUEST_OTP: 25-40% — OTP challenge to account holder
- SOFT_BLOCK: 40-55% — 60-second hold for review
- HARD_BLOCK: 55-70% — reject and alert fraud ops
- FREEZE_ACCOUNT: ≥ 70% — freeze account, auto-file case

Always provide brief, actionable reasoning for your decision."""


def _build_agent_prompt(tx: Dict[str, Any], ml_results: Dict[str, Any], agent_role: str) -> str:
    return f"""Agent Role: {agent_role}

Transaction Details:
- ID: {tx.get('transactionId', 'unknown')}
- Amount: PKR {tx.get('amount', 0):,.2f}
- Merchant: {tx.get('merchant', 'unknown')} ({tx.get('category', 'unknown')})
- User: {tx.get('userId', 'unknown')}
- Location: {tx.get('location', 'unknown')}
- Device: {tx.get('deviceId', 'unknown')}
- IP: {tx.get('ipAddress', 'unknown')}
- Card: ****{tx.get('cardLast4', '0000')}
- Time: {datetime.utcnow().strftime('%H:%M:%S UTC')}

ML Model Scores:
- Isolation Forest: {ml_results.get('isolationScore', 0):.3f} (anomaly score)
- Autoencoder: {ml_results.get('autoencoderError', 0):.3f} (reconstruction error)
- Velocity Analyzer: {ml_results.get('velocityScore', 0):.3f}
- Gaussian Profile: {ml_results.get('mahalanobisDistance', 0):.3f}
- Composite Risk: {ml_results.get('riskScore', 0):.3f} ({ml_results.get('riskScore', 0) * 100:.1f}%)

Initial Action: {ml_results.get('action', 'MONITOR')}

Based on your specialized role, assess this transaction and provide your recommendation."""


async def get_agent_reasoning(tx: Dict[str, Any], ml_results: Dict[str, Any]) -> str:
    """Get enhanced reasoning from Claude. Falls back to ML-only reasoning if API not available."""
    if not ANTHROPIC_AVAILABLE or anthropic_client is None:
        return ml_results.get("agentReasoning", "ML pipeline decision.")

    try:
        composite_score = ml_results.get("riskScore", 0)
        action = ml_results.get("action", "MONITOR")

        prompt = _build_agent_prompt(tx, ml_results, "Senior Fraud Analyst")

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            system=[
                {
                    "type": "text",
                    "text": PAKISTAN_FRAUD_CONTEXT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": f"{prompt}\n\nProvide a concise 1-2 sentence reasoning for the {action} decision. Be specific about the fraud signal.",
                }
            ],
        )
        return response.content[0].text.strip()
    except Exception:
        return ml_results.get("agentReasoning", "ML pipeline decision.")
