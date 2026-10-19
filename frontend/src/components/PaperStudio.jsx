import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Sparkles,
  FileDown,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Send,
  Loader2,
  Trash2,
  Bookmark
} from 'lucide-react';
import axios from 'axios';
import GraphContextPalette from './GraphContextPalette';

const INITIAL_CONTENT = `<h1>Literature Synthesis & Analysis</h1>
<p>Recent investigations into modern neural sequence transduction have illuminated critical trade-offs between computational quadratic scaling and empirical expressivity [Vaswani et al., 2017].</p>
<h2>1. Background & Foundational Paradigms</h2>
<p>While self-attention mechanisms eliminated sequential recurrence bottlenecks, subsequent empirical audits revealed substantial nuances in training stability and parameter efficiency.</p>
<h2>2. Methodology & Comparative Analysis</h2>
<p>In this section, we examine the convergence behaviors and architectural modifications established across recent seminal works...</p>`;

export default function PaperStudio({
  nodes = [],
  edges = [],
  onSwitchToGraph
}) {
  const [shelfOpen, setShelfOpen] = useState(true);
  const [ghostText, setGhostText] = useState('');
  const [citedPaperMeta, setCitedPaperMeta] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [citedPapers, setCitedPapers] = useState({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your research paper here... Click "+ Insert Citation" or use AI Copilot anytime.',
      }),
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class: 'tiptap-paper-editor',
      },
    },
  });

  // Handle inserting citation from shelf
  const handleInsertCitation = (citationText, bibtexStr, paperMeta) => {
    if (!editor) return;
    editor.chain().focus().insertContent(` ${citationText} `).run();
    setCitedPapers(prev => ({
      ...prev,
      [paperMeta.id]: { ...paperMeta, bibtex: bibtexStr }
    }));
  };

  // Handle inserting raw text/quote from shelf
  const handleInsertText = (textToInsert) => {
    if (!editor) return;
    editor.chain().focus().insertContent(textToInsert).run();
  };

  // Trigger AI Autocomplete
  const handleAutocomplete = async () => {
    if (!editor) return;
    const currentText = editor.getText();
    setLoadingAI(true);
    setGhostText('');
    setCitedPaperMeta(null);

    try {
      const activeIds = nodes.map(n => n.data.id);
      const res = await axios.post('/api/writer/autocomplete', {
        current_text: currentText.slice(-600), // last 600 chars of context
        paper_ids: activeIds
      });

      if (res.data && res.data.suggestion) {
        setGhostText(res.data.suggestion);
        if (res.data.cited_paper) {
          setCitedPaperMeta(res.data.cited_paper);
        }
      }
    } catch (err) {
      console.error('Autocomplete failed:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  // Accept ghost text
  const handleAcceptGhost = () => {
    if (!editor || !ghostText) return;
    editor.chain().focus().insertContent(' ' + ghostText + ' ').run();
    if (citedPaperMeta) {
      setCitedPapers(prev => ({
        ...prev,
        [citedPaperMeta.id]: citedPaperMeta
      }));
    }
    setGhostText('');
    setCitedPaperMeta(null);
  };

  // Rephrase selected text academically
  const handleRephraseSelection = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) {
      alert('Please select some text in the editor to rephrase academically.');
      return;
    }

    setLoadingAI(true);
    try {
      const res = await axios.post('/api/writer/rephrase', {
        text: selectedText,
        tone: 'scholarly'
      });
      if (res.data && res.data.result) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(res.data.result).run();
      }
    } catch (err) {
      alert('Rephrase failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingAI(false);
    }
  };

  // Insert Bibliography section at bottom
  const handleAppendBibliography = () => {
    if (!editor) return;
    const keys = Object.values(citedPapers);
    if (keys.length === 0) {
      alert('No citations have been inserted from the Graph Context Shelf yet.');
      return;
    }

    let bibSection = '<h2>References</h2><ul>';
    keys.forEach(p => {
      bibSection += `<li><strong>${p.author} et al. (${p.year})</strong>. <em>${p.title}</em>.</li>`;
    });
    bibSection += '</ul>';

    editor.chain().focus().insertContent(bibSection).run();
  };

  // Export document as Markdown
  const handleExportMarkdown = () => {
    if (!editor) return;
    const contentHtml = editor.getHTML();
    // Simple HTML to MD converter for clean export
    let md = contentHtml
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul>|<\/ul>/gi, '\n')
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, '&');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MANUSCRIPT_DRAFT.md';
    a.click();
  };

  // Export BibTeX
  const handleExportBibtex = () => {
    const keys = Object.values(citedPapers);
    if (keys.length === 0) {
      alert('No citations recorded yet.');
      return;
    }
    const fullBibtex = keys.map(k => k.bibtex || `@article{${k.id},\n  title={${k.title}},\n  author={${k.author}},\n  year={${k.year}}\n}`).join('\n\n');
    const blob = new Blob([fullBibtex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'references.bib';
    a.click();
  };

  // Copy full document
  const handleCopyDoc = () => {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getText());
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  if (!editor) return null;

  const citedCount = Object.keys(citedPapers).length;

  return (
    <div className="studio-container">
      {/* Studio Workbench Header */}
      <div className="studio-toolbar glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>

          <div className="hud-divider" />

          <button
            className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={15} />
          </button>
        </div>

        {/* AI Copilot Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            disabled={loadingAI}
            onClick={handleAutocomplete}
            title="Predict next academic argument grounded in graph"
          >
            {loadingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>AI Autocomplete</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            disabled={loadingAI}
            onClick={handleRephraseSelection}
            title="Rephrase highlighted text in formal scholarly register"
          >
            <span>Rephrase Selection</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            onClick={handleAppendBibliography}
            title="Add Bibliography section using cited papers"
          >
            <Bookmark size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>Add References ({citedCount})</span>
          </button>

          <div className="hud-divider" />

          {/* Export Actions */}
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            onClick={handleExportMarkdown}
            title="Export manuscript as Markdown (.md)"
          >
            <FileDown size={14} />
            <span>Export .md</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            onClick={handleExportBibtex}
            title="Export bibliography as BibTeX (.bib)"
          >
            <span>.bib</span>
          </button>

          <button
            className="btn btn-ghost"
            style={{ padding: '6px', width: 30, height: 30 }}
            onClick={handleCopyDoc}
            title="Copy plain text"
          >
            {copiedDoc ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Main Studio Split Layout */}
      <div className="studio-body">
        {/* Document Editor Paper Canvas */}
        <div className="editor-canvas-wrap">
          <div className="editor-paper-sheet">
            <EditorContent editor={editor} />

            {/* Ghost text autocomplete recommendation pill */}
            {ghostText && (
              <div className="ghost-text-bubble">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700 }}>
                  <Sparkles size={13} />
                  <span>AI Copilot Suggested Continuation:</span>
                </div>
                <p className="ghost-text-body">{ghostText}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    onClick={() => setGhostText('')}
                  >
                    Dismiss (Esc)
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                    onClick={handleAcceptGhost}
                  >
                    Accept (Tab)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right-Hand Graph Context Palette */}
        <GraphContextPalette
          nodes={nodes}
          edges={edges}
          onInsertCitation={handleInsertCitation}
          onInsertText={handleInsertText}
          isOpen={shelfOpen}
          onToggleOpen={() => setShelfOpen(!shelfOpen)}
        />
      </div>
    </div>
  );
}
