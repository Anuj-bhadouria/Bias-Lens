"""
bias_engine.py — AIF360 structured data bias computations
Handles: COMPAS, Adult Income, Healthcare (custom JSON), user CSV uploads
"""

import json
import numpy as np
import pandas as pd
from typing import Optional
from pathlib import Path

# AIF360 — BinaryLabelDataset only (avoid CompasDataset/AdultDataset pandas 2.x bug)
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

# AIF360 raw data paths (standard install location)
import aif360
_AIF360_DATA = Path(aif360.__file__).parent / "data" / "raw"


# ---------------------------------------------------------------------------
# CASE CONFIG — maps case_id → AIF360 setup params
# ---------------------------------------------------------------------------

CASE_CONFIG = {
    "compas": {
        "name": "COMPAS Recidivism",
        "protected_attribute": "race",
        "privileged_group": [{"race": 1}],       # Caucasian
        "unprivileged_group": [{"race": 0}],     # African-American
        "favorable_label": 0,                    # 0 = low recidivism risk (good)
        "description": "ProPublica's COMPAS dataset. Algorithm predicted recidivism risk for defendants. Black defendants flagged at 2× the rate of white defendants.",
    },
    "adult": {
        "name": "Adult Income (Census)",
        "protected_attribute": "sex",
        "privileged_group": [{"sex": 1}],        # Male
        "unprivileged_group": [{"sex": 0}],      # Female
        "favorable_label": 1,                    # 1 = income >50K
        "description": "UCI Adult Census dataset. Used in hiring/lending models. Women predicted high income at significantly lower rates than men with equivalent profiles.",
    },
    "healthcare": {
        "name": "Healthcare Resource Allocation",
        "protected_attribute": "race",
        "privileged_group": [{"race": 1}],       # White
        "unprivileged_group": [{"race": 0}],     # Black
        "favorable_label": 1,                    # 1 = referred for extra care
        "description": "Obermeyer et al. (2019). Algorithm used by US hospitals. Black patients assigned lower risk scores → less care, despite being sicker than white patients with same score.",
    },
}


# ---------------------------------------------------------------------------
# LOADERS
# ---------------------------------------------------------------------------

def _force_numeric(df: pd.DataFrame) -> pd.DataFrame:
    """Cast every column to native Python numeric types. Kills StringDtype."""
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna().astype(np.float64)
    return df


def load_compas() -> BinaryLabelDataset:
    """
    Manual loader for COMPAS — bypasses CompasDataset() pandas 2.x bug.
    Source: aif360/data/raw/compas/compas-scores-two-years.csv
    Mirrors what CompasDataset does internally.
    """
    csv_path = _AIF360_DATA / "compas" / "compas-scores-two-years.csv"
    df = pd.read_csv(str(csv_path), index_col=None)

    # Same filters AIF360 applies internally
    df = df[
        (df["days_b_screening_arrest"] <= 30) &
        (df["days_b_screening_arrest"] >= -30) &
        (df["is_recid"] != -1) &
        (df["c_charge_degree"] != "O") &
        (df["score_text"] != "N/A")
    ].copy()

    # Encode protected attribute: race → 1=Caucasian, 0=African-American (others dropped)
    df = df[df["race"].isin(["Caucasian", "African-American"])].copy()
    df["race"] = (df["race"] == "Caucasian").astype(np.float64)

    # Encode sex: Male=1, Female=0
    df["sex"] = (df["sex"] == "Male").astype(np.float64)

    # Label: two_year_recid — favorable = 0 (did NOT recidivate)
    df["two_year_recid"] = df["two_year_recid"].astype(np.float64)

    # Age buckets
    df["age_cat"] = df["age_cat"].map({
        "Less than 25": 0, "25 - 45": 1, "Greater than 45": 2
    }).fillna(1).astype(np.float64)

    # Charge degree: F=0, M=1
    df["c_charge_degree"] = (df["c_charge_degree"] == "M").astype(np.float64)

    keep_cols = ["race", "sex", "age", "age_cat", "priors_count",
                 "c_charge_degree", "two_year_recid"]
    df = df[keep_cols].dropna()
    df = _force_numeric(df)

    return BinaryLabelDataset(
        df=df,
        label_names=["two_year_recid"],
        protected_attribute_names=["race"],
        favorable_label=0.0,
        unfavorable_label=1.0,
    )


def load_adult() -> BinaryLabelDataset:
    """
    Manual loader for Adult Income — bypasses AdultDataset() pandas 2.x bug.
    Source: aif360/data/raw/adult/adult.data + adult.test
    """
    col_names = [
        "age", "workclass", "fnlwgt", "education", "education-num",
        "marital-status", "occupation", "relationship", "race", "sex",
        "capital-gain", "capital-loss", "hours-per-week",
        "native-country", "income"
    ]

    train_path = _AIF360_DATA / "adult" / "adult.data"
    test_path  = _AIF360_DATA / "adult" / "adult.test"

    df_train = pd.read_csv(str(train_path), header=None, names=col_names,
                           skipinitialspace=True, na_values="?")
    df_test  = pd.read_csv(str(test_path),  header=0,  names=col_names,
                           skipinitialspace=True, na_values="?", skiprows=1)

    df = pd.concat([df_train, df_test], ignore_index=True).dropna()

    # Label: income >50K = 1
    df["income"] = df["income"].str.strip().str.rstrip(".")
    df["income"] = (df["income"] == ">50K").astype(np.float64)

    # Protected attribute: sex → Male=1, Female=0
    df["sex"] = (df["sex"].str.strip() == "Male").astype(np.float64)

    # Race: White=1, else=0
    df["race"] = (df["race"].str.strip() == "White").astype(np.float64)

    # Encode remaining categoricals as integers
    cat_cols = ["workclass", "education", "marital-status",
                "occupation", "relationship", "native-country"]
    for col in cat_cols:
        df[col] = df[col].astype("category").cat.codes.astype(np.float64)

    df = _force_numeric(df)

    return BinaryLabelDataset(
        df=df,
        label_names=["income"],
        protected_attribute_names=["sex"],
        favorable_label=1.0,
        unfavorable_label=0.0,
    )


def load_healthcare() -> BinaryLabelDataset:
    """
    Load healthcare.json from data/ folder.
    Expected columns: age, race (1=White, 0=Black), comorbidities,
                      cost_avoidance_score, label (1=referred, 0=not)
    """
    df = pd.read_json("data/healthcare.json")
    ds = BinaryLabelDataset(
        df=df,
        label_names=["label"],
        protected_attribute_names=["race"],
        favorable_label=1,
        unfavorable_label=0,
    )
    return ds


def load_csv_upload(filepath: str, label_col: str, protected_col: str,
                    privileged_val, favorable_val) -> BinaryLabelDataset:
    """
    Load user-uploaded CSV as BinaryLabelDataset.
    Caller provides: label column, protected attribute column,
                     privileged group value, favorable label value.
    """
    df = pd.read_csv(filepath)

    # Encode protected attribute as binary (privileged=1, rest=0)
    df[protected_col] = (df[protected_col] == privileged_val).astype(int)

    # Encode label as binary (favorable=1, rest=0)
    df[label_col] = (df[label_col] == favorable_val).astype(int)

    ds = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[protected_col],
        favorable_label=1,
        unfavorable_label=0,
    )
    return ds


# ---------------------------------------------------------------------------
# MODEL — trains simple LR to get predictions for ClassificationMetric
# ---------------------------------------------------------------------------

def train_and_predict(dataset: BinaryLabelDataset):
    """
    Train LogisticRegression on dataset, return (dataset_pred).
    dataset_pred is a copy with model predictions as labels.
    """
    X = dataset.features
    y = dataset.labels.ravel()

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(solver="liblinear", max_iter=500, random_state=42)
    model.fit(X_scaled, y)
    y_pred = model.predict(X_scaled)

    dataset_pred = dataset.copy()
    dataset_pred.labels = y_pred.reshape(-1, 1)
    return dataset_pred


# ---------------------------------------------------------------------------
# METRICS COMPUTATION
# ---------------------------------------------------------------------------

def compute_metrics(case_id: str,
                    dataset: Optional[BinaryLabelDataset] = None,
                    dataset_pred: Optional[BinaryLabelDataset] = None,
                    config: Optional[dict] = None) -> dict:
    """
    Compute all bias metrics for a dataset.
    Returns dict ready to be sent as API response.
    """
    cfg = config or CASE_CONFIG[case_id]
    priv = cfg["privileged_group"]
    unpriv = cfg["unprivileged_group"]

    # Dataset-level metrics (no model needed)
    ds_metric = BinaryLabelDatasetMetric(
        dataset,
        privileged_groups=priv,
        unprivileged_groups=unpriv,
    )

    dpd = float(ds_metric.mean_difference())          # Demographic Parity Difference
    di = float(ds_metric.disparate_impact())           # Disparate Impact ratio

    # Classification metrics (needs model predictions)
    clf_metric = ClassificationMetric(
        dataset,
        dataset_pred,
        privileged_groups=priv,
        unprivileged_groups=unpriv,
    )

    eod = float(clf_metric.equalized_odds_difference())
    fpr_gap = float(
        clf_metric.difference(clf_metric.false_positive_rate)
    )
    tpr_priv = float(clf_metric.true_positive_rate(privileged=True))
    tpr_unpriv = float(clf_metric.true_positive_rate(privileged=False))
    fpr_priv = float(clf_metric.false_positive_rate(privileged=True))
    fpr_unpriv = float(clf_metric.false_positive_rate(privileged=False))

    # Group-level favorable outcome rates
    priv_rate = float(
        clf_metric.selection_rate(privileged=True)
    )
    unpriv_rate = float(
        clf_metric.selection_rate(privileged=False)
    )

    return {
        "case_id": case_id,
        "case_name": cfg["name"],
        "protected_attribute": cfg["protected_attribute"],
        "description": cfg["description"],
        "metrics": {
            "demographic_parity_difference": round(dpd, 4),
            "disparate_impact": round(di, 4),
            "equalized_odds_difference": round(eod, 4),
            "false_positive_rate_gap": round(fpr_gap, 4),
            "true_positive_rate_privileged": round(tpr_priv, 4),
            "true_positive_rate_unprivileged": round(tpr_unpriv, 4),
            "false_positive_rate_privileged": round(fpr_priv, 4),
            "false_positive_rate_unprivileged": round(fpr_unpriv, 4),
            "selection_rate_privileged": round(priv_rate, 4),
            "selection_rate_unprivileged": round(unpriv_rate, 4),
        },
    }


# ---------------------------------------------------------------------------
# FAIRRANK SCORE
# ---------------------------------------------------------------------------

def compute_fairrank(metrics: dict) -> dict:
    """
    FairRank = 100 minus penalties based on bias thresholds.
    Returns score + penalty breakdown + label.
    """
    m = metrics["metrics"]
    score = 100
    penalties = []

    if abs(m["demographic_parity_difference"]) > 0.1:
        score -= 30
        penalties.append({
            "rule": "Demographic Parity Difference > 0.1",
            "value": m["demographic_parity_difference"],
            "penalty": -30,
        })

    if abs(m["equalized_odds_difference"]) > 0.1:
        score -= 25
        penalties.append({
            "rule": "Equalized Odds Difference > 0.1",
            "value": m["equalized_odds_difference"],
            "penalty": -25,
        })

    if m["disparate_impact"] < 0.8:
        score -= 25
        penalties.append({
            "rule": "Disparate Impact < 0.8",
            "value": m["disparate_impact"],
            "penalty": -25,
        })

    if abs(m["false_positive_rate_gap"]) > 0.1:
        score -= 20
        penalties.append({
            "rule": "False Positive Rate Gap > 0.1",
            "value": m["false_positive_rate_gap"],
            "penalty": -20,
        })

    score = max(0, score)

    if score >= 80:
        label, color = "Low Bias", "green"
    elif score >= 50:
        label, color = "Moderate Bias", "amber"
    else:
        label, color = "High Bias", "red"

    return {
        "score": score,
        "label": label,
        "color": color,
        "penalties": penalties,
    }


# ---------------------------------------------------------------------------
# COUNTERFACTUAL
# ---------------------------------------------------------------------------

def compute_counterfactual(case_id: str, dataset: BinaryLabelDataset,
                            dataset_pred: BinaryLabelDataset) -> dict:
    """
    Flip protected attribute for ALL samples, re-predict,
    compute approval rate delta.
    Returns: original_approval_rate, flipped_approval_rate, delta.
    """
    cfg = CASE_CONFIG[case_id]
    attr = cfg["protected_attribute"]

    # Find index of protected attribute
    attr_idx = dataset.feature_names.index(attr)

    # Build flipped dataset
    dataset_flipped = dataset.copy()
    dataset_flipped.features[:, attr_idx] = (
        1 - dataset_flipped.features[:, attr_idx]   # flip 0↔1
    )

    # Re-train model on original, predict on flipped
    X_orig = dataset.features
    y_orig = dataset.labels.ravel()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_orig)
    model = LogisticRegression(solver="liblinear", max_iter=500, random_state=42)
    model.fit(X_scaled, y_orig)

    X_flipped_scaled = scaler.transform(dataset_flipped.features)
    y_flipped_pred = model.predict(X_flipped_scaled)
    y_orig_pred = dataset_pred.labels.ravel()

    orig_approval = float(np.mean(y_orig_pred == cfg["favorable_label"]))
    flipped_approval = float(np.mean(y_flipped_pred == cfg["favorable_label"]))
    delta = round(flipped_approval - orig_approval, 4)

    # Focus on unprivileged group → privileged flip
    unpriv_mask = dataset.features[:, attr_idx] == 0
    orig_unpriv = float(np.mean(y_orig_pred[unpriv_mask] == cfg["favorable_label"]))
    flipped_unpriv = float(np.mean(y_flipped_pred[unpriv_mask] == cfg["favorable_label"]))

    return {
        "protected_attribute": attr,
        "unprivileged_group_original_approval": round(orig_unpriv, 4),
        "unprivileged_group_if_privileged_approval": round(flipped_unpriv, 4),
        "approval_delta": round(flipped_unpriv - orig_unpriv, 4),
        "overall_delta": delta,
    }


# ---------------------------------------------------------------------------
# MAIN ENTRY — used by main.py
# ---------------------------------------------------------------------------

def run_audit(case_id: str,
              csv_path: Optional[str] = None,
              upload_config: Optional[dict] = None) -> dict:
    """
    Full audit pipeline for a case or uploaded CSV.
    Returns merged metrics + fairrank + counterfactual.
    """
    # Load dataset
    if case_id == "compas":
        dataset = load_compas()
        config = CASE_CONFIG["compas"]
    elif case_id == "adult":
        dataset = load_adult()
        config = CASE_CONFIG["adult"]
    elif case_id == "healthcare":
        dataset = load_healthcare()
        config = CASE_CONFIG["healthcare"]
    elif case_id == "upload" and csv_path and upload_config:
        dataset = load_csv_upload(
            filepath=csv_path,
            label_col=upload_config["label_col"],
            protected_col=upload_config["protected_col"],
            privileged_val=upload_config["privileged_val"],
            favorable_val=upload_config["favorable_val"],
        )
        config = {
            "name": upload_config.get("dataset_name", "Custom Upload"),
            "protected_attribute": upload_config["protected_col"],
            "privileged_group": [{"race": 1}],
            "unprivileged_group": [{"race": 0}],
            "favorable_label": 1,
            "description": "User-uploaded dataset.",
        }
    else:
        raise ValueError(f"Unknown case_id: {case_id}")

    # Train model + get predictions
    dataset_pred = train_and_predict(dataset)

    # Compute metrics
    metrics = compute_metrics(case_id, dataset, dataset_pred, config)

    # FairRank
    fairrank = compute_fairrank(metrics)

    # Counterfactual (only for named cases with known attribute index)
    counterfactual = None
    if case_id in CASE_CONFIG:
        try:
            counterfactual = compute_counterfactual(case_id, dataset, dataset_pred)
        except Exception as e:
            counterfactual = {"error": str(e)}

    return {
        **metrics,
        "fairrank": fairrank,
        "counterfactual": counterfactual,
    }