import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db, save_paper, save_edge, get_all_papers, get_all_edges, clear_database
from app.models.graph import Paper, Claim, Edge, GraphResponse, BridgePathResponse
from app.services.pdf_parser import PDFParser
from app.services.academic_api import AcademicAPIClient
from app.services.llm_extractor import LLMExtractor
from app.services.graph_engine import GraphEngine
from app.services.report_generator import ReportGenerator
from app.services.writer_service import writer_service
from pydantic import BaseModel

app = FastAPI(title=settings.app_name, version=settings.version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

academic_client = AcademicAPIClient()
llm_extractor = LLMExtractor()

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name, "version": settings.version}

@app.get("/api/graph", response_model=GraphResponse)
async def get_graph():
    """Returns nodes and edges formatted for Cytoscape.js with Leiden clusters and PageRank."""
    papers = await get_all_papers()
    edges = await get_all_edges()
    engine = GraphEngine(papers, edges)
    return engine.to_cytoscape()

@app.get("/api/graph/connector", response_model=Optional[BridgePathResponse])
async def get_connector(source_id: str = Query(...), target_id: str = Query(...)):
    """Computes shortest bridging path between two distant papers (Inciteful connector)."""
    papers = await get_all_papers()
    edges = await get_all_edges()
    engine = GraphEngine(papers, edges)
    bridge = engine.find_shortest_bridge(source_id, target_id)
    if not bridge:
        raise HTTPException(status_code=404, detail="No connecting path found between selected papers.")
    return bridge

@app.get("/api/report/markdown", response_class=PlainTextResponse)
async def get_report():
    """Generates a complete literature review digest (RESEARCH_REPORT.md)."""
    papers = await get_all_papers()
    edges = await get_all_edges()
    engine = GraphEngine(papers, edges)
    cyto = engine.to_cytoscape()
    return ReportGenerator.generate_markdown(papers, edges, cyto.stats, cyto.clusters)

@app.get("/api/graph/export-json")
async def export_graph_json():
    """Exports raw graph data as JSON."""
    papers = await get_all_papers()
    edges = await get_all_edges()
    engine = GraphEngine(papers, edges)
    return engine.to_cytoscape().model_dump()

@app.post("/api/papers/upload")
async def upload_papers(files: List[UploadFile] = File(...)):
    """Upload and process PDF papers or BibTeX files."""
    uploaded_records = []
    
    for file in files:
        if not file.filename:
            continue
            
        file_path = Path(settings.uploads_dir) / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse PDF
        try:
            parsed = PDFParser.extract_from_pdf(str(file_path))
            paper_id = f"p-{len(await get_all_papers()) + 1}"
            
            # Enrich via OpenAlex if DOI or Title available
            enriched_title = parsed["title"]
            enriched_year = parsed["year"]
            citation_cnt = 0
            openalex_id = None
            
            if parsed.get("doi"):
                oa = await academic_client.lookup_by_doi(parsed["doi"])
                if oa:
                    enriched_title = oa["title"] or enriched_title
                    enriched_year = oa["year"] or enriched_year
                    citation_cnt = oa["citation_count"]
                    openalex_id = oa["openalex_id"]
            elif parsed.get("title"):
                oa = await academic_client.lookup_by_title(parsed["title"])
                if oa:
                    enriched_year = oa["year"] or enriched_year
                    citation_cnt = oa["citation_count"]
                    openalex_id = oa["openalex_id"]

            # Extract Claims via LLM / Heuristic
            claims = await llm_extractor.extract_paper_claims(
                paper_id, enriched_title, parsed["abstract"], parsed["full_text"]
            )

            new_paper = Paper(
                id=paper_id,
                title=enriched_title,
                authors=parsed["authors"],
                year=enriched_year,
                doi=parsed["doi"],
                abstract=parsed["abstract"],
                citation_count=citation_cnt,
                pdf_filename=file.filename,
                openalex_id=openalex_id,
                claims=claims,
                references=parsed["references"]
            )
            
            await save_paper(new_paper)
            
            # Link to existing papers if citations or concepts match
            all_existing = await get_all_papers()
            for existing in all_existing:
                if existing.id == paper_id:
                    continue
                # Citation check
                if any(existing.title.lower() in ref.lower() for ref in parsed["references"]):
                    await save_edge(Edge(
                        id=f"cite-{paper_id}-{existing.id}",
                        source=paper_id,
                        target=existing.id,
                        type="CITES",
                        provenance="EXTRACTED",
                        confidence=1.0,
                        evidence="Bibliographic reference match"
                    ))
                # Semantic relation check
                rel_edge = await llm_extractor.infer_cross_paper_relations(new_paper.model_dump(), existing.model_dump())
                if rel_edge:
                    await save_edge(rel_edge)

            uploaded_records.append(new_paper.model_dump())
        except Exception as e:
            continue

    return {"uploaded": len(uploaded_records), "papers": uploaded_records}

@app.post("/api/papers/seed-sample")
async def seed_sample_corpus():
    """Seeds the database with a high-fidelity foundational literature graph on Attention & Transformers."""
    await clear_database()
    
    sample_papers = [
        Paper(
            id="p-att-2017",
            title="Attention Is All You Need",
            authors=["Vaswani et al.", "Shazeer", "Parmar", "Uszkoreit", "Jones"],
            year=2017,
            doi="10.48550/arXiv.1706.03762",
            citation_count=135000,
            abstract="We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism to draw global dependencies between input and output.",
            is_landmark=True,
            pagerank_score=0.18,
            cluster_id=0,
            claims=[
                Claim(id="c-att-1", paper_id="p-att-2017", text="Self-attention replaces recurrent neural networks entirely for sequence transduction.", category="Methodology", confidence=0.98),
                Claim(id="c-att-2", paper_id="p-att-2017", text="Transformers train significantly faster than architectures based on recurrent or convolutional layers.", category="Finding", confidence=0.95)
            ]
        ),
        Paper(
            id="p-bert-2018",
            title="BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
            authors=["Devlin", "Chang", "Lee", "Toutanova"],
            year=2018,
            doi="10.48550/arXiv.1810.04805",
            citation_count=110000,
            abstract="We introduce BERT, designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context.",
            is_landmark=True,
            pagerank_score=0.15,
            cluster_id=0,
            claims=[
                Claim(id="c-bert-1", paper_id="p-bert-2018", text="Bidirectional pre-training substantially outperforms unidirectional models on downstream language understanding.", category="Finding", confidence=0.96),
                Claim(id="c-bert-2", paper_id="p-bert-2018", text="Masked language modeling enables deep bidirectional representations without information leakage.", category="Methodology", confidence=0.94)
            ]
        ),
        Paper(
            id="p-gpt3-2020",
            title="Language Models are Few-Shot Learners (GPT-3)",
            authors=["Brown et al.", "Mann", "Ryder", "Subbiah", "Kaplan"],
            year=2020,
            doi="10.48550/arXiv.2005.14165",
            citation_count=45000,
            abstract="We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes rivaling prior state-of-the-art fine-tuning approaches.",
            is_landmark=True,
            pagerank_score=0.14,
            cluster_id=2,
            claims=[
                Claim(id="c-gpt3-1", paper_id="p-gpt3-2020", text="Scaling model parameter count unlocks in-context few-shot learning without parameter updates.", category="Finding", confidence=0.95),
                Claim(id="c-gpt3-2", paper_id="p-gpt3-2020", text="Task-agnostic prompting can match supervised fine-tuned baselines on complex reasoning benchmarks.", category="Hypothesis", confidence=0.88)
            ]
        ),
        Paper(
            id="p-roberta-2019",
            title="RoBERTa: A Robustly Optimized BERT Pretraining Approach",
            authors=["Liu", "Ott", "Goyal", "Du", "Joshi", "Stoyanov"],
            year=2019,
            doi="10.48550/arXiv.1907.11692",
            citation_count=22000,
            abstract="We find that BERT was significantly undertrained, and show that training the model longer with larger batches and without the next sentence prediction objective matches or exceeds subsequent models.",
            is_landmark=False,
            pagerank_score=0.08,
            cluster_id=0,
            claims=[
                Claim(id="c-rob-1", paper_id="p-roberta-2019", text="Removing the next sentence prediction (NSP) objective improves downstream task performance.", category="Finding", confidence=0.92),
                Claim(id="c-rob-2", paper_id="p-roberta-2019", text="BERT original training was substantially undertrained in duration and batch size.", category="Finding", confidence=0.96)
            ]
        ),
        Paper(
            id="p-flash-2022",
            title="FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
            authors=["Dao", "Fu", "Ermon", "Rudra", "Re"],
            year=2022,
            doi="10.48550/arXiv.2205.14135",
            citation_count=4200,
            abstract="We argue that attention algorithms must be IO-aware—accounting for reads and writes between levels of fast SRAM and slow HBM memory to achieve sub-quadratic wall-clock scaling.",
            is_landmark=True,
            pagerank_score=0.12,
            cluster_id=1,
            claims=[
                Claim(id="c-fl-1", paper_id="p-flash-2022", text="IO-aware tiling achieves 2-4x speedups without approximating the attention matrix.", category="Finding", confidence=0.97),
                Claim(id="c-fl-2", paper_id="p-flash-2022", text="Standard attention is memory-bandwidth bound rather than compute-bound on modern GPUs.", category="Finding", confidence=0.95)
            ]
        ),
        Paper(
            id="p-linear-2020",
            title="Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention",
            authors=["Katharopoulos", "Vyas", "Yisong", "Fleuret"],
            year=2020,
            doi="10.48550/arXiv.2006.16236",
            citation_count=1800,
            abstract="We express self-attention as a linear dot-product of kernel feature maps, reducing computational complexity from O(N^2) to O(N) and enabling causal inference in constant memory.",
            is_landmark=False,
            pagerank_score=0.06,
            cluster_id=1,
            claims=[
                Claim(id="c-lin-1", paper_id="p-linear-2020", text="Kernelized linear attention enables exact autoregressive generation in constant O(1) memory per step.", category="Methodology", confidence=0.91),
                Claim(id="c-lin-2", paper_id="p-linear-2020", text="Linear attention approximates standard softmax attention with minimal degradation in perplexity.", category="Hypothesis", confidence=0.76)
            ]
        ),
        Paper(
            id="p-mamba-2023",
            title="Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
            authors=["Gu", "Dao"],
            year=2023,
            doi="10.48550/arXiv.2312.00752",
            citation_count=1600,
            abstract="We introduce selective state space models (SSMs) that incorporate data-dependent selectivity to overcome the fundamental expressive limitations of prior sub-quadratic architectures.",
            is_landmark=True,
            pagerank_score=0.11,
            cluster_id=1,
            claims=[
                Claim(id="c-mam-1", paper_id="p-mamba-2023", text="Selective state space gating outperforms Transformers of equal parameter size on sequence modeling.", category="Finding", confidence=0.92),
                Claim(id="c-mam-2", paper_id="p-mamba-2023", text="Linear attention models fail on content-based reasoning because their state compressions are time-invariant.", category="Limitation", confidence=0.89)
            ]
        ),
        Paper(
            id="p-instruct-2022",
            title="Training Language Models to Follow Instructions with Human Feedback",
            authors=["Ouyang et al.", "Wu", "Jiang", "Almeida", "Wainwright"],
            year=2022,
            doi="10.48550/arXiv.2203.02155",
            citation_count=8500,
            abstract="We use reinforcement learning from human feedback (RLHF) to fine-tune GPT-3 to follow a broad class of written instructions, significantly improving user alignment.",
            is_landmark=True,
            pagerank_score=0.09,
            cluster_id=2,
            claims=[
                Claim(id="c-ins-1", paper_id="p-instruct-2022", text="Labeler preference aligns models to human intent far better than raw language modeling scale alone.", category="Finding", confidence=0.94),
                Claim(id="c-ins-2", paper_id="p-instruct-2022", text="RLHF models suffer from an alignment tax where performance on standard academic NLP benchmarks can degrade.", category="Limitation", confidence=0.87)
            ]
        ),
        Paper(
            id="p-dpo-2023",
            title="Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
            authors=["Rafailov", "Sharma", "Mitchell", "Ermon", "Manning", "Finn"],
            year=2023,
            doi="10.48550/arXiv.2305.18290",
            citation_count=2100,
            abstract="We introduce DPO, an algorithm to optimize language models from preference data without training a separate explicit reward model or sampling during fine-tuning.",
            is_landmark=False,
            pagerank_score=0.07,
            cluster_id=2,
            claims=[
                Claim(id="c-dpo-1", paper_id="p-dpo-2023", text="DPO matches or exceeds PPO-based RLHF stability and performance while eliminating reward model training.", category="Finding", confidence=0.93),
                Claim(id="c-dpo-2", paper_id="p-dpo-2023", text="Reinforcement learning optimization in RLHF is mathematically equivalent to closed-form binary cross-entropy.", category="Methodology", confidence=0.96)
            ]
        )
    ]

    sample_edges = [
        # Citations
        Edge(id="e-cite-1", source="p-bert-2018", target="p-att-2017", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-2", source="p-gpt3-2020", target="p-att-2017", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-3", source="p-roberta-2019", target="p-bert-2018", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-4", source="p-flash-2022", target="p-att-2017", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-5", source="p-linear-2020", target="p-att-2017", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-6", source="p-mamba-2023", target="p-linear-2020", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-7", source="p-mamba-2023", target="p-flash-2022", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-8", source="p-instruct-2022", target="p-gpt3-2020", type="CITES", provenance="EXTRACTED", confidence=1.0),
        Edge(id="e-cite-9", source="p-dpo-2023", target="p-instruct-2022", type="CITES", provenance="EXTRACTED", confidence=1.0),

        # Corroborated Evidence (SUPPORTS)
        Edge(id="e-supp-1", source="p-roberta-2019", target="p-bert-2018", type="SUPPORTS", provenance="INFERRED", confidence=0.96, evidence="RoBERTa replicates and strengthens bidirectional pre-training claims while demonstrating scalability with longer training schedules."),
        Edge(id="e-supp-2", source="p-flash-2022", target="p-att-2017", type="SUPPORTS", provenance="INFERRED", confidence=0.98, evidence="FlashAttention preserves exact mathematical softmax attention while accelerating wall-clock execution."),
        Edge(id="e-supp-3", source="p-instruct-2022", target="p-gpt3-2020", type="SUPPORTS", provenance="INFERRED", confidence=0.92, evidence="Confirms that scale provides latent reasoning capacity, but adds alignment fine-tuning."),

        # Active Scientific Contradictions (CONTRADICTS)
        Edge(id="e-cont-1", source="p-roberta-2019", target="p-bert-2018", type="CONTRADICTS", provenance="INFERRED", confidence=0.94, evidence="RoBERTa empirically refutes BERT's original Next Sentence Prediction (NSP) objective, proving NSP degrades rather than helps task performance."),
        Edge(id="e-cont-2", source="p-mamba-2023", target="p-linear-2020", type="CONTRADICTS", provenance="INFERRED", confidence=0.89, evidence="Mamba disputes Linear Attention claims of parity, demonstrating that fixed-state linear attention cannot perform selective associative recall."),
        Edge(id="e-cont-3", source="p-dpo-2023", target="p-instruct-2022", type="CONTRADICTS", provenance="INFERRED", confidence=0.91, evidence="DPO challenges the necessity of complex PPO reinforcement learning loops and separate reward models, showing a closed-form loss is strictly superior in stability.")
    ]

    for p in sample_papers:
        await save_paper(p)
    for e in sample_edges:
        await save_edge(e)

    return {"message": "Sample research literature seeded successfully", "papers_count": len(sample_papers), "edges_count": len(sample_edges)}
    
# --- PaperStudio AI Writing Endpoints ---

class AutocompleteRequest(BaseModel):
    current_text: str
    paper_ids: Optional[List[str]] = None

class SynthesizeDebateRequest(BaseModel):
    paper_a_id: str
    paper_b_id: str
    relation: Optional[str] = "CONTRADICTS"

class GenerateBridgeRequest(BaseModel):
    path_ids: List[str]

class RephraseRequest(BaseModel):
    text: str
    tone: Optional[str] = "scholarly"

@app.post("/api/writer/autocomplete")
async def writer_autocomplete(req: AutocompleteRequest):
    """Predicts next academic sentence grounded in active graph papers."""
    all_papers = await get_all_papers()
    if req.paper_ids:
        active = [p.model_dump() for p in all_papers if p.id in req.paper_ids]
    else:
        active = [p.model_dump() for p in all_papers]
    return await writer_service.autocomplete(req.current_text, active)

@app.post("/api/writer/synthesize-debate")
async def writer_synthesize_debate(req: SynthesizeDebateRequest):
    """Synthesizes literature review text discussing conflicting or extending claims."""
    all_papers = await get_all_papers()
    p_a = next((p.model_dump() for p in all_papers if p.id == req.paper_a_id), None)
    p_b = next((p.model_dump() for p in all_papers if p.id == req.paper_b_id), None)
    if not p_a or not p_b:
        raise HTTPException(status_code=404, detail="One or both papers not found in active graph.")
    return await writer_service.synthesize_debate(p_a, p_b, req.relation or "CONTRADICTS")

@app.post("/api/writer/generate-bridge")
async def writer_generate_bridge(req: GenerateBridgeRequest):
    """Generates a transitional paragraph linking disparate papers along a citation chain."""
    all_papers = await get_all_papers()
    paper_map = {p.id: p.model_dump() for p in all_papers}
    path_papers = [paper_map[pid] for pid in req.path_ids if pid in paper_map]
    if len(path_papers) < 2:
        raise HTTPException(status_code=400, detail="Bridge requires at least two valid papers.")
    return await writer_service.generate_bridge(path_papers)

@app.post("/api/writer/rephrase")
async def writer_rephrase(req: RephraseRequest):
    """Converts user input into formal scholarly phrasing."""
    return await writer_service.paraphrase_academic(req.text, req.tone or "scholarly")

@app.delete("/api/graph/clear")
async def clear_all():
    """Clears all stored papers and graph edges."""
    await clear_database()
    return {"message": "Knowledge graph database cleared"}

# Serve frontend production bundle directly through FastAPI
dist_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = dist_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_path / "index.html")
