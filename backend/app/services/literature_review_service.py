"""
Autonomous Literature Review Generator Service
Synthesizes multiple research papers into a publication-ready academic Literature Review Report
with structured sections, comparative analysis, and BibTeX citations.
"""
from typing import List, Dict
import time
from app.services.llm_service import _call_groq_with_retry
from app.database.database import get_all_papers_from_db
from app.logger import logger

def generate_literature_review(paper_ids: List[str]) -> Dict:
    """
    Generates a full academic literature review report across selected paper_ids.
    """
    all_papers = get_all_papers_from_db()
    selected_papers = [p for p in all_papers if p["id"] in paper_ids] if paper_ids else all_papers[:5]

    if not selected_papers:
        return {
            "error": "No valid papers selected for literature review."
        }

    titles = [p["title"] for p in selected_papers]
    logger.info(f"Generating Literature Review for {len(selected_papers)} papers: {titles}")

    papers_summary_prompt = ""
    for idx, p in enumerate(selected_papers, start=1):
        papers_summary_prompt += f"Paper [{idx}]: '{p['title']}' (ID: {p['id']}, Pages: {p['pages']})\n"

    system_prompt = """You are a Principal AI Researcher and Senior Academic Editor.
Synthesize the provided research papers into a publication-ready Academic Literature Review Report.

STRUCTURE YOUR OUTPUT INTO CLEAN MARKDOWN:
# 📚 State-of-the-Art Academic Literature Review

## 1. Executive Abstract
Synthesize the overarching theme, core innovations, and research domain represented by these papers.

## 2. Theoretical Foundations & Domain Overview
Explain key concepts, mathematical formalisms, and architectural breakthroughs.

## 3. Comparative Analysis & Core Methodologies
Summarize how each paper tackles its core problem, datasets used, and key findings.

## 4. Key Research Gaps & Open Challenges
Detail 3-5 critical open research gaps across these papers.

## 5. Future Research Roadmap
Propose 3 high-impact BTP / Master's thesis project ideas.

## 6. Complete BibTeX References
Provide valid BibTeX citations for each analyzed paper."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Analyze and synthesize these research papers:\n\n{papers_summary_prompt}"}
    ]

    t0 = time.time()
    response = _call_groq_with_retry(messages, max_tokens=2048, temperature=0.3)
    review_markdown = response.choices[0].message.content.strip()
    latency_ms = round((time.time() - t0) * 1000)

    # Generate BibTeX block
    bibtex_entries = []
    for p in selected_papers:
        clean_key = "".join(c for c in p["title"].split()[0] if c.isalnum()) + "2024"
        bib = f"""@article{{{clean_key},
  title={{{p['title']}}},
  author={{Research Team}},
  journal={{AI Research Archive}},
  year={{2024}},
  pages={{1--{p['pages']}}}
}}"""
        bibtex_entries.append(bib)

    bibtex_combined = "\n\n".join(bibtex_entries)

    return {
        "paper_count": len(selected_papers),
        "analyzed_papers": [p["title"] for p in selected_papers],
        "literature_review_markdown": review_markdown,
        "bibtex_citations": bibtex_combined,
        "latency_ms": latency_ms
    }
