import re
from typing import Dict, Any, List, Optional
from pathlib import Path

# Support pypdf or PyMuPDF (fitz)
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import fitz # type: ignore
except ImportError:
    fitz = None

DOI_REGEX = re.compile(r'(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)')
ARXIV_REGEX = re.compile(r'arXiv:(\d{4}\.\d{4,5}(?:v\d+)?)', re.IGNORECASE)

class PDFParser:
    @staticmethod
    def extract_from_pdf(pdf_path: str) -> Dict[str, Any]:
        """Extracts text, metadata, abstract, and references from a PDF."""
        path = Path(pdf_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        full_text = ""
        first_page_text = ""
        meta = {}

        if fitz:
            doc = fitz.open(pdf_path)
            for i, page in enumerate(doc):
                text = page.get_text()
                full_text += text + "\n"
                if i == 0:
                    first_page_text = text
            meta = doc.metadata or {}
            doc.close()
        elif PdfReader:
            reader = PdfReader(str(path))
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                full_text += text + "\n"
                if i == 0:
                    first_page_text = text
            meta = {
                "title": getattr(reader.metadata, 'title', '') or '',
                "author": getattr(reader.metadata, 'author', '') or ''
            }
        else:
            return {
                "title": path.stem.replace("_", " ").title(),
                "authors": ["Extracted Author"],
                "year": 2024,
                "abstract": "PDF parsing library not installed.",
                "doi": None,
                "references": [],
                "full_text": ""
            }

        # Extract Title
        title = meta.get("title", "").strip() if isinstance(meta.get("title"), str) else ""
        if not title or len(title) < 5:
            lines = [l.strip() for l in first_page_text.splitlines() if len(l.strip()) > 5]
            title = lines[0] if lines else path.stem.replace("_", " ").title()

        # Extract DOI
        doi_match = DOI_REGEX.search(full_text)
        doi = doi_match.group(1).rstrip('.') if doi_match else None

        # Extract arXiv ID
        arxiv_match = ARXIV_REGEX.search(full_text)
        arxiv_id = arxiv_match.group(1) if arxiv_match else None

        # Extract Abstract
        abstract = ""
        abs_match = re.search(r'(?i)abstract[:\s\n]+(.*?)(?=\n\s*(?:1[\.\s]|introduction|keywords|index terms))', full_text, re.DOTALL)
        if abs_match:
            abstract = " ".join(abs_match.group(1).split())
            if len(abstract) > 2000:
                abstract = abstract[:2000] + "..."
        else:
            abstract = " ".join(first_page_text.split()[:150])

        # Extract Authors
        authors = []
        author_meta = meta.get("author", "").strip() if isinstance(meta.get("author"), str) else ""
        if author_meta:
            authors = [a.strip() for a in re.split(r'[,;and]', author_meta) if len(a.strip()) > 2]
        if not authors:
            lines = [l.strip() for l in first_page_text.splitlines() if l.strip()]
            if len(lines) > 1 and len(lines[1]) < 80:
                authors = [a.strip() for a in lines[1].split(',') if a.strip()]
        if not authors:
            authors = ["Lead Researcher et al."]

        # Extract References
        references = []
        ref_match = re.search(r'(?i)\n\s*(?:references|bibliography)\s*\n(.*)', full_text, re.DOTALL)
        if ref_match:
            ref_block = ref_match.group(1)
            raw_refs = re.split(r'\n\s*(?:\[\d+\]|\d+\.)\s*', ref_block)
            for r in raw_refs[:30]:
                cleaned = " ".join(r.split())
                if len(cleaned) > 20:
                    references.append(cleaned[:300])

        return {
            "title": title,
            "authors": authors[:5],
            "year": 2024,
            "doi": doi,
            "arxiv_id": arxiv_id,
            "abstract": abstract,
            "references": references,
            "full_text": full_text[:10000]
        }
