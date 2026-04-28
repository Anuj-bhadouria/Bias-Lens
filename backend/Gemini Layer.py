"""
gemini_layer.py — Gemini API integration
Handles: audit explanation, counterfactual explanation, compliance report, chat
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-1.5-flash"   


class GeminiLayer:

    def __init__(self):
        self.model = genai.GenerativeModel(MODEL)
        # Per-case chat sessions — keyed by case_id
        self._sessions: dict = {}

    # -----------------------------------------------------------------------
    # AUDIT EXPLANATION
    # -----------------------------------------------------------------------

    def explain_audit(self, audit_result: dict) -> str:
        fr = audit_result["fairrank"]
        m = audit_result["metrics"]
        cfg_name = audit_result.get("case_name", "this dataset")
        attr = audit_result.get("protected_attribute", "protected attribute")

        penalties = fr.get("penalties", [])
        worst = penalties[0]["metric"] if penalties else "multiple metrics"

        prompt = f"""You are BiasLens, an AI bias forensics expert.

Given audit results for {cfg_name}:
- FairRank Score: {fr['score']}/100 ({fr['label']})
- Demographic Parity Difference: {m['demographic_parity_difference']}
- Equalized Odds Difference: {m['equalized_odds_difference']}
- Disparate Impact: {m['disparate_impact']}
- False Positive Rate Gap: {m['false_positive_rate_gap']}
- Protected attribute: {attr}
- Selection rate (privileged group): {m['selection_rate_privileged']}
- Selection rate (unprivileged group): {m['selection_rate_unprivileged']}
- Most penalised metric: {worst}

Explain in 3-4 sentences in plain English for a non-technical executive.
Be specific about who was harmed, how severely, and the real-world impact.
Do not use jargon. Do not repeat the numbers verbatim — translate them to meaning."""

        return self._call(prompt)

    # -----------------------------------------------------------------------
    # COUNTERFACTUAL EXPLANATION
    # -----------------------------------------------------------------------

    def explain_counterfactual(self, case_id: str,
                                counterfactual: dict,
                                config: dict) -> str:
        attr = counterfactual["protected_attribute"]
        orig = round(counterfactual["unprivileged_group_original_approval"] * 100, 1)
        flipped = round(counterfactual["unprivileged_group_if_privileged_approval"] * 100, 1)
        delta = round(counterfactual["approval_delta"] * 100, 1)

        prompt = f"""You are BiasLens, an AI bias forensics expert.

Counterfactual analysis for {config['name']}:
- Protected attribute changed: {attr} flipped from unprivileged to privileged
- Original approval rate for unprivileged group: {orig}%
- Approval rate if same people had privileged {attr}: {flipped}%
- Change: {delta:+}%

Explain what this counterfactual reveals about discrimination in max 3 sentences.
Be direct. Name the disparity. State the real-world consequence."""

        return self._call(prompt)

    # -----------------------------------------------------------------------
    # COMPLIANCE REPORT
    # -----------------------------------------------------------------------

    def generate_compliance_report(self, audit_result: dict) -> str:
        fr = audit_result["fairrank"]
        m = audit_result["metrics"]
        name = audit_result.get("case_name", "dataset")
        penalties = fr.get("penalties", [])

        findings_lines = "\n".join(
            f"- {p['metric']}: {p['value']} (threshold {p['threshold']})"
            for p in penalties
        ) or "- No threshold violations detected."

        prompt = f"""You are a compliance officer writing a formal AI bias audit report.

Dataset audited: {name}
FairRank Score: {fr['score']}/100 — {fr['gate_verdict']}

Bias findings:
{findings_lines}

Map these findings to:
1. EU AI Act — cite specific article and explain applicability
2. US EEOC — disparate impact doctrine (the 80% rule)
3. Recommended remediation steps (3 concrete actions)

Format as a professional compliance summary with clear section headers.
Be specific. Do not be generic."""

        return self._call(prompt)

    # -----------------------------------------------------------------------
    # CHAT
    # -----------------------------------------------------------------------

    def chat(self, case_id: str, message: str,
             audit_context: dict = None) -> str:
        if case_id not in self._sessions:
            system_seed = self._build_system_seed(case_id, audit_context)
            session = self.model.start_chat(history=[
                {"role": "user", "parts": [system_seed]},
                {"role": "model", "parts": [
                    "Understood. I'm ready to answer questions about this bias audit as BiasLens."
                ]},
            ])
            self._sessions[case_id] = session

        session = self._sessions[case_id]
        response = session.send_message(message)
        return response.text

    def _build_system_seed(self, case_id: str, audit_context: dict) -> str:
        if not audit_context:
            return (
                f"You are BiasLens, an AI bias forensics expert. "
                f"Answer questions about the {case_id} bias audit clearly and concisely."
            )

        fr = audit_context.get("fairrank", {})
        m = audit_context.get("metrics", {})

        return f"""You are BiasLens, an AI bias forensics expert.

You have just completed a bias audit. Here are the results:
- Dataset: {audit_context.get('case_name', case_id)}
- FairRank Score: {fr.get('score', 'N/A')}/100 ({fr.get('label', '')})
- Demographic Parity Difference: {m.get('demographic_parity_difference', 'N/A')}
- Equalized Odds Difference: {m.get('equalized_odds_difference', 'N/A')}
- Disparate Impact: {m.get('disparate_impact', 'N/A')}
- False Positive Rate Gap: {m.get('false_positive_rate_gap', 'N/A')}
- Gate verdict: {fr.get('gate_verdict', 'N/A')}

Answer user questions about this audit. Be specific, use the numbers above.
Explain in plain English. No jargon. Max 4 sentences per reply unless asked for more."""

    # -----------------------------------------------------------------------
    # INTERNAL
    # -----------------------------------------------------------------------

    def _call(self, prompt: str) -> str:
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"[Gemini unavailable: {str(e)}]"
