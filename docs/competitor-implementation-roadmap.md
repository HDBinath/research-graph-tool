# ResearchGraph: competitor analysis and implementation roadmap

Reviewed 2026-10-13. Based on source inspection and current official product pages. Proposed endpoints, schemas, and rankings below are design suggestions, not implemented capabilities or descriptions of competitors' private algorithms.

## Assessment

ResearchGraph has a useful prototype foundation: FastAPI, SQLite, NetworkX, React, and Cytoscape.js already support import, paper inspection, filters, community detection, shortest paths, and exports. Its principal gaps are discovery outside the uploaded corpus, reliable reference resolution, inspectable scientific evidence, and persistent research workflows.

Retain the existing stack. The first milestone should be a trustworthy discovery graph; the second should add evidence-backed claim relationships. A graph database or a frontend rewrite is not necessary for the initial milestones.

## Competitor comparison

| Product | Verified capability | Gap in ResearchGraph | Suggested equivalent |
|---|---|---|---|
| Connected Papers | Similarity based on co-citation and bibliographic coupling | No citation-based similarity or external candidate discovery | Expand citation neighborhoods and compute shared-reference/shared-citer scores |
| ResearchRabbit | Adaptive recommendations; maps connecting papers, authors, and concepts; organization into collections | Single global corpus with no recommendation feedback or author graph | Saved collections, relevance feedback, multi-paper candidate ranking, author IDs |
| Litmaps | Citation discovery, configurable maps, annotations, sharing, Zotero sync, new-paper monitoring | One layout; no annotations, saved maps, sharing, sync, or monitoring | Saved map state, timeline view, notes, import/export, scheduled collection refresh |
| Inciteful | Paper discovery and citation paths connecting two papers; exploration of multiple paths | One shortest path within the local graph across all relationship types | Citation-only connector, external neighborhood expansion, several bounded alternative paths |
| scite | Citation evidence, sentence-level verification, assistant, API, MCP, Zotero integration | Abstract keyword rules and generic evidence descriptions | Extract citation contexts; classify their intent; show exact source excerpts |
| Elicit | Semantic search, interactive extraction tables, screening, reports, sentence-level citations | Claims list and template report only | Configurable evidence matrix, review decisions, source-backed synthesis |

Do not reuse the older landscape report's assertion that competitors offer no API/MCP access: scite explicitly offers both. Combining graph visualization and AI evidence is a product direction, not proof of an uncontested market.

## Fix before adding features

1. `backend/app/services/graph_engine.py`: `nx.DiGraph` retains only one edge record for each ordered paper pair. A read-only reproduction with CITES and SUPPORTS returned two displayed edges but one analysis edge, with SUPPORTS overwriting CITES attributes. Preserve relationships in a `MultiDiGraph`, then derive explicit graph projections for each analysis. Citation PageRank should use CITES edges; similarity communities should use weighted similarity edges. Changing graph class alone is insufficient because analytics need appropriate projections.
2. `backend/app/main.py`: citation matching checks only the newly uploaded paper's references against papers already present. Importing a cited paper later does not repair references from earlier papers. Persist structured references and unresolved matches, then resolve in both directions when a new work is added.
3. `main.py` and `database.py`: count-based IDs and missing canonical deduplication permit duplicate works and concurrent ID collisions. Use UUIDs for local records, unique normalized external identifiers, and an explicit merge strategy for preprint/published versions.
4. `services/llm_extractor.py`: shared words and words like 'however' do not establish contradiction. Model/provider methods for relationship inference are heuristic fallbacks. Mark these suggestions as unreviewed; do not treat assigned confidence values as calibrated probabilities.
5. `services/pdf_parser.py`: reference limits, truncated text, first-DOI matching, and default year 2024 can corrupt results. Preserve sections and page locations; keep unknown dates null; resolve the paper's DOI separately from DOIs in its bibliography.
6. `services/report_generator.py`: reports use stored `Paper.cluster_id`, `pagerank_score`, and `is_landmark`, while the canvas uses fresh analysis. Share a single analysis result between report generation and rendering. Replace fixed domain labels with neutral community labels or topic summaries. The implemented clustering algorithm is Louvain, not Leiden.
7. `frontend/src/App.jsx`: an empty graph triggers sample seeding; clearing followed by refresh repopulates it. Make demo loading explicit and keep an empty library empty. Sample loading currently clears the whole database, so isolate demo data from user collections.
8. Upload handling: BibTeX is advertised but every file goes through the PDF parser. Dispatch supported formats, return per-file errors, and store uploads under generated filenames inside the intended directory.
9. `GraphCanvas.jsx`: filters destroy and rebuild the canvas. Apply visibility/style updates without rebuilding; persist positions and viewport.
10. Existing test scripts clear or reseed the configured database. Use isolated temporary databases for validation; current scripts do not establish extraction accuracy.

## Milestone 1: discover papers from one or more seeds

Extend `academic_api.py` with search, canonical work lookup, reference expansion, and citing-work retrieval. Persist all required provider IDs and reference links rather than discarding them after metadata enrichment. Use current provider documentation for authentication, pagination, quotas, retries, and filtering.

Suggested API:

- `GET /api/search?q=...`: candidate works with title, authors, year, and identifiers.
- `POST /api/collections`: create a research collection.
- `POST /api/collections/{id}/papers`: add selected works or upload results.
- `POST /api/collections/{id}/expand`: expand one bounded citation neighborhood and return a job ID.
- `GET /api/jobs/{id}`: durable status and per-source errors.

Start with one-hop expansion and a configurable paper/request budget. Cache provider responses and distinguish 'no results' from incomplete retrieval or rate limiting. Do not promise exhaustive literature coverage.

Proposed tables: `collections`, `collection_papers`, `external_identifiers`, `references`, `import_jobs`, `provider_cache`. A paper can belong to multiple collections; reading status and notes may vary by collection.

Acceptance: adding a DOI discovers actual referenced/citing works; importing the same work twice does not duplicate it; citation links are identical regardless of import order; restarting preserves jobs and collections.

## Milestone 2: similarity and recommendations

For paper A, let R(A) be its resolved references and C(A) its retrieved citing papers.

- Bibliographic coupling: shared R(A) and R(B).
- Co-citation: shared C(A) and C(B).
- A simple normalized score: size of the intersection divided by size of the union. Empty unions yield zero.

These are transparent initial measures, not a reproduction of Connected Papers' proprietary ranking. Restrict scoring to the retrieved candidate pool. Label missing citation coverage so a zero is not mistaken for evidence of unrelatedness.

Add a separate SIMILAR_TO relationship and show why a recommendation was made, such as 'shares six references with your collection'. Similarity must never imply support. Add semantic similarity later if citation-only recommendations miss new or sparsely cited papers; select an embedding model using relevant retrieval benchmarks before adopting it.

Prior-work suggestions can count how many collection papers cite a candidate. Follow-up suggestions can count how many collection papers a candidate cites. Normalize relevance and allow users to favor recent work rather than simply promoting highly cited papers.

## Milestone 3: saved maps, timeline, and reference-manager workflow

Extend Cytoscape rather than replacing it. Save positions, zoom, selected papers, filters, and map settings. A timeline can use Cytoscape's preset layout with x-position derived from publication date and y-position assigned by community or citation-count bands. Place unknown dates in a separate lane and avoid inventing dates.

Add notes, tags, unread/reading/read status, and collection-scoped searching. Implement BibTeX parsing using the existing dependency and matching export first. Add RIS and Zotero integration after that stable interchange layer exists. Begin sharing with an exported static map snapshot; cloud collaboration requires authentication, permissions, and synchronization and is a separate larger milestone.

Acceptance: a map survives reload; filtering preserves node positions; unknown dates remain visible; BibTeX round trips preserve identifiers and title/author metadata.

## Milestone 4: inspectable evidence and claim relationships

Use a structured scientific PDF parser such as GROBID to extract sections, references, citation callouts, and coordinates. Keep the existing PDF reader as a fallback. GROBID is a separate Java service; on this Windows project, assess a Docker/WSL deployment before choosing it as a mandatory dependency.

Persist `document_sections` and `evidence_spans` with paper ID, document version/hash, page, section, exact excerpt, and offsets or bounding boxes. Link each citation context to its resolved target work.

Classify citation contexts as SUPPORTING, CONTRASTING, MENTIONING, or UNCERTAIN. Keep methodological extension distinct from empirical support. Add scope information (population/task, intervention/method, comparator, outcome) before claiming two findings conflict. Multiple contexts may support different judgments between the same paper pair.

Suggested relationship fields: `source_id`, `target_id`, `type`, `evidence_span_id`, `extractor_version`, `model_version`, `review_status`. Store model scores separately from validated confidence. Reject generated quotations that cannot be found in the source text.

Add edge inspection to the UI: excerpt, source location, classification, reason, and confirm/reject controls. Later introduce explicit Claim nodes linked by ASSERTS and supported by evidence spans.

Acceptance: every asserted support/contrast link opens an actual excerpt; a small labeled domain-specific evaluation measures per-class precision/recall; uncertain cases remain uncertain rather than being forced into a category.

## Milestone 5: extraction matrix, monitoring, and grounded answers

Evidence matrix: user-configurable fields such as method, dataset/population, sample size, metric, result, and limitation. Each cell stores value plus evidence location; missing values are 'not reported'. Allow correction and CSV export. Screening decisions should retain inclusion/exclusion reasons.

Monitoring: store per-collection query parameters and previous discovered IDs. Refresh references/citers and relevance candidates using a scheduler; deduplicate updates and show new-paper badges. Include old publications newly indexed, not just papers published after the last run. A local process must be running for scheduled monitoring to work. Email delivery is an optional later product feature.

Grounded questions: retrieve relevant sections first, optionally expand graph neighbors, then generate answers with evidence-span citations. Refuse to invent evidence when retrieval is insufficient. Evaluate answers against known corpus questions before promoting this as reliable scientific synthesis.

Improve the connector with a citation-only undirected projection, bounded external expansion from both seeds, and a limited number of shortest/near-shortest paths. Preserve original citation direction in the underlying data. A small downloaded neighborhood will not match Inciteful's global-corpus reach.

## Suggested release order

1. Correctness: identity, citations, graph projections, truthful metadata, reports, isolated tests.
2. Discovery: search/DOI seeds, collections, bounded citation expansion, explainable recommendations.
3. Workflow: saved layouts, timeline, notes, real BibTeX interchange.
4. Evidence: structured text, citation contexts, source-linked classification, human review.
5. Advanced workflow: evidence matrix, monitoring, grounded questions, author/method/dataset views, collaboration.

Positioning hypothesis: a local research workspace combining discovery graphs with inspectable evidence and editable claim relationships. Validate that need with researchers using real collections. API/MCP access alone is already available elsewhere; local processing, portability, transparent evidence, and workflow quality must carry the differentiation.

## Sources checked

- [Connected Papers: similarity methodology](https://www.connectedpapers.com/about)
- [ResearchRabbit features](https://www.researchrabbit.ai/features)
- [Litmaps features](https://www.litmaps.com/features)
- [Inciteful: connector explanation](https://incitefulmed.com/academic/help/literature-connector-explained)
- [Inciteful: paper discovery and imports](https://incitefulmed.com/academic/)
- [scite: evidence and integrations](https://scite.ai/)
- [Elicit: extraction, screening, and source citations](https://elicit.com/)
- [OpenAlex: Works overview](https://help.openalex.org/data/works/)
- [GROBID: structured extraction and citation contexts](https://grobid.readthedocs.io/en/latest/Introduction/)

Review scope: source inspection, official feature-page research, and one isolated in-memory graph reproduction. No live import pipeline or classifier accuracy evaluation was performed. The application code was not changed.
