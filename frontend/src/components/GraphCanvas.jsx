import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import fcose from 'cytoscape-fcose';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, HelpCircle, Star, Quote, Sparkles, AlertCircle } from 'lucide-react';

try {
  cytoscape.use(cola);
  cytoscape.use(fcose);
} catch (e) {
  // Ignore if already registered
}

const CLUSTER_COLORS = [
  '#38bdf8', // Cyan
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

export default function GraphCanvas({
  elements,
  onSelectNode,
  selectedNodeId,
  highlightPath,
  filterEdgeTypes = { CITES: true, SUPPORTS: true, CONTRADICTS: true, EXTENDS: true },
  filterClusters = {},
  landmarksOnly = false,
  searchQuery = '',
  theme = 'dark',
  onOpenHelp
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const isLight = theme === 'light';

  useEffect(() => {
    if (!containerRef.current || !elements) return;

    // Filter elements based on active toggles
    const rawNodes = elements.nodes || [];
    const rawEdges = elements.edges || [];

    const filteredNodes = rawNodes.filter(n => {
      const data = n.data;
      if (landmarksOnly && !data.is_landmark) return false;
      if (filterClusters[data.cluster] === false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (data.label || '').toLowerCase().includes(q) || (data.details?.title || '').toLowerCase().includes(q);
        const authorsMatch = (data.details?.authors || []).some(a => a.toLowerCase().includes(q));
        if (!titleMatch && !authorsMatch) return false;
      }
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.data.id));

    const filteredEdges = rawEdges.filter(e => {
      const data = e.data;
      if (!activeNodeIds.has(data.source) || !activeNodeIds.has(data.target)) return false;
      if (filterEdgeTypes[data.type] === false) return false;
      return true;
    });

    // Destroy existing instance before rebuilding
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const labelColor = isLight ? '#0f172a' : '#f8fafc';
    const textHaloColor = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(9, 13, 22, 0.9)';
    const defaultNodeBorder = isLight ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.4)';
    const citesEdgeColor = isLight ? '#4f46e5' : '#6366f1';

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...filteredNodes, ...filteredEdges],
      boxSelectionEnabled: false,
      style: [
        // Base Node Style
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': labelColor,
            'font-family': 'Plus Jakarta Sans, Inter, sans-serif',
            'font-size': '11px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 7,
            'text-max-width': '130px',
            'text-wrap': 'ellipsis',
            'text-background-color': textHaloColor,
            'text-background-opacity': 0.85,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'background-color': ele => {
              const cluster = ele.data('cluster') || 0;
              return CLUSTER_COLORS[cluster % CLUSTER_COLORS.length];
            },
            'width': ele => {
              const pr = ele.data('pagerank') || 0.05;
              return Math.max(30, Math.min(68, 30 + pr * 170));
            },
            'height': ele => {
              const pr = ele.data('pagerank') || 0.05;
              return Math.max(30, Math.min(68, 30 + pr * 170));
            },
            'border-width': ele => ele.data('is_landmark') ? 3.5 : 1.5,
            'border-color': ele => ele.data('is_landmark') ? '#f59e0b' : defaultNodeBorder,
            'border-opacity': 0.95,
            'cursor': 'pointer',
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': '0.2s'
          }
        },
        // Selected Node State
        {
          selector: 'node:selected',
          style: {
            'border-width': 4.5,
            'border-color': isLight ? '#4f46e5' : '#38bdf8',
            'shadow-blur': 25,
            'shadow-color': isLight ? '#4f46e5' : '#38bdf8',
            'shadow-opacity': 0.75
          }
        },
        // Edge: CITES (Scholarly citation)
        {
          selector: 'edge[type = "CITES"]',
          style: {
            'width': 1.6,
            'line-color': citesEdgeColor,
            'target-arrow-color': citesEdgeColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.85,
            'opacity': isLight ? 0.6 : 0.55
          }
        },
        // Edge: SUPPORTS (Corroboration)
        {
          selector: 'edge[type = "SUPPORTS"]',
          style: {
            'width': 3,
            'line-color': '#10b981',
            'target-arrow-color': '#10b981',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.1,
            'opacity': 0.95
          }
        },
        // Edge: CONTRADICTS (Dispute)
        {
          selector: 'edge[type = "CONTRADICTS"]',
          style: {
            'width': 3.5,
            'line-color': '#f43f5e',
            'target-arrow-color': '#f43f5e',
            'target-arrow-shape': 'tee',
            'line-style': 'dashed',
            'curve-style': 'bezier',
            'arrow-scale': 1.25,
            'opacity': 0.95
          }
        },
        // Edge: EXTENDS (Methodology Extension)
        {
          selector: 'edge[type = "EXTENDS"]',
          style: {
            'width': 2.2,
            'line-color': '#a855f7',
            'target-arrow-color': '#a855f7',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.8
          }
        }
      ],
      layout: {
        name: 'cola',
        animate: true,
        randomize: false,
        maxSimulationTime: 2200,
        nodeSpacing: 50,
        edgeLength: 135
      }
    });

    // Selection & Deselection
    cy.on('tap', 'node', evt => {
      const node = evt.target;
      if (onSelectNode) {
        onSelectNode(node.data());
      }
    });

    cy.on('tap', evt => {
      if (evt.target === cy && onSelectNode) {
        onSelectNode(null);
      }
    });

    // Hover tooltip tracking
    cy.on('mouseover', 'node', evt => {
      const node = evt.target;
      const data = node.data();
      const renderedPos = node.renderedPosition();
      setTooltipPos({ x: renderedPos.x, y: renderedPos.y });
      setHoveredNode(data);
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
    });

    cy.on('pan zoom', () => {
      setHoveredNode(null);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [elements, filterEdgeTypes, filterClusters, landmarksOnly, searchQuery, theme]);

  // Handle highlighted bridge path
  useEffect(() => {
    if (!cyRef.current || !highlightPath || highlightPath.length === 0) return;
    const cy = cyRef.current;

    cy.elements().removeClass('highlighted-path dimmed-path');

    const pathSet = new Set(highlightPath);
    cy.nodes().each(node => {
      if (pathSet.has(node.id())) {
        node.addClass('highlighted-path');
        node.style({
          'border-width': 5,
          'border-color': '#f59e0b',
          'shadow-blur': 30,
          'shadow-color': '#f59e0b'
        });
      } else {
        node.addClass('dimmed-path');
        node.style({ 'opacity': 0.22 });
      }
    });

    cy.edges().each(edge => {
      if (pathSet.has(edge.source().id()) && pathSet.has(edge.target().id())) {
        edge.style({
          'width': 4.5,
          'line-color': '#f59e0b',
          'target-arrow-color': '#f59e0b',
          'opacity': 1.0
        });
      } else {
        edge.style({ 'opacity': 0.08 });
      }
    });
  }, [highlightPath]);

  // Sync selected node with outer state
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    if (selectedNodeId) {
      cy.nodes().unselect();
      const target = cy.$(`#${selectedNodeId}`);
      if (target.length) {
        target.select();
        cy.animate({
          center: { eles: target },
          zoom: Math.max(cy.zoom(), 1.25),
          duration: 350
        });
      }
    }
  }, [selectedNodeId]);

  const handleZoomIn = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleFit = () => {
    if (cyRef.current) cyRef.current.fit(null, 50);
  };

  const handleRelayout = () => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: 'cola',
        animate: true,
        nodeSpacing: 50,
        edgeLength: 135
      }).run();
    }
  };

  const rawNodesCount = (elements?.nodes || []).length;

  return (
    <div className="canvas-container">
      <div id="cy" ref={containerRef} />

      {/* Empty State when no nodes match */}
      {rawNodesCount > 0 && cyRef.current && cyRef.current.nodes().length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-surface)',
          padding: '24px 32px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
          maxWidth: 360,
          zIndex: 25
        }}>
          <AlertCircle size={36} style={{ color: 'var(--accent-amber)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No Papers Match Filters</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Try clearing your search term or re-enabling topics in the sidebar.
          </p>
        </div>
      )}

      {/* Floating Interactive Hover Tooltip */}
      {hoveredNode && (
        <div
          className="node-hover-card"
          style={{
            left: Math.min(window.innerWidth - 320, Math.max(20, tooltipPos.x + 20)),
            top: Math.max(70, tooltipPos.y - 40)
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hoveredNode.is_landmark && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                <Star size={10} fill="#f59e0b" />
                <span>Landmark</span>
              </span>
            )}
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: 'var(--text-muted)'
              }}
            >
              {hoveredNode.details?.cluster_name || `Cluster ${hoveredNode.cluster}`}
            </span>
          </div>

          <h4 className="node-hover-title">
            {hoveredNode.details?.title || hoveredNode.label}
          </h4>

          <div className="node-hover-meta">
            <span>{hoveredNode.details?.year || 2024}</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Quote size={11} />
              <span>{(hoveredNode.details?.citation_count || 0).toLocaleString()} cites</span>
            </span>
            <span>•</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Click to inspect</span>
          </div>
        </div>
      )}

      {/* Floating Canvas Controls Dock */}
      <div className="canvas-hud-dock glass-panel">
        <button className="hud-btn" onClick={handleZoomIn} title="Zoom In (+)">
          <ZoomIn size={17} />
        </button>
        <button className="hud-btn" onClick={handleZoomOut} title="Zoom Out (-)">
          <ZoomOut size={17} />
        </button>
        <button className="hud-btn" onClick={handleFit} title="Fit to Viewport">
          <Maximize2 size={17} />
        </button>
        <div className="hud-divider" />
        <button className="hud-btn" onClick={handleRelayout} title="Re-simulate Physics Layout">
          <RefreshCw size={17} />
        </button>
        {onOpenHelp && (
          <button className="hud-btn" onClick={onOpenHelp} title="How to Read the Graph (Guide)">
            <HelpCircle size={17} style={{ color: 'var(--accent-primary)' }} />
          </button>
        )}
      </div>

      {/* Floating Legend */}
      <div className="canvas-legend-card glass-panel">
        <div className="legend-item" title="Formal citation between papers">
          <span style={{ width: 14, height: 2.5, borderRadius: 2, backgroundColor: isLight ? '#4f46e5' : '#6366f1' }} />
          <span>Citation</span>
        </div>
        <div className="legend-item" title="Empirical or theoretical support">
          <span style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: '#10b981' }} />
          <span>Corroborates</span>
        </div>
        <div className="legend-item" title="Conflicting or disputed claims">
          <span style={{ width: 14, height: 0, borderTop: '2px dashed #f43f5e' }} />
          <span>Disputes</span>
        </div>
        <div className="legend-item" title="Paper with high network centrality">
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', border: '1.5px solid #fff' }} />
          <span>Landmark</span>
        </div>
      </div>
    </div>
  );
}
