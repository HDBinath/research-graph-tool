from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class Author(BaseModel):
    name: str
    affiliation: Optional[str] = None

class Claim(BaseModel):
    id: str
    text: str
    paper_id: str
    category: Literal["Finding", "Hypothesis", "Methodology", "Limitation", "Dataset"] = "Finding"
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    polarity: Literal["positive", "negative", "neutral"] = "positive"

class Paper(BaseModel):
    id: str
    title: str
    authors: List[str] = []
    year: Optional[int] = None
    doi: Optional[str] = None
    abstract: Optional[str] = None
    citation_count: int = 0
    pdf_filename: Optional[str] = None
    openalex_id: Optional[str] = None
    cluster_id: int = 0
    pagerank_score: float = 0.0
    is_landmark: bool = False
    claims: List[Claim] = []
    references: List[str] = [] # list of paper IDs or DOIs cited

class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: Literal["CITES", "CO_AUTHORS", "SUPPORTS", "CONTRADICTS", "EXTENDS", "USES_METHOD", "EVALUATES_ON"]
    provenance: Literal["EXTRACTED", "INFERRED", "AMBIGUOUS"] = "EXTRACTED"
    confidence: float = 1.0
    evidence: Optional[str] = None

# Cytoscape format schemas
class CytoNodeData(BaseModel):
    id: str
    label: str
    type: Literal["paper", "claim", "author", "methodology", "dataset"] = "paper"
    cluster: int = 0
    pagerank: float = 0.0
    is_landmark: bool = False
    details: Dict[str, Any] = {}

class CytoNode(BaseModel):
    data: CytoNodeData

class CytoEdgeData(BaseModel):
    id: str
    source: str
    target: str
    type: str
    provenance: str = "EXTRACTED"
    confidence: float = 1.0
    evidence: Optional[str] = None

class CytoEdge(BaseModel):
    data: CytoEdgeData

class GraphResponse(BaseModel):
    elements: Dict[str, List[Any]] # {"nodes": [CytoNode], "edges": [CytoEdge]}
    stats: Dict[str, Any]
    clusters: List[Dict[str, Any]]

class BridgePathResponse(BaseModel):
    source_id: str
    target_id: str
    path: List[str]
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    length: int
