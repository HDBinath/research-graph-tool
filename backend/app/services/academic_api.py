import httpx
from typing import Optional, Dict, Any, List

OPENALEX_API_URL = "https://api.openalex.org/works"

class AcademicAPIClient:
    def __init__(self, polite_email: str = "researcher@example.com"):
        self.headers = {
            "User-Agent": f"ResearchGraphTool/1.0 (mailto:{polite_email})"
        }
    
    async def lookup_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        """Fetch canonical metadata and citations from OpenAlex using a DOI."""
        clean_doi = doi.replace("https://doi.org/", "").strip()
        url = f"{OPENALEX_API_URL}/https://doi.org/{clean_doi}"
        
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=self.headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return self._normalize_openalex(data)
        except Exception:
            pass
        return None

    async def lookup_by_title(self, title: str) -> Optional[Dict[str, Any]]:
        """Search OpenAlex by paper title to enrich metadata."""
        params = {
            "filter": f"title.search:{title[:120]}",
            "per_page": 1
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(OPENALEX_API_URL, params=params, headers=self.headers)
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results:
                        return self._normalize_openalex(results[0])
        except Exception:
            pass
        return None

    def _normalize_openalex(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert OpenAlex work schema to normalized ResearchGraph format."""
        authors = []
        for authorship in data.get("authorships", []):
            author_obj = authorship.get("author", {})
            name = author_obj.get("display_name")
            if name:
                authors.append(name)

        referenced_works = [
            ref.replace("https://openalex.org/", "")
            for ref in data.get("referenced_works", [])
        ]

        concepts = [c.get("display_name") for c in data.get("concepts", []) if c.get("score", 0) > 0.4]

        return {
            "openalex_id": data.get("id", "").replace("https://openalex.org/", ""),
            "title": data.get("title") or data.get("display_name", ""),
            "year": data.get("publication_year"),
            "doi": data.get("doi"),
            "citation_count": data.get("cited_by_count", 0),
            "authors": authors[:5],
            "referenced_works": referenced_works[:30],
            "concepts": concepts[:6]
        }
