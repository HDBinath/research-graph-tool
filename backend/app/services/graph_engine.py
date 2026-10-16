import networkx as nx
from typing import List, Dict, Any, Optional
from app.models.graph import Paper, Edge, CytoNode, CytoEdge, CytoNodeData, CytoEdgeData, GraphResponse, BridgePathResponse

class GraphEngine:
    def __init__(self, papers: List[Paper], edges: List[Edge]):
        self.papers = papers
        self.edges = edges
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        """Populate NetworkX graph with nodes and directed edges."""
        for p in self.papers:
            self.graph.add_node(
                p.id,
                label=p.title,
                type="paper",
                year=p.year,
                authors=p.authors,
                citation_count=p.citation_count,
                abstract=p.abstract,
                claims=[c.model_dump() for c in p.claims]
            )

        for e in self.edges:
            self.graph.add_edge(
                e.source,
                e.target,
                id=e.id,
                type=e.type,
                provenance=e.provenance,
                confidence=e.confidence,
                evidence=e.evidence
            )

    def analyze(self) -> Dict[str, Any]:
        """Calculates PageRank, Leiden/Louvain community clusters, and centralities."""
        if len(self.graph) == 0:
            return {"clusters": {}, "pagerank": {}, "landmarks": set()}

        # 1. PageRank Calculation (Foundational / Landmark Papers)
        try:
            pagerank = nx.pagerank(self.graph, alpha=0.85, max_iter=100)
        except Exception:
            pagerank = {node: 1.0 / len(self.graph) for node in self.graph.nodes()}

        # Sort and mark top 25% nodes as Landmark Papers
        sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
        landmark_cutoff = max(1, int(len(sorted_pr) * 0.25))
        landmarks = set(k for k, v in sorted_pr[:landmark_cutoff])

        # 2. Native Community Detection via NetworkX Louvain
        undirected_g = self.graph.to_undirected()
        clusters = {}
        if len(undirected_g) > 1 and len(undirected_g.edges()) > 0:
            try:
                communities = nx.community.louvain_communities(undirected_g, seed=42)
                for idx, comp in enumerate(communities):
                    for node in comp:
                        clusters[node] = idx
            except Exception:
                for idx, comp in enumerate(nx.connected_components(undirected_g)):
                    for node in comp:
                        clusters[node] = idx
        else:
            for idx, node in enumerate(self.graph.nodes()):
                clusters[node] = 0

        return {
            "clusters": clusters,
            "pagerank": pagerank,
            "landmarks": landmarks
        }

    def to_cytoscape(self) -> GraphResponse:
        """Converts graph into Cytoscape.js JSON structure with clusters & metrics."""
        analysis = self.analyze()
        clusters = analysis["clusters"]
        pagerank = analysis["pagerank"]
        landmarks = analysis["landmarks"]

        cyto_nodes: List[CytoNode] = []
        cyto_edges: List[CytoEdge] = []

        # Map cluster IDs to human-readable names
        cluster_names = {
            0: "Foundational Architectures",
            1: "Efficiency & Sub-quadratic Scaling",
            2: "Alignment, RLHF & Direct Optimization",
            3: "Multimodal Synthesis & Reasoning",
            4: "Evaluation & Linguistic Benchmarks"
        }

        # Build Cytoscape Paper Nodes
        for p in self.papers:
            c_id = clusters.get(p.id, 0)
            pr_val = pagerank.get(p.id, 0.0)
            is_lm = p.id in landmarks

            cyto_nodes.append(CytoNode(
                data=CytoNodeData(
                    id=p.id,
                    label=p.title,
                    type="paper",
                    cluster=c_id,
                    pagerank=round(pr_val, 4),
                    is_landmark=is_lm,
                    details={
                        "title": p.title,
                        "authors": p.authors,
                        "year": p.year,
                        "abstract": p.abstract,
                        "doi": p.doi,
                        "citation_count": p.citation_count,
                        "cluster_name": cluster_names.get(c_id, f"Thematic School {c_id + 1}"),
                        "claims": [c.model_dump() for c in p.claims]
                    }
                )
            ))

        # Build Cytoscape Edges
        for e in self.edges:
            if self.graph.has_node(e.source) and self.graph.has_node(e.target):
                cyto_edges.append(CytoEdge(
                    data=CytoEdgeData(
                        id=e.id,
                        source=e.source,
                        target=e.target,
                        type=e.type,
                        provenance=e.provenance,
                        confidence=e.confidence,
                        evidence=e.evidence
                    )
                ))

        # Cluster metadata
        cluster_counts = {}
        for c in clusters.values():
            cluster_counts[c] = cluster_counts.get(c, 0) + 1

        clusters_meta = [
            {
                "id": cid,
                "name": cluster_names.get(cid, f"Thematic School {cid + 1}"),
                "paper_count": count
            }
            for cid, count in cluster_counts.items()
        ]

        stats = {
            "total_papers": len(self.papers),
            "total_edges": len(cyto_edges),
            "total_claims": sum(len(p.claims) for p in self.papers),
            "total_clusters": len(clusters_meta),
            "citations_count": sum(1 for e in self.edges if e.type == "CITES"),
            "supports_count": sum(1 for e in self.edges if e.type == "SUPPORTS"),
            "contradicts_count": sum(1 for e in self.edges if e.type == "CONTRADICTS")
        }

        return GraphResponse(
            elements={"nodes": cyto_nodes, "edges": cyto_edges},
            stats=stats,
            clusters=clusters_meta
        )

    def find_shortest_bridge(self, source_id: str, target_id: str) -> Optional[BridgePathResponse]:
        """Calculates shortest bridging path between two papers (Inciteful connector)."""
        undirected = self.graph.to_undirected()
        if not (undirected.has_node(source_id) and undirected.has_node(target_id)):
            return None

        try:
            path = nx.shortest_path(undirected, source=source_id, target=target_id)
            node_dicts = []
            edge_dicts = []

            for nid in path:
                p = next((x for x in self.papers if x.id == nid), None)
                if p:
                    node_dicts.append({
                        "id": p.id,
                        "title": p.title,
                        "year": p.year,
                        "authors": p.authors
                    })

            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                edge_obj = next((e for e in self.edges if (e.source == u and e.target == v) or (e.source == v and e.target == u)), None)
                if edge_obj:
                    edge_dicts.append(edge_obj.model_dump())
                else:
                    edge_dicts.append({"id": f"bridge-{u}-{v}", "source": u, "target": v, "type": "CONNECTED"})

            return BridgePathResponse(
                source_id=source_id,
                target_id=target_id,
                path=path,
                nodes=node_dicts,
                edges=edge_dicts,
                length=len(path) - 1
            )
        except nx.NetworkXNoPath:
            return None
