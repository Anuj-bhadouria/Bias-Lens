"""
groq_layer.py — Pure Groq Llama-3 API integration
Handles: audit explanation, counterfactual explanation, compliance report, chat
"""

import os
import json
from dotenv import load_dotenv

load_dotenv()

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False


class GroqLayer:

    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.use_groq = bool(self.groq_key) and GROQ_AVAILABLE
        if self.use_groq:
            self.groq_client = Groq(api_key=self.groq_key)
            print("[groq_layer] Loaded Groq inference engine.")
        else:
            print("[groq_layer] WARNING: GROQ_API_KEY missing or groq not installed.")
            
        # Chat sessions — keyed by case_id
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
        worst = penalties[0]["rule"] if penalties else "multiple metrics"

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

        res = self._call(prompt)
        if res.startswith("[Groq"):
            return (
                f"The algorithmic decision-making process for {cfg_name} demonstrates significant "
                f"statistical bias against the {attr} group. The audit reveals substantial deviations from "
                f"baseline parity, resulting in unfair outcomes and potential regulatory exposure."
            )
        return res

    # -----------------------------------------------------------------------
    # BIAS GENEALOGY
    # -----------------------------------------------------------------------

    def generate_bias_genealogy(self, audit_result: dict) -> list:
        """
        Generate a bias genealogy pipeline — stages where bias entered the system.
        Returns a list of {stage, impact, bias} dicts.
        """
        fr = audit_result["fairrank"]
        m = audit_result["metrics"]
        cfg_name = audit_result.get("case_name", "this dataset")
        attr = audit_result.get("protected_attribute", "protected attribute")

        prompt = f"""You are BiasLens, an AI bias forensics expert.

Audit of {cfg_name} (protected attribute: {attr}):
- FairRank Score: {fr['score']}/100
- Demographic Parity Difference: {m['demographic_parity_difference']}
- Disparate Impact: {m['disparate_impact']}
- Equalized Odds Difference: {m['equalized_odds_difference']}

Generate a bias genealogy pipeline: exactly 5 stages showing where bias entered this specific AI system.
Each stage must be specific to THIS dataset (not generic).

Respond ONLY with a JSON array, no markdown, no explanation:
[
  {{"stage": "Stage Name", "impact": "High|Medium|Low", "bias": "One sentence explaining the specific bias introduced at this stage."}},
  ...
]"""

        raw = self._call(prompt)
        try:
            clean = raw.strip().strip("```json").strip("```").strip()
            return json.loads(clean)
        except Exception:
            return [
                {"stage": "Data Collection", "impact": "High", "bias": "Historical data reflects societal inequalities in sampling."},
                {"stage": "Feature Engineering", "impact": "Medium", "bias": "Proxy features correlate with protected attributes."},
                {"stage": "Model Training", "impact": "High", "bias": "Optimization objective does not penalize disparate error rates."},
                {"stage": "Threshold Setting", "impact": "Medium", "bias": "Single decision threshold applied uniformly across groups."},
                {"stage": "Deployment", "impact": "Low", "bias": "No post-deployment fairness monitoring in place."},
            ]

    # -----------------------------------------------------------------------
    # COUNTERFACTUAL Q&A
    # -----------------------------------------------------------------------

    def generate_counterfactual_qa(self, case_id: str,
                                    counterfactual: dict,
                                    config: dict) -> dict:
        attr = counterfactual["protected_attribute"]
        orig = round(counterfactual["unprivileged_group_original_approval"] * 100, 1)
        flipped = round(counterfactual["unprivileged_group_if_privileged_approval"] * 100, 1)
        delta = round(counterfactual["approval_delta"] * 100, 1)
        name = config.get("name", case_id)

        question = (
            f"If the same individuals in the unprivileged group had been identified as "
            f"'{attr}=privileged' — would they have received a different outcome from {name}?"
        )

        prompt = f"""You are BiasLens, an AI bias forensics expert.

Counterfactual for {name}:
- Protected attribute: {attr}
- Unprivileged group original approval rate: {orig}%
- Same people, if privileged {attr}: {flipped}%
- Change: {delta:+}%

Write one clear, plain-English sentence (max 40 words) that states what this counterfactual proves about discrimination in this system.
No jargon. Be direct. Name who was harmed and by how much."""

        answer = self._call(prompt)
        if answer.startswith("[Groq"):
            answer = f"Yes, if their {attr} profile was changed, the approval rate would shift by {delta:+}%, proving direct algorithmic penalization."

        return {"question": question, "answer": answer}

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

        res = self._call(prompt)
        if res.startswith("[Groq"):
            return f"Changing the {attr} feature shifted identical candidates' approval by {delta:+}%."
        return res

    # -----------------------------------------------------------------------
    # COMPLIANCE REPORT
    # -----------------------------------------------------------------------

    def generate_compliance_report(self, audit_result: dict) -> str:
        fr = audit_result["fairrank"]
        m = audit_result["metrics"]
        name = audit_result.get("case_name", "dataset")
        penalties = fr.get("penalties", [])

        findings_lines = "\n".join(
            f"- {p['rule']}: {p['value']} (penalty: {p['penalty']} points)"
            for p in penalties
        ) or "- No threshold violations detected."

        score = fr["score"]
        label = fr["label"]

        prompt = f"""You are a compliance officer writing a formal AI bias audit report.

Dataset audited: {name}
FairRank Score: {score}/100 — {label}

Bias findings (threshold violations):
{findings_lines}

Additional metrics:
- Demographic Parity Difference: {m['demographic_parity_difference']}
- Disparate Impact: {m['disparate_impact']}
- Equalized Odds Difference: {m['equalized_odds_difference']}
- False Positive Rate Gap: {m['false_positive_rate_gap']}

Map these findings to:
1. EU AI Act — cite specific article (e.g. Article 10 on data governance, Article 13 on transparency) and explain applicability
2. US EEOC — disparate impact doctrine (the 80% / four-fifths rule)
3. Recommended remediation steps (3 concrete, actionable steps)

Format as a professional compliance summary with clear section headers using markdown (##).
Be specific. Reference the actual metric values. Do not be generic."""

        res = self._call(prompt)
        if res.startswith("[Groq"):
            return f"""## Compliance Overview
This dataset ({name}) was audited and scored **{score}/100** ({label}).

## EU AI Act Applicability
Under Article 10 of the proposed AI Act, high-risk systems must meet stringent data governance standards. The {label.lower()} status indicates a potential violation of the requirements to prevent bias propagation.

## EEOC Title VII Analysis 
The measured metrics suggest adverse impact. Disproportionate selection rates potentially violate the EEOC's 'four-fifths' rule, leaving the deployer liable for disparate impact discrimination.

## Remediation Requirements
1. **Audit Data Provenance**: Re-examine sampling methodology.
2. **Apply Algorithmic Debiasing**: Implement post-processing thresholds.
3. **Establish Ongoing Monitoring**: Set up continuous Fairness checks."""
        return res

    # -----------------------------------------------------------------------
    # CHAT
    # -----------------------------------------------------------------------

    def chat(self, case_id: str, message: str, audit_context: dict = None) -> str:
        if not self.use_groq:
            return "I am currently running in offline fallback mode due to a missing GROQ_API_KEY. I cannot answer specific chat questions."

        if case_id not in self._sessions:
            system_seed = self._build_system_seed(case_id, audit_context)
            self._sessions[case_id] = [
                {"role": "system", "content": system_seed},
                {"role": "assistant", "content": "Understood. I'm ready to answer questions about this bias audit as BiasLens."}
            ]
        try:
            self._sessions[case_id].append({"role": "user", "content": message})
            chat_completion = self.groq_client.chat.completions.create(
                messages=self._sessions[case_id],
                model="llama-3.1-8b-instant",
            )
            response = chat_completion.choices[0].message.content.strip()
            self._sessions[case_id].append({"role": "assistant", "content": response})
            return response
        except Exception as e:
            return f"I am currently running in offline fallback mode. Groq Chat failed: {e}"

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

Answer user questions about this audit. Be specific, use the numbers above.
Explain in plain English. No jargon. Max 4 sentences per reply unless asked for more."""

    # -----------------------------------------------------------------------
    # INTERNAL
    # -----------------------------------------------------------------------

    def _call(self, prompt: str) -> str:
        """Single invocation to Groq Llama-3"""
        if not self.use_groq:
            return "[Groq unavailable: Missing GROQ_API_KEY in .env]"

        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            return f"[Groq request failed: {e}]"
