"""
fairrank.py — FairRank Score computation
Standalone module. bias_engine.py also has inline version;
this is the canonical one used by main.py directly.
"""

import math


# ---------------------------------------------------------------------------
# THRESHOLDS
# ---------------------------------------------------------------------------

THRESHOLDS = {
    "demographic_parity_difference": {"limit": 0.1, "penalty": 30},
    "equalized_odds_difference":     {"limit": 0.1, "penalty": 25},
    "disparate_impact":              {"limit": 0.8, "penalty": 25},  # < 0.8 is bad
    "false_positive_rate_gap":       {"limit": 0.1, "penalty": 20},
}


# ---------------------------------------------------------------------------
# CORE
# ---------------------------------------------------------------------------

def _safe_get(d, key, default):
    val = d.get(key, default)
    if val is None or (isinstance(val, (float, int)) and math.isnan(float(val))):
        return default
    return float(val)

def compute_fairrank(metrics: dict) -> dict:
    """
    Input:  metrics dict (from bias_engine.compute_metrics)
    Output: { score, label, color, penalties, max_possible_penalty }

    FairRank = 100 - sum(penalties for triggered thresholds)
    Clamped to [0, 100].
    """
    m = metrics.get("metrics", {})
    score = 100
    penalties = []

    # Demographic Parity Difference
    raw_dpd = _safe_get(m, "demographic_parity_difference", 0.0)
    dpd = abs(raw_dpd)
    if dpd > THRESHOLDS["demographic_parity_difference"]["limit"]:
        p = THRESHOLDS["demographic_parity_difference"]["penalty"]
        score -= p
        penalties.append({
            "metric": "Demographic Parity Difference",
            "value": round(raw_dpd, 4),
            "threshold": f"> {THRESHOLDS['demographic_parity_difference']['limit']}",
            "penalty": -p,
            "interpretation": "Privileged group receives favorable outcome at significantly higher rate.",
        })

    # Equalized Odds Difference
    raw_eod = _safe_get(m, "equalized_odds_difference", 0.0)
    eod = abs(raw_eod)
    if eod > THRESHOLDS["equalized_odds_difference"]["limit"]:
        p = THRESHOLDS["equalized_odds_difference"]["penalty"]
        score -= p
        penalties.append({
            "metric": "Equalized Odds Difference",
            "value": round(raw_eod, 4),
            "threshold": f"> {THRESHOLDS['equalized_odds_difference']['limit']}",
            "penalty": -p,
            "interpretation": "Model error rates differ significantly across groups.",
        })

    # Disparate Impact (lower = worse, threshold is a floor not ceiling)
    di = _safe_get(m, "disparate_impact", 1.0)
    if di < THRESHOLDS["disparate_impact"]["limit"]:
        p = THRESHOLDS["disparate_impact"]["penalty"]
        score -= p
        penalties.append({
            "metric": "Disparate Impact",
            "value": round(di, 4),
            "threshold": f"< {THRESHOLDS['disparate_impact']['limit']}",
            "penalty": -p,
            "interpretation": "Unprivileged group receives favorable outcome at less than 80% the rate of privileged group. Violates the 80% rule.",
        })

    # False Positive Rate Gap
    raw_fpr_gap = _safe_get(m, "false_positive_rate_gap", 0.0)
    fpr_gap = abs(raw_fpr_gap)
    if fpr_gap > THRESHOLDS["false_positive_rate_gap"]["limit"]:
        p = THRESHOLDS["false_positive_rate_gap"]["penalty"]
        score -= p
        penalties.append({
            "metric": "False Positive Rate Gap",
            "value": round(raw_fpr_gap, 4),
            "threshold": f"> {THRESHOLDS['false_positive_rate_gap']['limit']}",
            "penalty": -p,
            "interpretation": "One group flagged as high-risk far more often when they are not. Disproportionate false accusations.",
        })

    score = max(0, score)

    # Label + color
    if score >= 80:
        label, color = "Low Bias", "green"
    elif score >= 50:
        label, color = "Moderate Bias", "amber"
    else:
        label, color = "High Bias", "red"

    # Pre-deployment gate verdict
    gate_pass = score >= 80

    return {
        "score": score,
        "label": label,
        "color": color,
        "gate_pass": gate_pass,
        "gate_verdict": "PASS" if gate_pass else "FAIL",
        "penalties": penalties,
        "penalties_total": sum(abs(p["penalty"]) for p in penalties),
        "max_possible_penalty": 100,
    }


# ---------------------------------------------------------------------------
# SCORE ONLY — lightweight, used by what-if simulator
# ---------------------------------------------------------------------------

def score_only(dpd: float, eod: float, di: float, fpr_gap: float) -> int:
    """
    Compute FairRank score from raw metric values.
    Used by What-If simulator (Tier 3) for live slider updates.
    """
    score = 100
    if abs(dpd) > 0.1:   score -= 30
    if abs(eod) > 0.1:   score -= 25
    if di < 0.8:          score -= 25
    if abs(fpr_gap) > 0.1: score -= 20
    return max(0, score)