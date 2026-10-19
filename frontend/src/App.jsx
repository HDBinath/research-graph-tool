import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Network,
  Upload,
  FileDown,
  Database,
  GitFork,
  Trash2,
  Sun,
  Moon,
  Compass,
  Layers,
  List,
  ChevronDown,
  PenTool
} from 'lucide-react';
import GraphCanvas from './components/GraphCanvas';
import FilterPanel from './components/FilterPanel';
import InspectionDrawer from './components/InspectionDrawer';
import LiteratureConnectorModal from './components/LiteratureConnectorModal';
import UploadModal from './components/UploadModal';
import HelpModal from './components/HelpModal';
import PapersListView from './components/PapersListView';
import PaperStudio from './components/PaperStudio';

export default function App() {
  const [graphData, setGraphData] = useState({ elements: { nodes: [], edges: [] }, stats: {}, clusters: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightPath, setHighlightPath] = useState([]);

  // Theme: light / dark
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('rg_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // View mode: 'graph' or 'list'
  const [viewMode, setViewMode] = useState('graph');

  // Sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modals & Popovers
  const [uploadOpen, setUploadOpen] = useState(false);
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [connectorSourceId, setConnectorSourceId] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Filters
  const [filterEdgeTypes, setFilterEdgeTypes] = useState({ CITES: true, SUPPORTS: true, CONTRADICTS: true, EXTENDS: true });
  const [filterClusters, setFilterClusters] = useState({});
  const [landmarksOnly, setLandmarksOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync theme with HTML attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rg_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/graph');
      setGraphData(res.data);
      // Auto seed if empty on first load
      if (!res.data.elements?.nodes || res.data.elements.nodes.length === 0) {
        await axios.post('/api/papers/seed-sample');
        const retryRes = await axios.get('/api/graph');
        setGraphData(retryRes.data);
      }
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleDownloadReport = async () => {
    setExportMenuOpen(false);
    try {
      const res = await axios.get('/api/report/markdown');
      const blob = new Blob([res.data], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RESEARCH_REPORT.md';
      a.click();
    } catch (err) {
      alert('Failed to generate research report.');
    }
  };

  const handleExportJson = async () => {
    setExportMenuOpen(false);
    try {
      const res = await axios.get('/api/graph/export-json');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'research_graph.json';
      a.click();
    } catch (err) {
      alert('Failed to export graph JSON.');
    }
  };

  const handleClearGraph = async () => {
    if (window.confirm('Are you sure you want to clear the entire research graph database?')) {
      await axios.delete('/api/graph/clear');
      setSelectedNode(null);
      setHighlightPath([]);
      await fetchGraph();
    }
  };

  const handleOpenConnectorWithPaper = (paperId) => {
    setConnectorSourceId(paperId);
    setConnectorOpen(true);
  };

  const rawNodes = graphData.elements?.nodes || [];
  const papersList = rawNodes.map(n => ({
    id: n.data.id,
    title: n.data.label || n.data.details?.title,
    year: n.data.details?.year || 2024
  }));

  const stats = graphData.stats || {};

  // Count matching papers for live search feedback
  const matchingCount = rawNodes.filter(n => {
    const data = n.data || {};
    if (landmarksOnly && !data.is_landmark) return false;
    if (filterClusters[data.cluster] === false) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (data.label || '').toLowerCase().includes(q) || (data.details?.title || '').toLowerCase().includes(q);
      const authorsMatch = (data.details?.authors || []).some(a => a.toLowerCase().includes(q));
      if (!titleMatch && !authorsMatch) return false;
    }
    return true;
  }).length;

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-icon-box">
            <Network size={20} />
          </div>
          <div className="brand-info">
            <div className="brand-title-wrap">
              <span className="brand-title">ResearchGraph</span>
              <span className="brand-tag">Academic</span>
            </div>
            <span className="brand-subtitle">Multimodal Knowledge Explorer</span>
          </div>
        </div>

        {/* View Mode Switcher Pill */}
        <div className="view-mode-pill">
          <button
            className={`view-mode-btn ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => setViewMode('graph')}
            title="Interactive Visual Graph"
          >
            <Layers size={14} />
            <span>Graph</span>
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Structured Paper Catalog"
          >
            <List size={14} />
            <span>Catalog</span>
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'studio' ? 'active' : ''}`}
            onClick={() => setViewMode('studio')}
            title="AI Academic Writing Studio"
          >
            <PenTool size={14} />
            <span>Studio</span>
          </button>
        </div>

        {/* Live Metrics HUD */}
        <div className="nav-metrics-container">
          <div className="metric-pill" title="Total papers in current graph">
            <span className="metric-pill-label">Papers:</span>
            <span className="metric-pill-val">{stats.total_papers || 0}</span>
          </div>
          <div className="metric-pill-divider" />
          <div className="metric-pill" title="Scholarly citation edges">
            <span className="metric-pill-dot" style={{ backgroundColor: '#6366f1' }} />
            <span className="metric-pill-label">Citations:</span>
            <span className="metric-pill-val" style={{ color: '#6366f1' }}>{stats.citations_count || 0}</span>
          </div>
          <div className="metric-pill-divider" />
          <div className="metric-pill" title="Corroborating assertions">
            <span className="metric-pill-dot" style={{ backgroundColor: '#10b981' }} />
            <span className="metric-pill-label">Supports:</span>
            <span className="metric-pill-val" style={{ color: '#10b981' }}>{stats.supports_count || 0}</span>
          </div>
          <div className="metric-pill-divider" />
          <div className="metric-pill" title="Conflicting scientific claims">
            <span className="metric-pill-dot" style={{ backgroundColor: '#f43f5e' }} />
            <span className="metric-pill-label">Debates:</span>
            <span className="metric-pill-val" style={{ color: '#f43f5e' }}>{stats.contradicts_count || 0}</span>
          </div>
          <div className="metric-pill-divider" />
          <div className="metric-pill" title="Thematic research communities">
            <span className="metric-pill-dot" style={{ backgroundColor: '#38bdf8' }} />
            <span className="metric-pill-label">Topics:</span>
            <span className="metric-pill-val" style={{ color: '#38bdf8' }}>{stats.total_clusters || 0}</span>
          </div>
        </div>

        {/* Action Controls Deck */}
        <div className="nav-actions-deck">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setConnectorSourceId('');
              setConnectorOpen(true);
            }}
            title="Inciteful-style Bridge Finder"
          >
            <GitFork size={15} />
            <span>Find Bridges</span>
          </button>

          {/* Export Dropdown */}
          <div className="dropdown-wrapper">
            <button
              className="btn btn-secondary"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              title="Export Report or Data"
            >
              <FileDown size={15} />
              <span>Export</span>
              <ChevronDown size={13} style={{ opacity: 0.6 }} />
            </button>

            {exportMenuOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleDownloadReport}>
                  <FileDown size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>Literature Report (.md)</span>
                </button>
                <button className="dropdown-item" onClick={handleExportJson}>
                  <Database size={14} style={{ color: '#10b981' }} />
                  <span>Graph Knowledge (.json)</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Import CTA */}
          <button
            className="btn btn-primary"
            onClick={() => setUploadOpen(true)}
            title="Import Research Papers"
          >
            <Upload size={15} />
            <span>Import Papers</span>
          </button>

          {/* Guide Help Button */}
          <button
            className="btn btn-icon btn-secondary"
            onClick={() => setHelpOpen(true)}
            title="How to Read the Graph (Guide)"
          >
            <Compass size={17} />
          </button>

          {/* Theme Toggle Button */}
          <button
            className="btn btn-icon btn-secondary"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Clear Graph Button */}
          <button
            className="btn btn-icon btn-danger-ghost"
            onClick={handleClearGraph}
            title="Clear Graph Database"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="main-view" onClick={() => setExportMenuOpen(false)}>
        {viewMode === 'studio' ? (
          <PaperStudio
            nodes={rawNodes}
            edges={graphData.elements?.edges || []}
            onSwitchToGraph={() => setViewMode('graph')}
          />
        ) : (
          <>
            <FilterPanel
              clusters={graphData.clusters || []}
              filterClusters={filterClusters}
              setFilterClusters={setFilterClusters}
              filterEdgeTypes={filterEdgeTypes}
              setFilterEdgeTypes={setFilterEdgeTypes}
              landmarksOnly={landmarksOnly}
              setLandmarksOnly={setLandmarksOnly}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenConnector={() => {
                setConnectorSourceId('');
                setConnectorOpen(true);
              }}
              isOpen={sidebarOpen}
              onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
              totalMatchingPapers={matchingCount}
            />

            {viewMode === 'graph' ? (
              <GraphCanvas
                elements={graphData.elements}
                onSelectNode={setSelectedNode}
                selectedNodeId={selectedNode?.id}
                highlightPath={highlightPath}
                filterEdgeTypes={filterEdgeTypes}
                filterClusters={filterClusters}
                landmarksOnly={landmarksOnly}
                searchQuery={searchQuery}
                theme={theme}
                onOpenHelp={() => setHelpOpen(true)}
              />
            ) : (
              <PapersListView
                nodes={rawNodes}
                clusters={graphData.clusters || []}
                filterClusters={filterClusters}
                filterEdgeTypes={filterEdgeTypes}
                landmarksOnly={landmarksOnly}
                searchQuery={searchQuery}
                onSelectNode={setSelectedNode}
                onSwitchToGraph={() => setViewMode('graph')}
              />
            )}

            {selectedNode && (
              <InspectionDrawer
                selectedNode={selectedNode}
                onClose={() => setSelectedNode(null)}
                onOpenConnectorWithPaper={handleOpenConnectorWithPaper}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={fetchGraph}
      />

      <LiteratureConnectorModal
        papers={papersList}
        isOpen={connectorOpen}
        onClose={() => setConnectorOpen(false)}
        onApplyHighlight={(path) => {
          setHighlightPath(path);
          setConnectorOpen(false);
          setViewMode('graph');
        }}
        initialSourceId={connectorSourceId}
      />

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}
