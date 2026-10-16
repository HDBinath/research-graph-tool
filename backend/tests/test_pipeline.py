import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models.graph import Paper, Claim, Edge
from app.services.graph_engine import GraphEngine
from app.services.report_generator import ReportGenerator
from app.services.pdf_parser import PDFParser
from app.database import init_db, save_paper, save_edge, get_all_papers, get_all_edges, clear_database

async def run_tests():
    print("=== 1. Testing Database & Persistence ===")
    await init_db()
    await clear_database()
    
    p1 = Paper(
        id="test-p1",
        title="Attention Is All You Need",
        authors=["Vaswani et al."],
        year=2017,
        abstract="The transformer architecture relies entirely on an attention mechanism.",
        claims=[
            Claim(id="c1", paper_id="test-p1", text="Self-attention replaces recurrence entirely.", category="Methodology")
        ]
    )
    p2 = Paper(
        id="test-p2",
        title="BERT Language Model",
        authors=["Devlin et al."],
        year=2018,
        abstract="Pre-training deep bidirectional representations.",
        claims=[
            Claim(id="c2", paper_id="test-p2", text="Bidirectional context improves NLP understanding.", category="Finding")
        ]
    )
    e1 = Edge(id="e1", source="test-p2", target="test-p1", type="CITES")
    e2 = Edge(id="e2", source="test-p2", target="test-p1", type="SUPPORTS", evidence="Replicates self-attention encoder")

    await save_paper(p1)
    await save_paper(p2)
    await save_edge(e1)
    await save_edge(e2)

    papers = await get_all_papers()
    edges = await get_all_edges()
    assert len(papers) == 2, f"Expected 2 papers, got {len(papers)}"
    assert len(edges) == 2, f"Expected 2 edges, got {len(edges)}"
    print("[PASS] Database CRUD passed successfully!")

    print("\n=== 2. Testing GraphEngine & Network Analytics ===")
    engine = GraphEngine(papers, edges)
    analysis = engine.analyze()
    assert "clusters" in analysis
    assert "pagerank" in analysis
    assert "landmarks" in analysis
    print(f"[PASS] Analysis computed: {len(analysis['clusters'])} nodes clustered, PageRank calculated!")

    cyto = engine.to_cytoscape()
    assert len(cyto.elements["nodes"]) == 2
    assert len(cyto.elements["edges"]) == 2
    assert cyto.stats["total_papers"] == 2
    print(f"[PASS] Cytoscape translation passed: {len(cyto.elements['nodes'])} nodes, {len(cyto.elements['edges'])} edges!")

    print("\n=== 3. Testing Literature Connector (Shortest Bridge Path) ===")
    bridge = engine.find_shortest_bridge("test-p2", "test-p1")
    assert bridge is not None
    assert bridge.length == 1
    assert bridge.path == ["test-p2", "test-p1"]
    print(f"[PASS] Bridge Path found: {' -> '.join(bridge.path)} (Length: {bridge.length})")

    print("\n=== 4. Testing ReportGenerator (RESEARCH_REPORT.md) ===")
    md_report = ReportGenerator.generate_markdown(papers, edges, cyto.stats, cyto.clusters)
    assert "# Scientific Literature Synthesis" in md_report
    assert "Attention Is All You Need" in md_report
    assert "BERT Language Model" in md_report
    print(f"[PASS] Markdown synthesis report generated successfully (length: {len(md_report)} bytes)!")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
