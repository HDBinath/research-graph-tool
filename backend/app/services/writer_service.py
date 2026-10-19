import re
import json
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings

class WriterService:
    def __init__(self):
        self.provider = settings.llm_provider
        self.gemini_key = settings.gemini_api_key
        self.ollama_url = settings.ollama_base_url
        self.ollama_model = settings.ollama_model

    async def autocomplete(self, current_text: str, active_papers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Suggests next academic sentence, grounded in the active research papers."""
        clean_text = current_text.strip()
        if not clean_text:
            return {"suggestion": "", "cited_paper": None}

        # Try Ollama / Gemini if configured
        if self.provider == "OLLAMA":
            res = await self._autocomplete_ollama(clean_text, active_papers)
            if res:
                return res
        elif self.gemini_key and self.provider == "GEMINI":
            res = await self._autocomplete_gemini(clean_text, active_papers)
            if res:
                return res

        # Heuristic fallback (fast, offline, deterministic)
        return self._autocomplete_heuristic(clean_text, active_papers)

    async def synthesize_debate(self, paper_a: Dict[str, Any], paper_b: Dict[str, Any], relation: str = "CONTRADICTS") -> Dict[str, Any]:
        """Synthesizes a two-sided scholarly literature review discussing opposing or extended findings."""
        if self.provider == "OLLAMA":
            res = await self._synthesize_ollama(paper_a, paper_b, relation)
            if res:
                return res

        return self._synthesize_heuristic(paper_a, paper_b, relation)

    async def generate_bridge(self, path_papers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generates a transitional narrative bridging disparate research papers."""
        if len(path_papers) < 2:
            return {"text": "A bridging path requires at least two connected research papers."}

        p_start = path_papers[0]
        p_end = path_papers[-1]
        intermediates = path_papers[1:-1]

        start_author = (p_start.get("authors") or ["The foundational work"])[0]
        start_year = p_start.get("year", 2020)
        end_author = (p_end.get("authors") or ["recent investigations"])[0]
        end_year = p_end.get("year", 2024)

        if intermediates:
            mid_author = (intermediates[0].get("authors") or ["subsequent adaptations"])[0]
            mid_year = intermediates[0].get("year", 2022)
            narrative = (
                f"While the early framework established by {start_author} ({start_year}) "
                f"initially addressed {p_start.get('title', 'core architecture')}, "
                f"intermediate developments led by {mid_author} ({mid_year}) bridged the architectural gap. "
                f"This progression ultimately paved the way for {p_end.get('title', 'modern extensions')}, "
                f"as demonstrated by {end_author} ({end_year}), which successfully reconciled earlier trade-offs."
            )
        else:
            narrative = (
                f"The core findings proposed by {start_author} ({start_year}) in \"{p_start.get('title')}\" "
                f"directly motivated the methodologies adopted by {end_author} ({end_year}) in \"{p_end.get('title')}\", "
                f"establishing a coherent theoretical link between the two approaches."
            )

        return {
            "text": narrative,
            "citations": [
                f"{start_author} et al. ({start_year})",
                f"{end_author} et al. ({end_year})"
            ]
        }

    async def paraphrase_academic(self, text: str, tone: str = "formal") -> Dict[str, Any]:
        """Converts raw thoughts into academic phrasing."""
        clean = text.strip()
        if not clean:
            return {"result": ""}

        # Academic replacement patterns
        replacements = [
            (r"\bi think\b", "the evidence suggests"),
            (r"\ba lot of\b", "numerous"),
            (r"\bbig problem\b", "significant limitation"),
            (r"\bvery good\b", "substantially advantageous"),
            (r"\bshows that\b", "empirically demonstrates that"),
            (r"\bgot\b", "obtained"),
            (r"\bfound out\b", "ascertained"),
            (r"\bbad\b", "suboptimal"),
            (r"\bworks well\b", "exhibits superior efficacy")
        ]

        result = clean
        for pattern, repl in replacements:
            result = re.sub(pattern, repl, result, flags=re.IGNORECASE)

        if not result.endswith("."):
            result += "."

        return {"result": f"Specifically, {result[0].lower() + result[1:] if len(result) > 1 else result}"}

    def _autocomplete_heuristic(self, text: str, active_papers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Heuristic completion grounded in papers and claims."""
        tokens = set(re.findall(r"\b[a-zA-Z]{4,}\b", text.lower()))

        best_paper = None
        best_claim = None
        best_score = -1

        for p in active_papers:
            p_text = (p.get("title", "") + " " + p.get("abstract", "")).lower()
            overlap = len(tokens.intersection(set(re.findall(r"\b[a-zA-Z]{4,}\b", p_text))))
            if overlap > best_score:
                best_score = overlap
                best_paper = p
                # Check claims
                claims = p.get("claims") or []
                if claims:
                    best_claim = claims[0].get("text") if isinstance(claims[0], dict) else getattr(claims[0], "text", "")

        if best_paper:
            authors = best_paper.get("authors") or ["Author"]
            lead_author = authors[0] if isinstance(authors, list) else str(authors)
            year = best_paper.get("year", 2024)
            citation_key = f"({lead_author} et al., {year})"

            if best_claim and len(best_claim) > 20:
                suggestion = f"Furthermore, empirical evaluations confirm that {best_claim.lower().rstrip('.')} {citation_key}."
            else:
                suggestion = f"This observation aligns closely with the foundational findings established in {best_paper.get('title', 'prior literature')} {citation_key}."

            return {
                "suggestion": suggestion,
                "cited_paper": {
                    "id": best_paper.get("id"),
                    "title": best_paper.get("title"),
                    "year": year,
                    "author": lead_author,
                    "citation_key": citation_key
                }
            }

        return {
            "suggestion": "Furthermore, empirical observations demonstrate that this mechanism substantially enhances convergence stability across diverse benchmark settings.",
            "cited_paper": None
        }

    def _synthesize_heuristic(self, paper_a: Dict[str, Any], paper_b: Dict[str, Any], relation: str) -> Dict[str, Any]:
        """Constructs a structured debate or extension narrative."""
        auth_a = (paper_a.get("authors") or ["Author A"])[0]
        year_a = paper_a.get("year", 2020)
        auth_b = (paper_b.get("authors") or ["Author B"])[0]
        year_b = paper_b.get("year", 2024)

        title_a = paper_a.get("title", "the primary model")
        title_b = paper_b.get("title", "the comparative approach")

        claims_a = [c.get("text") if isinstance(c, dict) else c.text for c in (paper_a.get("claims") or [])]
        claims_b = [c.get("text") if isinstance(c, dict) else c.text for c in (paper_b.get("claims") or [])]

        claim_text_a = f'specifically asserting that "{claims_a[0]}"' if claims_a else "prioritizing theoretical guarantees"
        claim_text_b = f'arguing instead that "{claims_b[0]}"' if claims_b else "demonstrating superior real-world scalability"

        if relation == "CONTRADICTS":
            text = (
                f"A central point of scholarly debate emerges when comparing the conclusions of {auth_a} et al. ({year_a}) "
                f"and {auth_b} et al. ({year_b}). In \"{title_a}\", {auth_a} et al. highlight the advantages of their architecture, "
                f"{claim_text_a}. Conversely, {auth_b} et al. ({year_b}) dispute these conclusions in \"{title_b}\", "
                f"{claim_text_b}. This tension reveals an unresolved trade-off between architectural complexity and empirical robustness."
            )
        else:
            text = (
                f"Building upon the foundational framework proposed by {auth_a} et al. ({year_a}) in \"{title_a}\", "
                f"subsequent methodology by {auth_b} et al. ({year_b}) directly extends these principles in \"{title_b}\". "
                f"While {auth_a} et al. established that {claim_text_a}, {auth_b} et al. demonstrated that {claim_text_b}, "
                f"yielding substantial performance improvements across standardized evaluation benchmarks."
            )

        return {
            "text": text,
            "citations": [
                f"{auth_a} et al. ({year_a})",
                f"{auth_b} et al. ({year_b})"
            ]
        }

    async def _autocomplete_ollama(self, text: str, active_papers: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        papers_context = "\n".join([
            f"- {p.get('title')} ({p.get('year')}): {p.get('abstract', '')[:180]}..."
            for p in active_papers[:5]
        ])
        prompt = f"""You are an academic co-pilot. Complete the following academic paragraph with ONE formal, concise scholarly sentence.
Ground your completion in the provided literature and cite the author and year (e.g. [Author et al., Year]).

Literature Library:
{papers_context}

Author's Draft:
{text}

Output ONLY the sentence continuation (nothing else):"""

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{self.ollama_url}/api/generate", json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False
                })
                if res.status_code == 200:
                    suggestion = res.json().get("response", "").strip()
                    if suggestion:
                        return {"suggestion": suggestion, "cited_paper": None}
        except Exception:
            pass
        return None

    async def _autocomplete_gemini(self, text: str, active_papers: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        # Fallback to heuristic if key is unset or network error
        return None

    async def _synthesize_ollama(self, paper_a: Dict[str, Any], paper_b: Dict[str, Any], relation: str) -> Optional[Dict[str, Any]]:
        return None

writer_service = WriterService()
