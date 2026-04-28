"""
main.py — BiasLens FastAPI backend
Routes:
  GET  /                        health check
  GET  /cases                   list 3 preloaded cases
  GET  /audit/{case_id}         run full audit on named case
  POST /audit/upload            run audit on user CSV
  POST /text-bias               DBias text analysis
  POST /chat                    Gemini chat
  GET  /counterfactual/{case_id} counterfactual for named case
  GET  /jobs/bias               fetch live jobs + run bias analysis
  GET  /compliance/{case_id}    generate compliance report for named case
"""

import os
import tempfile
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from bias_engine import run_audit, CASE_CONFIG
from fairrank import compute_fairrank

load_dotenv()

# ---------------------------------------------------------------------------
# APP INIT
# ---------------------------------------------------------------------------

app = FastAPI(title="BiasLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten before prod
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# LAZY IMPORTS — heavy models load only when first called
# ---------------------------------------------------------------------------

_gemini = None
_text_bias = None
_adzuna = None


def get_gemini():
    global _gemini
    if _gemini is None:
        from groq_layer import GroqLayer
        _gemini = GroqLayer()
    return _gemini


def get_text_bias():
    global _text_bias
    if _text_bias is None:
        from text_bias import analyze_text
        _text_bias = analyze_text
    return _text_bias


def get_adzuna():
    global _adzuna
    if _adzuna is None:
        import adzuna as _az
        _adzuna = _az
    return _adzuna


# ---------------------------------------------------------------------------
# SCHEMAS
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    case_id: str
    message: str
    audit_context: Optional[dict] = None


class TextBiasRequest(BaseModel):
    text: str


class UploadConfig(BaseModel):
    label_col: str
    protected_col: str
    privileged_val: str
    favorable_val: str
    dataset_name: Optional[str] = "Custom Upload"


# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------

@app.get("/")
def health():
    return {"status": "ok", "service": "BiasLens API", "version": "1.0.0"}


@app.get("/cases")
def list_cases():
    """Return metadata for 3 preloaded case files with dynamic fairrank score."""
    cases = []
    
    # Do a lazy import of run_audit to just get the initial fairrank computations quickly
    from bias_engine import run_audit

    for cfg_id, cfg in CASE_CONFIG.items():
        score = 0
        try:
            # this computes metrics locally on standard csvs very fast (<100ms)
            res = run_audit(cfg_id)
            score = res.get("fairrank", {}).get("score", 0)
        except Exception:
            pass
            
        cases.append({
            "id": cfg_id,
            "name": cfg["name"],
            "icon": "⚖️" if cfg_id == "compas" else "💼" if cfg_id == "adult" else "🏥",
            "tag": "CRIMINAL JUSTICE" if cfg_id == "compas" else "CENSUS MODEL" if cfg_id == "adult" else "CARE ALLOCATION",
            "description": cfg["description"],
            "protected_attribute": cfg["protected_attribute"],
            "score": score
        })
    return {"cases": cases}


@app.get("/audit/{case_id}")
def audit_case(case_id: str):
    """Run full bias audit on a named preloaded case."""
    if case_id not in CASE_CONFIG:
        raise HTTPException(status_code=404, detail=f"Unknown case: {case_id}")

    try:
        result = run_audit(case_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Attach Gemini fields (all optional — never fail the audit if Gemini is down)
    try:
        gemini = get_gemini()

        # Plain-text explanation
        result["gemini_explanation"] = gemini.explain_audit(result)

        # Bias genealogy pipeline (list of {stage, impact, bias})
        result["bias_genealogy"] = gemini.generate_bias_genealogy(result)

        # Counterfactual Q&A — attach question + answer into the counterfactual dict
        cf = result.get("counterfactual")
        if cf and "error" not in cf:
            qa = gemini.generate_counterfactual_qa(
                case_id=case_id,
                counterfactual=cf,
                config=CASE_CONFIG[case_id],
            )
            result["counterfactual"]["question"] = qa["question"]
            result["counterfactual"]["answer"] = qa["answer"]

    except Exception as ex:
        # Ensure the audit still returns even if Gemini calls fail
        result.setdefault("gemini_explanation", None)
        result.setdefault("bias_genealogy", [])

    # Flatten fairrank_score to top level for convenience (keep nested too)
    result["fairrank_score"] = result["fairrank"]["score"]

    return result


@app.post("/audit/upload")
async def audit_upload(
    file: UploadFile = File(...),
    label_col: str = Form(...),
    protected_col: str = Form(...),
    privileged_val: str = Form(...),
    favorable_val: str = Form(...),
    dataset_name: str = Form("Custom Upload"),
):
    """Accept CSV upload, run bias audit, return results."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted.")

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    upload_config = {
        "label_col": label_col,
        "protected_col": protected_col,
        "privileged_val": privileged_val,
        "favorable_val": favorable_val,
        "dataset_name": dataset_name,
    }

    try:
        result = run_audit("upload", csv_path=tmp_path, upload_config=upload_config)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

    os.unlink(tmp_path)

    try:
        gemini = get_gemini()
        result["gemini_explanation"] = gemini.explain_audit(result)
    except Exception:
        result["gemini_explanation"] = None

    # Flatten for frontend
    result["fairrank_score"] = result["fairrank"]["score"]

    return result


@app.post("/analyze/text")
def text_bias(req: TextBiasRequest):
    """Run DBias on pasted text. Returns score, highlights, debiased version."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty.")

    try:
        from text_bias import analyze_text_bias
        result = analyze_text_bias(req.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


@app.post("/chat")
def chat(req: ChatRequest):
    """Gemini chat endpoint. Passes audit context + user message."""
    try:
        gemini = get_gemini()
        reply = gemini.chat(
            case_id=req.case_id,
            message=req.message,
            audit_context=req.audit_context,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"reply": reply}


@app.get("/counterfactual/{case_id}")
def counterfactual(case_id: str):
    """Return counterfactual analysis for named case."""
    if case_id not in CASE_CONFIG:
        raise HTTPException(status_code=404, detail=f"Unknown case: {case_id}")

    try:
        result = run_audit(case_id)
        cf = result.get("counterfactual")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not cf:
        raise HTTPException(status_code=500, detail="Counterfactual computation failed.")

    # Attach Gemini explanation
    try:
        gemini = get_gemini()
        cf["gemini_explanation"] = gemini.explain_counterfactual(
            case_id=case_id,
            counterfactual=cf,
            config=CASE_CONFIG[case_id],
        )
    except Exception:
        cf["gemini_explanation"] = None

    return cf


@app.get("/jobs/bias")
def jobs_bias(query: str = "software engineer", country: str = "us", n: int = 10):
    """
    Fetch live job listings from Adzuna and run text bias analysis on each.
    Returns a flat list of jobs with bias fields at top level.
    """
    try:
        az = get_adzuna()
        result = az.analyze_jobs_bias(
            query=query,
            country=country,
            results_per_page=n,
        )
    except EnvironmentError as e:
        raise HTTPException(status_code=503, detail=f"Adzuna credentials missing: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Flatten each job: merge bias sub-dict fields to top level
    flattened = []
    for job in result.get("jobs", []):
        bias = job.pop("bias", {}) or {}
        flat_job = {
            **job,
            "bias_score": bias.get("bias_score", 0.0),
            "biased_words": bias.get("biased_words", []),
            "categories": bias.get("categories", []),
            "severity": bias.get("severity", "none"),
            "is_biased": bias.get("is_biased", False),
        }
        flattened.append(flat_job)

    return flattened


@app.get("/compliance/{case_id}")
def compliance_report(case_id: str):
    """Generate an EU AI Act + EEOC compliance report for a named case."""
    if case_id not in CASE_CONFIG:
        raise HTTPException(status_code=404, detail=f"Unknown case: {case_id}")

    try:
        result = run_audit(case_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        gemini = get_gemini()
        report_markdown = gemini.generate_compliance_report(result)
    except Exception as e:
        report_markdown = f"[Compliance report unavailable: {e}]"

    return {
        "case_id": case_id,
        "case_name": result.get("case_name", case_id),
        "fairrank_score": result["fairrank"]["score"],
        "fairrank_label": result["fairrank"]["label"],
        "report_markdown": report_markdown,
    }