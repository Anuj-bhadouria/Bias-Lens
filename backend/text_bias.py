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
# Expanded keyword set for realistic detection accuracy

BIAS_KEYWORDS = {
    "gender": [
        "manpower", "mankind", "chairman", "chairwoman", "stewardess", "fireman",
        "policeman", "policewoman", "he or she", "his or her", "girls", "guys",
        "ladies", "gentlemen", "male nurse", "female doctor", "mothering",
        "fathering", "strong man", "ninja", "rockstar", "guru", "wizard",
        "housewife", "househusband", "man hours", "man-hours", "manmade",
        "man-made", "craftsman", "businessman", "sportsmanship", "brotherhood",
        "sisterhood", "motherhood", "fatherhood", "he'll", "his/her",
        "dominant", "aggressive", "assertive men", "emotional women",
        "female engineer", "male secretary",
    ],
    "age": [
        "young and dynamic", "digital native", "recent graduate", "energetic",
        "fresh", "youthful", "mature", "overqualified", "seasoned", "young",
        "entry level only", "new grad", "millennials", "gen z", "boomers",
        "retirement age", "older workers", "2-5 years experience", "up to 3 years",
        "high energy", "go-getter", "fast-paced environment", "early career",
        "no experience necessary", "junior candidate",
    ],
    "racial": [
        "urban", "articulate", "exotic", "thug", "ghetto", "inner-city",
        "illegal alien", "anchor baby", "oriental", "colored", "ethnic",
        "minority hire", "token", "diverse candidate", "whiteboard",
        "culture fit", "familiar face",
    ],
    "socioeconomic": [
        "blue collar", "white collar", "low-income", "underprivileged",
        "welfare", "food stamps", "bootstraps", "self-made", "ivy league",
        "elite school", "top school",
    ],
    "ableist": [
        "crazy", "insane", "lame", "blind to", "deaf to", "crippled",
        "wheelchair-bound", "suffers from", "confined to", "mentally ill",
        "psycho", "schizo", "retarded", "dumb", "idiot", "moron",
        "able-bodied", "disability", "handicapped", "special needs",
    ],
    "nationality": [
        "american only", "us citizens only", "native english speaker",
        "local candidates", "no visa sponsorship", "greencard required",
        "must be fluent in american english",
    ],
}

SEVERITY_MAP = {
    "gender": "high",
    "racial": "high",
    "age": "medium",
    "socioeconomic": "medium",
    "ableist": "high",
    "nationality": "medium",
}


def _keyword_detect(text: str) -> dict:
    """Keyword-based bias detector — used as fallback or enhancement."""
    text_lower = text.lower()
    found_words = []
    found_categories = []

    for category, keywords in BIAS_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                if kw not in found_words:
                    found_words.append(kw)
                if category not in found_categories:
                    found_categories.append(category)

    is_biased = len(found_words) > 0
    severity = "none"
    if found_categories:
        severities = [SEVERITY_MAP.get(c, "low") for c in found_categories]
        severity = "high" if "high" in severities else "medium"

    # Compute a realistic score: scale by number of flagged words vs text length
    word_count = max(len(text.split()), 1)
    raw_score = min(len(found_words) / max(word_count / 10, 1), 1.0)
    # Ensure at least 0.3 if any bias found (so frontend shows it clearly)
    if is_biased and raw_score < 0.3:
        raw_score = 0.3 + len(found_words) * 0.05

    # Debias: wrap flagged words
    debiased = text
    for w in found_words:
        pattern = re.compile(re.escape(w), re.IGNORECASE)
        debiased = pattern.sub(f"[FLAGGED: {w.upper()}]", debiased)

    return {
        "is_biased": is_biased,
        "bias_score": round(min(raw_score, 1.0), 4),
        "categories": found_categories,
        "biased_words": found_words,
        "severity": severity,
        "debiased_text": debiased if is_biased else text,
        "method": "keyword_fallback",
    }


# ── DBias-powered analysis ────────────────────────────────────────────────────

def _dbias_detect(text: str) -> dict:
    """Use DBias library for ML-based bias analysis, enhanced with keyword layer."""
    try:
        # Classify: returns label + score
        classification = classify_bias(text)
        label = classification.get("label", "Non-biased")
        score = float(classification.get("score", 0.0))

        # DBias sometimes gives low confidence on biased text — boost with keywords
        kw_result = _keyword_detect(text)

        # Combine: use DBias label but take max score
        is_biased_dbias = label.lower() != "non-biased"
        is_biased = is_biased_dbias or kw_result["is_biased"]
        final_score = max(score if is_biased_dbias else 0.0, kw_result["bias_score"])

        # Identify biased words — merge DBias + keyword
        try:
            bias_words_raw = identify_bias_words(text) or []
            dbias_words = [w["word"] for w in bias_words_raw if isinstance(w, dict) and "word" in w]
        except Exception:
            dbias_words = []
        biased_words = list(dict.fromkeys(dbias_words + kw_result["biased_words"]))  # dedupe

        # Debiased text
        try:
            debiased = debias_text(text) if is_biased_dbias else kw_result["debiased_text"]
        except Exception:
            debiased = kw_result["debiased_text"]

        # Categories from keywords (DBias doesn't give categories)
        categories = kw_result["categories"]
        if is_biased_dbias and label not in categories:
            categories = [label] + categories

        # Severity from combined score
        if final_score >= 0.6:
            severity = "high"
        elif final_score >= 0.3:
            severity = "medium"
        elif is_biased:
            severity = "low"
        else:
            severity = "none"

        return {
            "is_biased": is_biased,
            "bias_score": round(final_score, 4),
            "categories": categories,
            "biased_words": biased_words,
            "severity": severity,
            "debiased_text": debiased if is_biased else text,
            "method": "dbias+keywords",
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
            method: "dbias+keywords" | "keyword_fallback" | "none",
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


# Legacy alias (some callers use analyze_text)
def analyze_text(text: str) -> dict:
    return analyze_text_bias(text)


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
        "Looking for a rockstar ninja developer who is a culture fit.",
    ]

    for s in samples:
        r = analyze_text_bias(s)
        print(f"\nText : {s[:70]}...")
        print(f"Biased: {r['is_biased']} | Score: {r['bias_score']} | Severity: {r['severity']}")
        print(f"Words : {r['biased_words']}")