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


def get_gemini():
    global _gemini
    if _gemini is None:
        from gemini_layer import GeminiLayer
        _gemini = GeminiLayer()
    return _gemini


def get_text_bias():
    global _text_bias
    if _text_bias is None:
        from text_bias import analyze_text
        _text_bias = analyze_text
    return _text_bias


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
    """Return metadata for 3 preloaded case files."""
    return {
        "cases": [
            {
                "id": "compas",
                "name": "COMPAS Recidivism",
                "icon": "⚖️",
                "tag": "Criminal Justice",
                "description": CASE_CONFIG["compas"]["description"],
                "protected_attribute": "race",
                "source": "ProPublica, 2016",
            },
            {
                "id": "adult",
                "name": "Adult Income",
                "icon": "💼",
                "tag": "Employment / Lending",
                "description": CASE_CONFIG["adult"]["description"],
                "protected_attribute": "sex",
                "source": "UCI ML Repository",
            },
            {
                "id": "healthcare",
                "name": "Healthcare Allocation",
                "icon": "🏥",
                "tag": "Healthcare",
                "description": CASE_CONFIG["healthcare"]["description"],
                "protected_attribute": "race",
                "source": "Obermeyer et al., Science 2019",
            },
        ]
    }


@app.get("/audit/{case_id}")
def audit_case(case_id: str):
    """Run full bias audit on a named preloaded case."""
    if case_id not in CASE_CONFIG:
        raise HTTPException(status_code=404, detail=f"Unknown case: {case_id}")

    try:
        result = run_audit(case_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Attach Gemini explanation if available
    try:
        gemini = get_gemini()
        explanation = gemini.explain_audit(result)
        result["gemini_explanation"] = explanation
    except Exception:
        result["gemini_explanation"] = None

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

    return result


@app.post("/text-bias")
def text_bias(req: TextBiasRequest):
    """Run DBias on pasted text. Returns score, highlights, debiased version."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty.")

    try:
        analyze = get_text_bias()
        result = analyze(req.text)
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