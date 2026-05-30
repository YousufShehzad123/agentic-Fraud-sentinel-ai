import random
import string
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Easypaisa / JazzCash Pakistan context
CITIES = [
    "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar",
    "Quetta", "Faisalabad", "Multan", "Hyderabad", "Sialkot",
    "Gujranwala", "Bahawalpur", "Sargodha", "Sukkur", "Abbottabad",
]

INTERNATIONAL_CITIES = [
    "Dubai, UAE", "Riyadh, KSA", "London, UK", "New York, USA",
    "Lagos, Nigeria", "Kabul, Afghanistan", "Delhi, India",
]

MERCHANTS = {
    "telecom": [
        "Jazz Top-Up", "Telenor Top-Up", "Ufone Top-Up", "Zong Top-Up",
        "Jazz Cash Transfer", "Easypaisa Transfer",
    ],
    "utilities": [
        "K-Electric", "LESCO", "IESCO", "MEPCO", "PESCO", "HESCO",
        "SNGPL", "SSGC", "PTCL Bill", "StormFiber",
    ],
    "food": [
        "Foodpanda PK", "Careem Food", "Cheetay", "KFC Pakistan",
        "McDonald's PK", "Pizza Hut PK", "Hardee's", "Burger King PK",
    ],
    "transport": [
        "Careem", "inDrive", "Bykea", "Pakistan Railways", "PIA Ticket",
    ],
    "ecommerce": [
        "Daraz.pk", "Telemart", "iShopping", "Yayvo", "Goto.com.pk",
    ],
    "finance": [
        "HBL", "Meezan Bank", "MCB Bank", "UBL", "Bank Alfalah",
        "Faysal Bank", "NBP", "Allied Bank", "Askari Bank",
    ],
    "retail": [
        "Metro Cash & Carry", "Carrefour PK", "Imtiaz Super Market",
        "Chase Up", "Hyperstar", "Al-Fatah",
    ],
    "suspicious": [
        "Unknown Merchant", "Overseas FX Transfer", "Crypto Exchange",
        "Wire Transfer Service", "International Remittance",
    ],
}

CATEGORIES = list(MERCHANTS.keys())

USERS = [f"user_{i:03d}" for i in range(1, 21)]  # 20 synthetic users
CARDS = ["0042", "1234", "2468", "3456", "5678", "7890", "9012", "4321"]
DEVICES = {user: f"dev_{user}_primary" for user in USERS}

# Fraud patterns specific to Pakistani mobile wallets
FRAUD_PATTERNS = [
    "sim_swap",           # SIM swap attack — new device for existing number
    "otp_theft",          # Fraudster obtained OTP via social engineering
    "structuring",        # Multiple small transactions to avoid detection
    "dormant_spike",      # Dormant account suddenly active
    "card_testing",       # Small amounts to test stolen card
    "account_takeover",   # Multiple failed logins then success
    "round_trip",         # Money sent & quickly returned (mule network)
]


def gen_tx_id() -> str:
    ts = int(time.time() * 1000)
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"EP{ts}{suffix}"


def gen_ip() -> str:
    # Mix of Pakistani ISP ranges and suspicious foreign IPs
    if random.random() < 0.15:
        return f"{random.randint(41, 45)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
    return f"{random.randint(100, 200)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"


def generate_normal_transaction(user_id: str) -> Dict[str, Any]:
    category = random.choice(CATEGORIES[:-1])  # exclude suspicious
    merchant_list = MERCHANTS[category]
    merchant = random.choice(merchant_list)

    if category == "telecom":
        amount = random.choice([100, 200, 300, 500, 1000, 1500])  # PKR top-up amounts
    elif category == "utilities":
        amount = round(random.uniform(800, 8000), 2)
    elif category == "food":
        amount = round(random.uniform(300, 3000), 2)
    elif category == "transport":
        amount = round(random.uniform(150, 1500), 2)
    elif category == "ecommerce":
        amount = round(random.uniform(500, 50000), 2)
    elif category == "finance":
        amount = round(random.uniform(1000, 100000), 2)
    else:
        amount = round(random.uniform(200, 20000), 2)

    city = random.choice(CITIES)
    device_id = DEVICES.get(user_id, f"dev_{user_id}_primary")

    return {
        "transactionId": gen_tx_id(),
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "cardLast4": random.choice(CARDS),
        "userId": user_id,
        "location": city,
        "ipAddress": gen_ip(),
        "deviceId": device_id,
    }


def generate_fraud_transaction(user_id: str, pattern: str) -> Dict[str, Any]:
    tx = generate_normal_transaction(user_id)

    if pattern == "sim_swap":
        tx["deviceId"] = f"dev_unknown_{random.randint(1000, 9999)}"
        tx["location"] = random.choice(INTERNATIONAL_CITIES)
        tx["amount"] = round(random.uniform(50000, 200000), 2)
        tx["merchant"] = "Overseas FX Transfer"
        tx["category"] = "suspicious"

    elif pattern == "otp_theft":
        tx["location"] = random.choice(INTERNATIONAL_CITIES)
        tx["amount"] = round(random.uniform(20000, 150000), 2)
        tx["merchant"] = random.choice(MERCHANTS["finance"])
        tx["category"] = "finance"
        tx["ipAddress"] = f"{random.randint(41, 250)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"

    elif pattern == "structuring":
        tx["amount"] = round(random.uniform(4500, 9900), 2)
        tx["merchant"] = "Jazz Cash Transfer"
        tx["category"] = "telecom"

    elif pattern == "dormant_spike":
        tx["amount"] = round(random.uniform(80000, 500000), 2)
        tx["merchant"] = "International Remittance"
        tx["category"] = "suspicious"
        tx["location"] = random.choice(INTERNATIONAL_CITIES)

    elif pattern == "card_testing":
        tx["amount"] = round(random.uniform(1, 50), 2)
        tx["merchant"] = random.choice(MERCHANTS["ecommerce"])
        tx["category"] = "ecommerce"

    elif pattern == "account_takeover":
        tx["deviceId"] = f"dev_atk_{random.randint(1000, 9999)}"
        tx["ipAddress"] = f"{random.randint(41, 250)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        tx["amount"] = round(random.uniform(30000, 200000), 2)
        tx["location"] = random.choice(INTERNATIONAL_CITIES + CITIES[-3:])

    elif pattern == "round_trip":
        tx["amount"] = round(random.uniform(10000, 100000), 2)
        tx["merchant"] = "Easypaisa Transfer"
        tx["category"] = "telecom"

    else:
        tx["merchant"] = "Unknown Merchant"
        tx["category"] = "suspicious"
        tx["amount"] = round(random.uniform(50000, 300000), 2)
        tx["location"] = random.choice(INTERNATIONAL_CITIES)

    return tx


def generate_single(fraud_ratio: float = 0.25) -> Dict[str, Any]:
    user_id = random.choice(USERS)
    if random.random() < fraud_ratio:
        return generate_fraud_transaction(user_id, random.choice(FRAUD_PATTERNS))
    return generate_normal_transaction(user_id)


def generate_batch(count: int, fraud_ratio: float) -> List[Dict[str, Any]]:
    transactions = []
    fraud_count = int(count * fraud_ratio)
    normal_count = count - fraud_count

    users = random.choices(USERS, k=count)

    for i in range(normal_count):
        tx = generate_normal_transaction(users[i])
        transactions.append(tx)

    for i in range(fraud_count):
        pattern = random.choice(FRAUD_PATTERNS)
        tx = generate_fraud_transaction(users[normal_count + i], pattern)
        transactions.append(tx)

    random.shuffle(transactions)
    return transactions
