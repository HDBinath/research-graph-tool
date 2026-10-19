import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  GitFork,
  Quote,
  Layers,
  Search,
  Check,
  Plus,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Scale
} from 'lucide-react';
import axios from 'axios';

const CLUSTER_COLORS = [
  '#38bdf8', // Cyan
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

export default function GraphContextPalette({
  nodes = [],
  edges = [],
  onInsertText,
  onInsertCitation,
  isOpen,
  onToggleOpen
}) {
  const [activeTab, setActiveTab] = useState('papers');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [bridgeStart, setBridgeStart] = useState('');
  const [bridgeEnd, setBridgeEnd] = useState('');

  // Extract contradiction pairs from graph edges
  const contradictionEdges = edges.filter(e => e.data.type === 'CONTRADICTS');
  const extensionEdges = edges.filter(e => e.data.type === 'EXTENDS');

  // Filter nodes for search
  const filteredNodes = nodes.filter(n => {
    const data = n.data || {};
    const title = (data.label || data.details?.title || '').toLowerCase();
    const authors = (data.details?.authors || []).join(' ').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return title.includes(q) || authors.includes(q);
  });

  const handleCite = (nodeData) => {
    const details = nodeData.details || {};
    const authors = details.authors || ['Author'];
    const leadAuthor = authors[0] || 'Unknown';
    const year = details.year || 2024;
    const citation = `[${leadAuthor} et al., ${year}]`;

    const bibtex = `@article{${nodeData.id},
  title={${details.title || nodeData.label}},
  author={${authors.join(' and ')}},
  year={${year}},
  doi={${details.doi || ''}}
}`;

    if (onInsertCitation) {
      onInsertCitation(citation, bibtex, {
        id: nodeData.id,
        title: details.title || nodeData.label,
        author: leadAuthor,
        year
      });
    }

    setCopiedId(nodeData.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInsertClaim = (claimText, nodeData) => {
    const details = nodeData.details || {};
    const leadAuthor = (details.authors || ['Author'])[0];
    const year = details.year || 2024;
    const quote = `As demonstrated by ${leadAuthor} et al. (${year}), "${claimText}" [${leadAuthor} et al., ${year}]. `;
    if (onInsertText) {
      onInsertText(quote);
    }
  };

  const handleSynthesizeDebate = async (edge) => {
    setSynthesizing(true);
    try {
      const res = await axios.post('/api/writer/synthesize-debate', {
        paper_a_id: edge.data.source,
        paper_b_id: edge.data.target,
        relation: edge.data.type
      });
      if (res.data && res.data.text && onInsertText) {
        onInsertText('\n\n' + res.data.text + '\n\n');
      }
    } catch (err) {
      alert('Failed to synthesize debate: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSynthesizing(false);
    }
  };

  const handleGenerateBridge = async () => {
    if (!bridgeStart || !bridgeEnd || bridgeStart === bridgeEnd) {
      alert('Please select two distinct papers for the bridge narrative.');
      return;
    }
    setSynthesizing(true);
    try {
      // First get shortest path from graph connector
      const connRes = await axios.get('/api/graph/connector', {
        params: { source_id: bridgeStart, target_id: bridgeEnd }
      });
      if (connRes.data && connRes.data.path) {
        const bridgeRes = await axios.post('/api/writer/generate-bridge', {
          path_ids: connRes.data.path
        });
        if (bridgeRes.data && bridgeRes.data.text && onInsertText) {
          onInsertText('\n\n' + bridgeRes.data.text + '\n\n');
        }
      }
    } catch (err) {
      alert('Could not generate bridge: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSynthesizing(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="palette-collapsed-trigger glass-panel"
        onClick={onToggleOpen}
        title="Open Research Graph Context Shelf"
      >
        <BookOpen size={16} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Graph Shelf</span>
      </button>
    );
  }

  return (
    <aside className="context-shelf glass-panel">
      {/* Header */}
      <div className="shelf-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={17} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="shelf-title">Graph Context Shelf</h3>
        </div>
        <button className="hud-btn" style={{ width: 26, height: 26 }} onClick={onToggleOpen} title="Collapse Palette">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="shelf-tabs">
        <button
          className={`shelf-tab-btn ${activeTab === 'papers' ? 'active' : ''}`}
          onClick={() => setActiveTab('papers')}
        >
          Papers ({nodes.length})
        </button>
        <button
          className={`shelf-tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Claims
        </button>
        <button
          className={`shelf-tab-btn ${activeTab === 'debates' ? 'active' : ''}`}
          onClick={() => setActiveTab('debates')}
        >
          Debates ({contradictionEdges.length})
        </button>
      </div>

      {/* Body */}
      <div className="shelf-body">
        {/* Search inside shelf */}
        <div className="search-box" style={{ marginBottom: 12 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            style={{ padding: '6px 12px 6px 30px', fontSize: '0.8rem' }}
            placeholder="Search papers in current graph..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tab 1: Papers & Citations */}
        {activeTab === 'papers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredNodes.map(node => {
              const data = node.data || {};
              const details = data.details || {};
              const clusterIdx = data.cluster || 0;
              const color = CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
              const leadAuthor = (details.authors || ['Author'])[0];
              const isCopied = copiedId === data.id;

              return (
                <div key={data.id} className="shelf-paper-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: `${color}18`,
                        color: color
                      }}
                    >
                      {details.cluster_name || `Cluster ${clusterIdx}`}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {details.year || 2024}
                    </span>
                  </div>

                  <h4 className="shelf-paper-title">{details.title || data.label}</h4>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {leadAuthor} et al. • {(details.citation_count || 0).toLocaleString()} cites
                  </p>

                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.74rem', flex: 1 }}
                      onClick={() => handleCite(data)}
                    >
                      {isCopied ? <Check size={12} style={{ color: '#10b981' }} /> : <Quote size={12} />}
                      <span>{isCopied ? 'Cited!' : '+ Insert Citation'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Extracted Claims */}
        {activeTab === 'claims' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredNodes.map(node => {
              const data = node.data || {};
              const details = data.details || {};
              const claims = details.claims || [];
              if (claims.length === 0) return null;

              return (
                <div key={data.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {details.title || data.label}
                  </span>
                  {claims.map((c, i) => {
                    const isLimitation = c.category === 'Limitation';
                    const badgeColor = isLimitation ? '#f43f5e' : c.category === 'Methodology' ? '#a855f7' : '#0284c7';
                    return (
                      <div key={i} className="shelf-claim-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: badgeColor,
                              textTransform: 'uppercase'
                            }}
                          >
                            {c.category}
                          </span>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            onClick={() => handleInsertClaim(c.text, data)}
                            title="Insert as quoted evidence"
                          >
                            <Plus size={11} />
                            <span>Insert</span>
                          </button>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          "{c.text}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Scholarly Debates & Bridges */}
        {activeTab === 'debates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span className="group-label" style={{ display: 'block', marginBottom: 8 }}>
                Detected Scholarly Contradictions ({contradictionEdges.length})
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                One-click synthesizes balanced, two-sided literature review passages:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contradictionEdges.map(edge => {
                  const nodeA = nodes.find(n => n.data.id === edge.data.source);
                  const nodeB = nodes.find(n => n.data.id === edge.data.target);
                  const titleA = nodeA?.data.label || edge.data.source;
                  const titleB = nodeB?.data.label || edge.data.target;

                  return (
                    <div key={edge.data.id} className="shelf-debate-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f43f5e', fontSize: '0.72rem', fontWeight: 700 }}>
                        <Scale size={13} />
                        <span>Contradiction Detected</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {titleA} <span style={{ color: 'var(--text-muted)' }}>vs</span> {titleB}
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', marginTop: 4, width: '100%', justifyContent: 'center' }}
                        disabled={synthesizing}
                        onClick={() => handleSynthesizeDebate(edge)}
                      >
                        {synthesizing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        <span>Draft Scholarly Debate Paragraph</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

            {/* Bridge Generator */}
            <div>
              <span className="group-label" style={{ display: 'block', marginBottom: 6 }}>
                Synthesize Literature Bridge
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                Drafts a transitional narrative linking two distant research subfields:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  className="search-input"
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  value={bridgeStart}
                  onChange={e => setBridgeStart(e.target.value)}
                >
                  <option value="">Select starting paper...</option>
                  {nodes.map(n => (
                    <option key={n.data.id} value={n.data.id}>
                      {n.data.label}
                    </option>
                  ))}
                </select>

                <select
                  className="search-input"
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  value={bridgeEnd}
                  onChange={e => setBridgeEnd(e.target.value)}
                >
                  <option value="">Select destination paper...</option>
                  {nodes.map(n => (
                    <option key={n.data.id} value={n.data.id}>
                      {n.data.label}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '7px 10px', fontSize: '0.75rem', justifyContent: 'center' }}
                  disabled={synthesizing || !bridgeStart || !bridgeEnd}
                  onClick={handleGenerateBridge}
                >
                  <GitFork size={13} />
                  <span>Draft Bridge Transition Paragraph</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
