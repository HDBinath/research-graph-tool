# ResearchGraph — Multimodal Academic Knowledge Engine

**ResearchGraph** is a local, privacy-first academic literature mapping and multimodal knowledge graph engine. It enables researchers, students, and analysts to visualize scholarly connections, detect corroborating and conflicting scientific claims, compute PageRank centrality, and discover citation bridges between disparate subfields.

---

## ✨ Features

- **Interactive 2D Knowledge Graph**: Force-directed network visualization (via Cytoscape.js & Cola) with nodes scaled by citation PageRank impact and colored by thematic community clusters.
- **Dual View Modes**:
  - **Graph View**: Interactive network with real-time physics simulation, zoom, fit, and node hover cards.
  - **Catalog View**: Responsive, structured card layout for browsing papers, reading abstracts, and inspecting metadata.
- **Evidence & Claim Layers**:
  - Formal Scholarly Citations (`CITES`)
  - Empirical & Theoretical Support (`SUPPORTS`)
  - Disputed or Conflicting Conclusions (`CONTRADICTS`)
  - Methodological Extensions (`EXTENDS`)
- **Literature Connector (Bridge Finder)**: Inciteful-style shortest path discovery between any two distant research papers across citation chains.
- **Inspection Drawer**: Deep-dive inspector displaying publication year, citation count, PageRank score, extracted scientific claims with confidence ratings, DOI links, and one-click BibTeX export.
- **Light & Dark Mode**: Modern design system adhering to neuroaesthetic and progressive disclosure principles with instant persistence.
- **Academic Import**: Drag-and-drop support for PDF research papers and BibTeX bibliography files, plus an instant 1-click sample corpus loader (Transformer & LLM landmarks).
- **Export Formats**: One-click export to comprehensive Markdown literature reports (`RESEARCH_REPORT.md`) or raw JSON for AI agent integration.

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- Node.js 18+ and npm

### 2. One-Click Launch (Windows)
```powershell
.\run.ps1
```
Or double-click `start.bat`.

### 3. Manual Setup

#### Backend:
```bash
# Initialize virtual environment
python -m venv .venv
# Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run FastAPI backend
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### Frontend (Development):
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏛️ Project Architecture

```
research-graph-tool/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI server & route handlers
│   │   ├── database.py          # SQLite schema & repository
│   │   ├── graph_engine.py      # NetworkX centrality, PageRank, Leiden clusters
│   │   └── services/            # Academic APIs, PDF parsing, claim extraction
│   ├── data/                    # Local graph database storage
│   ├── requirements.txt         # Python dependencies
│   └── tests/                   # Backend verification & unit tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GraphCanvas.jsx              # Cytoscape 2D network canvas
│   │   │   ├── PapersListView.jsx           # Catalog/Grid view
│   │   │   ├── FilterPanel.jsx              # Collapsible sidebar & search
│   │   │   ├── InspectionDrawer.jsx         # Paper details & claim viewer
│   │   │   ├── LiteratureConnectorModal.jsx # Shortest path bridge finder
│   │   │   ├── UploadModal.jsx              # PDF/BibTeX uploader & sample loader
│   │   │   └── HelpModal.jsx                # Visual 60s guide
│   │   ├── App.jsx              # State coordinator & navbar
│   │   └── index.css            # Light/Dark design token system
│   └── package.json
└── docs/                        # Specifications, blueprints & reports
```

---

## 📄 License

MIT License. Built for open science and academic exploration.
