"""
text_bias.py — BiasLens Text Bias Module
Uses DBias for bias detection and classification in text.
Falls back to keyword-based detection if DBias is unavailable.
"""

import re
from typing import Optional

# --- DBias import (graceful fallback) ---
try:
    from dbias import classify_bias, debias_text, identify_bias_words
    DBIAS_AVAILABLE = True
except ImportError:
    DBIAS_AVAILABLE = False
    print("[text_bias] DBias not available — using keyword fallback mode.")


# ── Fallback: bias-keyword lists ──────────────────────────────────────────────

BIAS_KEYWORDS = {
    "gender": [
        "manpower", "mankind", "chairman", "stewardess", "fireman", "policeman",
        "he or she", "his or her", "girls", "guys", "ladies", "gentlemen",
        "male nurse", "female doctor", "mothering", "fathering",
    ],
    "racial": [
        "urban", "articulate", "exotic", "thug", "ghetto", "inner-city",
        "illegal alien", "anchor baby", "oriental", "colored",
    ],
    "age": [
        "young and dynamic", "digital native", "recent graduate", "energetic",
        "fresh", "youthful", "mature", "overqualified", "seasoned",
    ],
    "socioeconomic": [
        "blue collar", "white collar", "low-income", "underprivileged",
        "welfare", "food stamps",
    ],
    "ableist": [
        "crazy", "insane", "lame", "blind to", "deaf to", "crippled",
        "wheelchair-bound", "suffers from", "confined to",
    ],
}

SEVERITY_MAP = {
    "gender": "high",
    "racial": "high",
    "age": "medium",
    "socioeconomic": "medium",
    "ableist": "high",
}


def _keyword_detect(text: str) -> dict:
    """Fallback keyword-based bias detector."""
    text_lower = text.lower()
    found_words = []
    found_categories = []

    for category, keywords in BIAS_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found_words.append(kw)
                if category not in found_categories:
                    found_categories.append(category)

    is_biased = len(found_words) > 0
    severity = "none"
    if found_categories:
        # Worst severity wins
        severities = [SEVERITY_MAP.get(c, "low") for c in found_categories]
        severity = "high" if "high" in severities else "medium"

    # Naive debias: wrap flagged words in [FLAGGED: ...]
    debiased = text
    for w in found_words:
        pattern = re.compile(re.escape(w), re.IGNORECASE)
        debiased = pattern.sub(f"[FLAGGED: {w}]", debiased)

    return {
        "is_biased": is_biased,
        "bias_score": round(len(found_words) / max(len(text.split()), 1), 4),
        "categories": found_categories,
        "biased_words": found_words,
        "severity": severity,
        "debiased_text": debiased if is_biased else text,
        "method": "keyword_fallback",
    }


# ── DBias-powered analysis ────────────────────────────────────────────────────

def _dbias_detect(text: str) -> dict:
    """Use DBias library for full ML-based bias analysis."""
    try:
        # Classify: returns label + score
        classification = classify_bias(text)
        label = classification.get("label", "Non-biased")
        score = classification.get("score", 0.0)
        is_biased = label.lower() != "non-biased"

        # Identify biased words
        bias_words_raw = identify_bias_words(text) or []
        biased_words = [w["word"] for w in bias_words_raw if isinstance(w, dict)]

        # Debias
        debiased = debias_text(text) if is_biased else text

        # Derive severity from score
        if score >= 0.8:
            severity = "high"
        elif score >= 0.5:
            severity = "medium"
        elif is_biased:
            severity = "low"
        else:
            severity = "none"

        return {
            "is_biased": is_biased,
            "bias_score": round(float(score), 4),
            "categories": [label] if is_biased else [],
            "biased_words": biased_words,
            "severity": severity,
            "debiased_text": debiased,
            "method": "dbias",
        }

    except Exception as e:
        print(f"[text_bias] DBias error: {e} — falling back to keywords.")
        return _keyword_detect(text)


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_text_bias(text: str) -> dict:
    """
    Main entry point. Analyzes text for bias.

    Returns:
        {
            is_biased: bool,
            bias_score: float (0-1),
            categories: list[str],
            biased_words: list[str],
            severity: "none" | "low" | "medium" | "high",
            debiased_text: str,
            method: "dbias" | "keyword_fallback",
            word_count: int,
            sentence_count: int,
        }
    """
    if not text or not text.strip():
        return {
            "is_biased": False,
            "bias_score": 0.0,
            "categories": [],
            "biased_words": [],
            "severity": "none",
            "debiased_text": "",
            "method": "none",
            "word_count": 0,
            "sentence_count": 0,
        }

    result = _dbias_detect(text) if DBIAS_AVAILABLE else _keyword_detect(text)

    # Add text stats
    result["word_count"] = len(text.split())
    result["sentence_count"] = len(re.split(r'[.!?]+', text.strip()))

    return result


def analyze_bulk(texts: list[str]) -> list[dict]:
    """Analyze a list of texts (e.g. job postings). Returns list of results."""
    return [analyze_text_bias(t) for t in texts]


def summary_stats(results: list[dict]) -> dict:
    """Aggregate stats over a list of analyze_text_bias results."""
    if not results:
        return {}

    total = len(results)
    biased_count = sum(1 for r in results if r["is_biased"])
    avg_score = sum(r["bias_score"] for r in results) / total

    # Category frequency
    cat_freq: dict[str, int] = {}
    for r in results:
        for c in r.get("categories", []):
            cat_freq[c] = cat_freq.get(c, 0) + 1

    return {
        "total_analyzed": total,
        "biased_count": biased_count,
        "bias_rate": round(biased_count / total, 4),
        "avg_bias_score": round(avg_score, 4),
        "category_frequency": cat_freq,
        "severity_breakdown": {
            "high": sum(1 for r in results if r.get("severity") == "high"),
            "medium": sum(1 for r in results if r.get("severity") == "medium"),
            "low": sum(1 for r in results if r.get("severity") == "low"),
            "none": sum(1 for r in results if r.get("severity") == "none"),
        },
    }


# ── Quick test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    samples = [
        "We are looking for a young and dynamic candidate who is a digital native.",
        "The chairman will address all manpower concerns at the meeting.",
        "We welcome applicants of all backgrounds to apply for this role.",
    ]

    for s in samples:
        r = analyze_text_bias(s)
        print(f"\nText : {s[:60]}...")
        print(f"Biased: {r['is_biased']} | Score: {r['bias_score']} | Severity: {r['severity']}")
        print(f"Words : {r['biased_words']}")
        print(f"Fix   : {r['debiased_text'][:80]}")