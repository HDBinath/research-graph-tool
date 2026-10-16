import aiosqlite
import json
from typing import List, Optional, Dict, Any
from app.config import settings
from app.models.graph import Paper, Claim, Edge

async def init_db():
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS papers (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                authors TEXT,
                year INTEGER,
                doi TEXT,
                abstract TEXT,
                citation_count INTEGER DEFAULT 0,
                pdf_filename TEXT,
                openalex_id TEXT,
                cluster_id INTEGER DEFAULT 0,
                pagerank_score REAL DEFAULT 0.0,
                is_landmark BOOLEAN DEFAULT 0,
                raw_references TEXT
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS claims (
                id TEXT PRIMARY KEY,
                paper_id TEXT,
                text TEXT NOT NULL,
                category TEXT DEFAULT 'Finding',
                confidence REAL DEFAULT 0.9,
                polarity TEXT DEFAULT 'positive',
                FOREIGN KEY (paper_id) REFERENCES papers (id)
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS edges (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                type TEXT NOT NULL,
                provenance TEXT DEFAULT 'EXTRACTED',
                confidence REAL DEFAULT 1.0,
                evidence TEXT
            )
        """)
        
        await db.commit()

async def save_paper(paper: Paper):
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute("""
            INSERT OR REPLACE INTO papers 
            (id, title, authors, year, doi, abstract, citation_count, pdf_filename, openalex_id, cluster_id, pagerank_score, is_landmark, raw_references)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            paper.id,
            paper.title,
            json.dumps(paper.authors),
            paper.year,
            paper.doi,
            paper.abstract,
            paper.citation_count,
            paper.pdf_filename,
            paper.openalex_id,
            paper.cluster_id,
            paper.pagerank_score,
            1 if paper.is_landmark else 0,
            json.dumps(paper.references)
        ))
        
        for claim in paper.claims:
            await db.execute("""
                INSERT OR REPLACE INTO claims (id, paper_id, text, category, confidence, polarity)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (claim.id, paper.id, claim.text, claim.category, claim.confidence, claim.polarity))
            
        await db.commit()

async def save_edge(edge: Edge):
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute("""
            INSERT OR REPLACE INTO edges (id, source, target, type, provenance, confidence, evidence)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (edge.id, edge.source, edge.target, edge.type, edge.provenance, edge.confidence, edge.evidence))
        await db.commit()

async def get_all_papers() -> List[Paper]:
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM papers")
        rows = await cursor.fetchall()
        papers = []
        for row in rows:
            # fetch claims for this paper
            claim_cursor = await db.execute("SELECT * FROM claims WHERE paper_id = ?", (row["id"],))
            claim_rows = await claim_cursor.fetchall()
            claims = [
                Claim(
                    id=c["id"],
                    paper_id=c["paper_id"],
                    text=c["text"],
                    category=c["category"],
                    confidence=c["confidence"],
                    polarity=c["polarity"]
                ) for c in claim_rows
            ]
            
            papers.append(Paper(
                id=row["id"],
                title=row["title"],
                authors=json.loads(row["authors"] or "[]"),
                year=row["year"],
                doi=row["doi"],
                abstract=row["abstract"],
                citation_count=row["citation_count"],
                pdf_filename=row["pdf_filename"],
                openalex_id=row["openalex_id"],
                cluster_id=row["cluster_id"],
                pagerank_score=row["pagerank_score"],
                is_landmark=bool(row["is_landmark"]),
                claims=claims,
                references=json.loads(row["raw_references"] or "[]")
            ))
        return papers

async def get_all_edges() -> List[Edge]:
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM edges")
        rows = await cursor.fetchall()
        return [
            Edge(
                id=r["id"],
                source=r["source"],
                target=r["target"],
                type=r["type"],
                provenance=r["provenance"],
                confidence=r["confidence"],
                evidence=r["evidence"]
            ) for r in rows
        ]

async def clear_database():
    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute("DELETE FROM claims")
        await db.execute("DELETE FROM edges")
        await db.execute("DELETE FROM papers")
        await db.commit()
