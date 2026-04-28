"""
adzuna.py — BiasLens Adzuna Jobs Fetcher
Fetches live job postings, feeds descriptions to text_bias.py
"""

import os
import httpx
from dotenv import load_dotenv
from text_bias import analyze_text_bias, summary_stats

load_dotenv()

ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")
ADZUNA_BASE    = "https://api.adzuna.com/v1/api/jobs"

# Country code → Adzuna endpoint slug
COUNTRY_MAP = {
    "us": "us", "gb": "gb", "in": "in",
    "au": "au", "ca": "ca", "de": "de",
}


def _check_creds():
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        raise EnvironmentError(
            "ADZUNA_APP_ID and ADZUNA_APP_KEY must be set in .env"
        )


def fetch_jobs(
    query: str = "software engineer",
    country: str = "us",
    results_per_page: int = 10,
    page: int = 1,
) -> list[dict]:
    """
    Fetch raw job postings from Adzuna.

    Returns list of dicts:
        id, title, company, location, salary_min, salary_max,
        description, redirect_url, created
    """
    _check_creds()
    cc = COUNTRY_MAP.get(country.lower(), "us")
    url = f"{ADZUNA_BASE}/{cc}/search/{page}"

    params = {
        "app_id":           ADZUNA_APP_ID,
        "app_key":          ADZUNA_APP_KEY,
        "results_per_page": results_per_page,
        "what":             query,
        "content-type":     "application/json",
    }

    resp = httpx.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    jobs = []
    for j in data.get("results", []):
        jobs.append({
            "id":          j.get("id", ""),
            "title":       j.get("title", ""),
            "company":     j.get("company", {}).get("display_name", "Unknown"),
            "location":    j.get("location", {}).get("display_name", "Unknown"),
            "salary_min":  j.get("salary_min"),
            "salary_max":  j.get("salary_max"),
            "description": j.get("description", ""),
            "redirect_url":j.get("redirect_url", ""),
            "created":     j.get("created", ""),
        })

    return jobs


def analyze_jobs_bias(
    query: str = "software engineer",
    country: str = "us",
    results_per_page: int = 10,
) -> dict:
    """
    Fetch jobs + run bias analysis on each description.

    Returns:
        {
            query, country, total_fetched,
            jobs: [ { ...job fields, bias: { analyze_text_bias result } } ],
            summary: { summary_stats result }
        }
    """
    jobs = fetch_jobs(query=query, country=country, results_per_page=results_per_page)

    analyzed = []
    bias_results = []

    for job in jobs:
        text = f"{job['title']}. {job['description']}"
        bias = analyze_text_bias(text)
        bias_results.append(bias)
        analyzed.append({**job, "bias": bias})

    return {
        "query":         query,
        "country":       country,
        "total_fetched": len(analyzed),
        "jobs":          analyzed,
        "summary":       summary_stats(bias_results),
    }


def top_biased_jobs(results: dict, n: int = 5) -> list[dict]:
    """Return top-n most biased jobs sorted by bias_score desc."""
    jobs = results.get("jobs", [])
    return sorted(jobs, key=lambda j: j["bias"]["bias_score"], reverse=True)[:n]


# ── Quick test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Fetching jobs from Adzuna...")
    try:
        results = analyze_jobs_bias(query="data scientist", country="us", results_per_page=5)
        print(f"\nFetched: {results['total_fetched']} jobs")
        print(f"Summary: {results['summary']}")
        print("\nTop biased:")
        for j in top_biased_jobs(results, n=3):
            print(f"  [{j['bias']['severity'].upper()}] {j['title']} @ {j['company']}")
            print(f"  Score: {j['bias']['bias_score']} | Words: {j['bias']['biased_words']}")
    except EnvironmentError as e:
        print(f"[adzuna] Creds missing: {e}")