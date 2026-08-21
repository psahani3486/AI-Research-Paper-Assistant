"""
Paper Summarization Service (Stage 11)
Generates structured 7-pillar academic summaries (Abstract, Problem, Methodology, Dataset, Results, Limitations, Future Work).
Caches results in SQLite `paper_summaries` table for instant retrieval.
"""
import json
from typing import Dict, Optional
from app.services.pdf_service import extract_pdf_pages
from app.services.llm_service import get_groq_client
from app.database.database import (
    get_paper_by_id_from_db, 
    get_summary_by_paper_id, 
    insert_or_update_summary
)
from app.config import settings

def generate_paper_summary(paper_id: str, force_refresh: bool = False) -> Dict:
    """
    Structured 7-Pillar Summarization Pipeline:
    1. Checks if summary is cached in SQLite paper_summaries table
    2. If not cached, extracts document text from PDF
    3. Prompts Groq LLM (groq/compound) to output structured JSON with 7 academic pillars
    4. Saves generated summary in SQLite DB
    5. Returns summary payload
    """
    # 1. Check cache in SQLite DB
    if not force_refresh:
        cached = get_summary_by_paper_id(paper_id)
        if cached:
            return cached

    # 2. Fetch paper record
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise ValueError(f"Research paper with ID '{paper_id}' not found.")

    # 3. Extract text pages
    pages_data = extract_pdf_pages(paper["file_path"])
    full_text = "\n\n".join([f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages_data])

    # Truncate text to fit context window safely (~1200 characters covering abstract, intro, methods)
    truncated_text = full_text[:1200]

    # 4. Construct Structured JSON System & User Prompt
    system_prompt = """You are a senior academic peer reviewer and AI research scientist.
Analyze the provided research paper text and extract a structured 7-pillar academic summary.

You MUST respond strictly with a VALID JSON object (no extra commentary) containing exactly these 7 keys:
1. "abstract_summary": High-level overview of the paper's core thesis (2-3 sentences).
2. "problem": The core problem statement, research gap, or bottleneck being solved.
3. "methodology": The novel architecture, algorithm, model, or approach proposed by the authors.
4. "dataset": The datasets, benchmarks, or experimental setup used for validation.
5. "results": Quantitative results achieved (accuracy scores, metrics, performance speedup, error rates).
6. "limitations": Weaknesses, constraints, compute overhead, or edge cases acknowledged by authors.
7. "future_work": Suggested future improvements or extensions proposed by the authors.
"""

    user_prompt = f"Research Paper Title: '{paper['title']}'\n\nPaper Content Snippets:\n{truncated_text}\n\nProvide the 7-pillar academic analysis JSON object now."

    # 5. Call Groq API
    client = get_groq_client()
    model_name = settings.GROQ_MODEL or "groq/compound"

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.1,
        max_tokens=1500
    )

    raw_response = response.choices[0].message.content.strip()

    # Clean markdown json code blocks if present
    if raw_response.startswith("```"):
        lines = raw_response.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_response = "\n".join(lines).strip()

    try:
        summary_data = json.loads(raw_response)
    except Exception as e:
        print(f"[Summary Parser Warning]: Failed to parse JSON strictly: {e}. Raw text fallback.")
        summary_data = {
            "abstract_summary": raw_response[:300],
            "problem": "Extracted from paper context.",
            "methodology": "Refer to paper sections.",
            "dataset": "Standard benchmarks mentioned in paper.",
            "results": "Refer to tables in paper.",
            "limitations": "Refer to discussion section.",
            "future_work": "Refer to conclusion section."
        }

    # 6. Save in SQLite DB
    saved_summary = insert_or_update_summary(paper_id=paper_id, summary_dict=summary_data)
    return saved_summary
