#!/usr/bin/env python3
"""
Gemini 402 Payment Required fallback monitor.
Detects HTTP 402 errors from Gemini API and creates fallback marker.
Part of Day 4 cycle (04.10.2026): unblock image caption jury verdicts.
"""

import os
import json
import time
from datetime import datetime, timedelta

GEMINI_ERROR_LOG = "/tmp/gemini_402_errors.log"
GEMINI_LEER_MARKER = "/tmp/gemini_leer"
MARKER_VALID_HOURS = 6

def check_gemini_errors():
    """Parse Gemini error log and detect 402 Payment Required."""
    if not os.path.exists(GEMINI_ERROR_LOG):
        return False

    try:
        with open(GEMINI_ERROR_LOG, "r") as f:
            content = f.read()
            return "402" in content and "Payment Required" in content
    except Exception as e:
        print(f"Error reading Gemini error log: {e}")
        return False

def create_fallback_marker():
    """Create /tmp/gemini_leer marker (6h valid)."""
    marker_data = {
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(hours=MARKER_VALID_HOURS)).isoformat(),
        "reason": "Gemini HTTP 402 Payment Required",
        "fallback_models": {
            "text": "openai/gpt-oss-20b",
            "images": "qwen/qwen3.8-27b-Vision"
        }
    }

    try:
        with open(GEMINI_LEER_MARKER, "w") as f:
            json.dump(marker_data, f, indent=2)
        print(f"✅ Created Gemini fallback marker: {GEMINI_LEER_MARKER}")
        return True
    except Exception as e:
        print(f"❌ Error creating fallback marker: {e}")
        return False

def is_marker_valid():
    """Check if fallback marker is still valid."""
    if not os.path.exists(GEMINI_LEER_MARKER):
        return False

    try:
        with open(GEMINI_LEER_MARKER, "r") as f:
            data = json.load(f)
            expires_at = datetime.fromisoformat(data.get("expires_at", ""))
            if expires_at > datetime.utcnow():
                return True
            else:
                os.remove(GEMINI_LEER_MARKER)
                print(f"🗑️ Gemini fallback marker expired, removed.")
                return False
    except Exception as e:
        print(f"Error checking marker: {e}")
        return False

def log_gemini_error(error_code, error_msg):
    """Log Gemini API errors to tracking file."""
    try:
        with open(GEMINI_ERROR_LOG, "a") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] {error_code}: {error_msg}\n")
    except Exception:
        pass

def main():
    """Main watcher loop."""
    marker_exists = is_marker_valid()
    errors_detected = check_gemini_errors()

    if errors_detected and not marker_exists:
        print("⚠️ Gemini HTTP 402 detected, creating fallback marker...")
        create_fallback_marker()
        return True

    if marker_exists:
        print(f"ℹ️ Gemini fallback active (expires in {MARKER_VALID_HOURS}h)")
        return False

    return False

if __name__ == "__main__":
    main()
