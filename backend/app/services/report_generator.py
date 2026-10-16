from typing import List, Dict, Any
from app.models.graph import Paper, Edge

class ReportGenerator:
    @staticmethod
    def generate_markdown(papers: List[Paper], edges: List[Edge], stats: Dict[str, Any], clusters: List[Dict[str, Any]]) -> str:
        """Synthesizes knowledge graph data into a comprehensive Markdown literature report."""
        
        md = []
        md.append("# Scientific Literature Synthesis & Research Graph Digest")
        md.append("")
        md.append(f"**Generated:** Auto-compiled by ResearchGraph Engine  ")
        md.append(f"**Total Papers Analyzed:** {stats.get('total_papers', len(papers))} | **Total Citations Mapped:** {stats.get('citations_count', 0)} | **Extracted Claims:** {stats.get('total_claims', 0)}")
        md.append("")
        md.append("---")
        md.append("")
        
        # 1. Executive Summary
        md.append("## 1. Executive Summary")
        md.append("This document provides a holistic, single-load mental model of the research literature corpus. "
                  "Through deterministic citation analysis, algorithmic community clustering (Leiden algorithm), "
                  "and semantic evidence extraction, the corpus is organized into distinct schools of thought, "
                  "foundational landmark papers, and active scientific debates.")
        md.append("")

        # 2. Thematic Clusters
        md.append("## 2. Identified Schools of Thought (Thematic Clusters)")
        md.append("| Cluster ID | Thematic Domain | Paper Count | Key Exemplars |")
        md.append("| :--- | :--- | :--- | :--- |")
        for cl in clusters:
            cid = cl.get("id", 0)
            cname = cl.get("name", f"Cluster {cid}")
            cluster_papers = [p for p in papers if p.cluster_id == cid]
            exemplars = ", ".join([p.title[:35] + "..." if len(p.title) > 35 else p.title for p in cluster_papers[:2]]) or "N/A"
            md.append(f"| **Cluster {cid}** | {cname} | {len(cluster_papers)} | {exemplars} |")
        md.append("")

        # 3. Foundational Landmark Papers
        landmarks = [p for p in papers if p.is_landmark]
        md.append("## 3. Foundational Landmark Papers (High Centrality / PageRank)")
        if landmarks:
            for p in landmarks:
                authors_str = ", ".join(p.authors[:3])
                md.append(f"### 📌 {p.title} ({p.year or 'N/D'})")
                md.append(f"- **Authors:** {authors_str} | **Citations:** {p.citation_count} | **PageRank Score:** {round(p.pagerank_score, 4)}")
                if p.abstract:
                    md.append(f"- **Abstract Snippet:** {p.abstract[:280]}...")
                md.append("")
        else:
            md.append("*No landmark papers above centrality threshold yet.*")
            md.append("")

        # 4. Consensus vs. Active Debates (Supports & Contradicts)
        md.append("## 4. Scientific Consensus & Active Debates")
        
        supports_edges = [e for e in edges if e.type == "SUPPORTS"]
        contradicts_edges = [e for e in edges if e.type == "CONTRADICTS"]

        md.append("### 🟢 Corroborated Evidence & Consensus (`SUPPORTS`)")
        if supports_edges:
            for e in supports_edges[:8]:
                src_p = next((p for p in papers if p.id == e.source), None)
                tgt_p = next((p for p in papers if p.id == e.target), None)
                src_title = src_p.title if src_p else e.source
                tgt_title = tgt_p.title if tgt_p else e.target
                md.append(f"- **{src_title}** *corroborates* **{tgt_title}**")
                if e.evidence:
                    md.append(f"  > *Evidence:* {e.evidence} (Confidence: {int(e.confidence * 100)}%)")
        else:
            md.append("*No corroboration relations mapped yet.*")
        md.append("")

        md.append("### 🔴 Active Scientific Debates & Contrasting Findings (`CONTRADICTS`)")
        if contradicts_edges:
            for e in contradicts_edges:
                src_p = next((p for p in papers if p.id == e.source), None)
                tgt_p = next((p for p in papers if p.id == e.target), None)
                src_title = src_p.title if src_p else e.source
                tgt_title = tgt_p.title if tgt_p else e.target
                md.append(f"- **{src_title}** *disputes / contrasts with* **{tgt_title}**")
                if e.evidence:
                    md.append(f"  > *Contrasting Statement:* {e.evidence} (Confidence: {int(e.confidence * 100)}%)")
        else:
            md.append("*No direct contradictions flagged in current subset.*")
        md.append("")

        # 5. Claims & Methodology Matrix
        md.append("## 5. Extracted Claims & Methodology Matrix")
        all_claims = []
        for p in papers:
            for c in p.claims:
                all_claims.append((p.title, c))

        if all_claims:
            md.append("| Paper | Category | Claim / Assertion | Polarity |")
            md.append("| :--- | :--- | :--- | :--- |")
            for title, c in all_claims[:15]:
                short_title = title[:30] + "..." if len(title) > 30 else title
                md.append(f"| {short_title} | `{c.category}` | {c.text[:80]}... | {c.polarity} |")
        md.append("")

        # 6. Unexplored Research Gaps
        md.append("## 6. Identified Research Gaps & Open Opportunities")
        md.append("1. **Interdisciplinary Cross-Pollination:** Identify isolated clusters with zero bridging citations.")
        md.append("2. **Unreproduced Claims:** Scientific hypotheses with zero verifying or refuting secondary citations.")
        md.append("3. **Methodological Trade-offs:** Reconciling efficiency vs. expressive accuracy trade-offs across attention variants.")
        md.append("")
        md.append("---")
        md.append("*Report generated for instant consumption by researchers and AI reasoning agents.*")

        return "\n".join(md)
