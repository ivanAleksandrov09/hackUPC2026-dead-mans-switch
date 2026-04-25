#!/usr/bin/env python3
"""
Mock Lit Protocol MPC node.

Simulates a threshold network participant that holds a timelock_secret.
Reads the on-chain is_dead flag from the dead_mans_switch Solana program;
releases the secret only once the owner is confirmed dead.

Usage:
    python mpc_node.py <owner_pubkey>

Dependencies:
    pip install solana solders
"""

import sys
import struct
from solana.rpc.api import Client
from solders.pubkey import Pubkey

# ── Config ────────────────────────────────────────────────────────────────────

# Hardcoded for demo — in production this would be a Lit Protocol network secret
# shared among multiple MPC nodes with threshold decryption.
TIMELOCK_SECRET = "DEMO_TIMELOCK_SECRET_REPLACE_IN_PROD"

PROGRAM_ID = Pubkey.from_string("DywpuqThb9m9B38XzLPTx8RZGrpY2J6EK1AnrkdWmSSc")
RPC_URL = "https://api.devnet.solana.com"

# ── Anchor account layout for SwitchState ─────────────────────────────────────
# Offset  Size  Field
# 0       8     Anchor discriminator
# 8       32    owner (Pubkey)
# 40      8     last_heartbeat (i64 LE)
# 48      8     deadline_seconds (i64 LE)
# 56      1     is_dead (bool)
ACCOUNT_SIZE = 57
IS_DEAD_OFFSET = 56

# ── Helpers ───────────────────────────────────────────────────────────────────

def find_switch_pda(owner: Pubkey) -> Pubkey:
    pda, _ = Pubkey.find_program_address(
        [b"switch", bytes(owner)],
        PROGRAM_ID,
    )
    return pda


def read_switch_state(owner_pubkey_str: str) -> dict:
    client = Client(RPC_URL)
    owner = Pubkey.from_string(owner_pubkey_str)
    pda = find_switch_pda(owner)

    resp = client.get_account_info(pda)
    if resp.value is None:
        raise RuntimeError(
            f"Switch account not found for owner {owner_pubkey_str}. "
            "Has the vault been initialized on-chain?"
        )

    data = bytes(resp.value.data)
    if len(data) < ACCOUNT_SIZE:
        raise RuntimeError(
            f"Unexpected account data length {len(data)} (expected >= {ACCOUNT_SIZE})"
        )

    last_heartbeat = struct.unpack_from("<q", data, 40)[0]
    deadline_seconds = struct.unpack_from("<q", data, 48)[0]
    is_dead = bool(data[IS_DEAD_OFFSET])

    return {
        "pda": str(pda),
        "last_heartbeat": last_heartbeat,
        "deadline_seconds": deadline_seconds,
        "is_dead": is_dead,
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <owner_pubkey>", file=sys.stderr)
        sys.exit(1)

    owner_pubkey_str = sys.argv[1]

    try:
        state = read_switch_state(owner_pubkey_str)
    except Exception as exc:
        print(f"ERROR reading Solana state: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"[mock-lit] Switch PDA : {state['pda']}")
    print(f"[mock-lit] Last ping  : {state['last_heartbeat']}")
    print(f"[mock-lit] Deadline   : {state['deadline_seconds']}s")
    print(f"[mock-lit] is_dead    : {state['is_dead']}")

    if state["is_dead"]:
        print(f"\nTIMELOCK_SECRET={TIMELOCK_SECRET}")
    else:
        raise RuntimeError(
            "Owner is still alive — timelock_secret withheld. "
            "Call check_status on-chain after the deadline passes."
        )


if __name__ == "__main__":
    main()
