"""
fairrank.py — FairRank Score computation
Standalone module. bias_engine.py also has inline version;
this is the canonical one used by main.py directly.
"""


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

def compute_fairrank(metrics: dict) -> dict:
    """
    Input:  metrics dict (from bias_engine.compute_metrics)
    Output: { score, label, color, penalties, max_possible_penalty }

    FairRank = 100 - sum(penalties for triggered thresholds)
    Clamped to [0, 100].
    """
    m = metrics["metrics"]
    score = 100
    penalties = []

    # Demographic Parity Difference
    dpd = abs(m["demographic_parity_difference"])
    if dpd > THRESHOLDS["demographic_parity_difference"]["limit"]:
        p = THRESHOLDS["demographic_parity_difference"]["penalty"]
        score -= p
        penalties.append({
            "metric": "Demographic Parity Difference",
            "value": round(m["demographic_parity_difference"], 4),
            "threshold": f"> {THRESHOLDS['demographic_parity_difference']['limit']}",
            "penalty": -p,
            "interpretation": "Privileged group receives favorable outcome at significantly higher rate.",
        })

    # Equalized Odds Difference
    eod = abs(m["equalized_odds_difference"])
    if eod > THRESHOLDS["equalized_odds_difference"]["limit"]:
        p = THRESHOLDS["equalized_odds_difference"]["penalty"]
        score -= p
        penalties.append({
            "metric": "Equalized Odds Difference",
            "value": round(m["equalized_odds_difference"], 4),
            "threshold": f"> {THRESHOLDS['equalized_odds_difference']['limit']}",
            "penalty": -p,
            "interpretation": "Model error rates differ significantly across groups.",
        })

    # Disparate Impact (lower = worse, threshold is a floor not ceiling)
    di = m["disparate_impact"]
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
    fpr_gap = abs(m["false_positive_rate_gap"])
    if fpr_gap > THRESHOLDS["false_positive_rate_gap"]["limit"]:
        p = THRESHOLDS["false_positive_rate_gap"]["penalty"]
        score -= p
        penalties.append({
            "metric": "False Positive Rate Gap",
            "value": round(m["false_positive_rate_gap"], 4),
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