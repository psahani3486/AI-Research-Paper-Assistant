"""
Research Proposal & Methodology Critic Agent Service
Evaluates user research proposals/ideas against indexed paper context,
providing constructive academic criticism, methodology flaws, and novel contribution scoring.
"""
from typing import Dict, List, Optional
import time
from app.services.hybrid_retrieval_service import perform_hybrid_search
from app.services.llm_service import _call_groq_with_retry
from app.logger import logger

def critique_research_proposal(
    proposal_title: str,
    proposal_text: str,
    target_paper_id: Optional[str] = None
) -> Dict:
    """
    Evaluates a user research proposal against retrieved research paper context.
    """
    logger.info(f"Evaluating research proposal critic for: '{proposal_title}'")

    # Retrieve relevant context from vector database
    retrieved_chunks = perform_hybrid_search(
        query_text=f"{proposal_title} {proposal_text[:300]}",
        top_k=4,
        paper_id=target_paper_id
    )

    context_str = "\n\n".join([f"- Paper: '{c.get('paper_name')}' (Page {c.get('page_number')}):\n{c.get('text')}" for c in retrieved_chunks])

    system_prompt = """You are a Peer Review Committee Chair for NeurIPS/ICML.
Provide an objective, rigorous academic review and critique of the user's proposed research idea against the provided literature.

STRUCTURE YOUR OUTPUT IN MARKDOWN:
### 1. Executive Feasibility & Novelty Score (Scale 1-10)
Assign a score and provide a 2-sentence rationale.

### 2. Core Strengths & Novel Contributions
List 2-3 genuine innovations in the proposal.

### 3. Potential Methodological Flaws & Risks
Highlight 2-3 technical pitfalls, baseline comparisons missing, or complexity bottlenecks.

### 4. Uncredited Prior Work & Citations
Identify how this overlaps with or builds upon the provided literature context.

### 5. Recommended Revisions for BTP / Publication
Actionable steps to elevate this proposal into a top-tier project."""

    user_prompt = f"""PROPOSED RESEARCH TITLE: {proposal_title}

PROPOSAL DESCRIPTION:
{proposal_text}

RELATED LITERATURE CONTEXT:
{context_str if context_str else 'No specific literature indexed.'}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    t0 = time.time()
    response = _call_groq_with_retry(messages, max_tokens=1500, temperature=0.3)
    critique_markdown = response.choices[0].message.content.strip()
    latency_ms = round((time.time() - t0) * 1000)

    return {
        "proposal_title": proposal_title,
        "critique_markdown": critique_markdown,
        "referenced_sources_count": len(retrieved_chunks),
        "latency_ms": latency_ms
    }
