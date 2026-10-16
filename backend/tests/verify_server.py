import httpx

def main():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10.0)

    # 1. Health
    r = client.get("/api/health")
    assert r.status_code == 200
    print("[PASS] Health endpoint:", r.json())

    # 2. Seed Sample Literature Corpus
    r = client.post("/api/papers/seed-sample")
    assert r.status_code == 200
    seed_res = r.json()
    print(f"[PASS] Seed Sample Corpus: {seed_res['papers_count']} papers, {seed_res['edges_count']} edges")

    # 3. Graph Elements & Metrics
    r = client.get("/api/graph")
    assert r.status_code == 200
    graph = r.json()
    nodes = graph["elements"]["nodes"]
    edges = graph["elements"]["edges"]
    stats = graph["stats"]
    clusters = graph["clusters"]
    assert len(nodes) == 9
    assert len(edges) >= 12
    print(f"[PASS] Graph Elements: {len(nodes)} papers, {len(edges)} edges, {len(clusters)} clusters")
    print(f"[PASS] Graph Stats: {stats}")

    # 4. Literature Connector (Shortest Bridging Path)
    r = client.get("/api/graph/connector", params={"source_id": "p-dpo-2023", "target_id": "p-att-2017"})
    assert r.status_code == 200
    bridge = r.json()
    path_str = " -> ".join(bridge["path"])
    print(f"[PASS] Literature Connector Bridge: {path_str} (Degrees of Separation: {bridge['length']})")

    # 5. Generated Literature Synthesis Report (RESEARCH_REPORT.md)
    r = client.get("/api/report/markdown")
    assert r.status_code == 200
    report_text = r.text
    assert "# Scientific Literature Synthesis" in report_text
    assert "FlashAttention" in report_text
    print(f"[PASS] Generated Literature Synthesis Report ({len(report_text)} bytes)")

    # 6. Frontend SPA Web Application
    r = client.get("/")
    assert r.status_code == 200
    assert "<!doctype html>" in r.text
    print("[PASS] Frontend React SPA served at / (Code 200)")

    print("\n[ALL 6 ENDPOINTS & FUNCTIONALITIES VERIFIED SUCCESSFULLY!]")

if __name__ == "__main__":
    main()
