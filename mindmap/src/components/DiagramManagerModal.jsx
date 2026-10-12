import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FolderOpen,
  Search,
  Clock,
  List,
  Grid as GridIcon,
  Plus,
  ExternalLink,
  Upload,
  Trash2,
  Eye,
  ArrowRight,
  RefreshCw,
  Loader2,
  X,
  Calendar,
  FileText,
  AlertCircle,
  Sparkles,
  Lock,
  LogIn,
  Sun,
  Moon
} from 'lucide-react';
import {
  getDiagramBounds,
  generateDiagramPreview,
  DiagramStaticSvg
} from '../utils/diagramExportUtils';
import DiagramPreviewBox from './DiagramPreviewBox';

// Helper for relative time ("Opened 2 days ago", etc.)
export function formatDaysAgo(dateStr) {
  if (!dateStr) return 'Not opened recently';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recently';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Opened just now';
  if (diffMin < 60) return `Opened ${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
  if (diffHours < 24) return `Opened ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Opened yesterday';
  if (diffDays < 7) return `Opened ${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Opened ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Opened ${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `Opened ${years} ${years === 1 ? 'year' : 'years'} ago`;
}

// Helper for exact created / updated date format ("Created Oct 12, 2026")
export function formatCreatedDate(dateStr) {
  if (!dateStr) return 'Date unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Date unknown';
  const formatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `Created ${formatted}`;
}

export default function DiagramManagerModal({
  isOpen,
  onClose,
  apiBase = 'http://localhost:3010',
  accountAppUrl = process.env.REACT_APP_ACCOUNT_URL || 'http://localhost:3001',
  isLoggedIn = false,
  userLoading = false,
  currentFileId,
  onLoadFile,
  onImportLocal,
  onNewProject,
  onNewWindow,
  svgRef,
  onFileLoadedSuccess,
  theme = 'light'
}) {
  const isAppDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' | 'all'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Diagram Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTargetFile, setPreviewTargetFile] = useState(null);
  const [previewDiagramData, setPreviewDiagramData] = useState(null);
  const [previewImageSrc, setPreviewImageSrc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewDark, setPreviewDark] = useState(isAppDark);
  const offscreenSvgRef = useRef(null);

  useEffect(() => {
    if (previewModalOpen) {
      setPreviewDark(isAppDark);
    }
  }, [previewModalOpen, isAppDark]);

  const previewBounds = useMemo(() => {
    if (!previewDiagramData) return { x: 0, y: 0, width: 800, height: 600 };
    return getDiagramBounds(previewDiagramData.nodes || [], previewDiagramData.edges || []);
  }, [previewDiagramData]);

  // Fetch files from server (only when authenticated)
  const fetchFiles = useCallback(async (tab = activeTab) => {
    if (!isLoggedIn) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/files?filter=${tab}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load diagrams from server');
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, activeTab, isLoggedIn]);

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      fetchFiles(activeTab);
    } else if (isOpen && !isLoggedIn) {
      setFiles([]);
      setLoading(false);
    }
  }, [isOpen, activeTab, isLoggedIn, fetchFiles]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => (f.name || '').toLowerCase().includes(q));
  }, [files, searchQuery]);

  // Open diagram into canvas
  const handleOpenDiagram = async (file) => {
    try {
      const res = await fetch(`${apiBase}/api/files/${file.file_id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load diagram file');
      const content = await res.json();
      if (onLoadFile) {
        onLoadFile(content.data);
      }
      if (onFileLoadedSuccess) {
        onFileLoadedSuccess(content.file_id, content.name);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete diagram
  const handleDeleteDiagram = async (file, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/files/${file.file_id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete file');
      fetchFiles(activeTab);
    } catch (err) {
      setError(err.message);
    }
  };

  // View / Preview Diagram in image format using dom-to-image
  const handleViewPreview = async (file, e) => {
    if (e) e.stopPropagation();
    setPreviewTargetFile(file);
    setPreviewModalOpen(true);
    setPreviewImageSrc(null);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewDiagramData(null);

    try {
      // 1. Fetch file full data if not already present
      const res = await fetch(`${apiBase}/api/files/${file.file_id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch diagram content for preview');
      const content = await res.json();
      const diagramData = content.data || {};
      const targetPage = (diagramData.pages && diagramData.pages[0]) || { nodes: [], edges: [] };
      setPreviewDiagramData(targetPage);
    } catch (err) {
      setPreviewError(err.message || 'Failed to fetch diagram content');
      setPreviewLoading(false);
    }
  };

  // Live rasterization when preview data or dark mode preference changes
  useEffect(() => {
    if (!previewModalOpen || !previewDiagramData || !previewTargetFile) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);

    const timer = setTimeout(async () => {
      try {
        const isCurrentActive = previewTargetFile.file_id === currentFileId && svgRef?.current;
        let sourceSvg = isCurrentActive ? svgRef.current : offscreenSvgRef.current;

        // Give offscreenSvgRef a couple of render cycles to attach if needed
        let retries = 0;
        while (!sourceSvg && retries < 6) {
          await new Promise((r) => setTimeout(r, 50));
          sourceSvg = isCurrentActive ? svgRef.current : offscreenSvgRef.current;
          retries++;
        }

        if (!sourceSvg) {
          throw new Error('Diagram preview canvas element not ready');
        }

        const nodes = previewDiagramData.nodes || [];
        const edges = previewDiagramData.edges || [];
        const bounds = getDiagramBounds(nodes, edges);

        const dataUrl = await generateDiagramPreview({
          svgElement: sourceSvg,
          nodes,
          edges,
          canvasConfig: previewDiagramData.canvasConfig || {},
          isAppDark,
          exportDark: previewDark,
          transparent: false,
          maxDimension: 540,
          bounds
        });

        if (!cancelled) {
          setPreviewImageSrc(dataUrl);
          setPreviewLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err.message || 'Failed to render diagram preview image');
          setPreviewLoading(false);
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    previewModalOpen,
    previewDiagramData,
    previewDark,
    previewTargetFile,
    currentFileId,
    svgRef,
    isAppDark
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Segoe_UI',system-ui,sans-serif]">
      {/* ── MAIN MICROSOFT FLUENT MODAL ── */}
      <div className="w-full max-w-4xl h-[85vh] max-h-[720px] bg-white dark:bg-[#201F1E] border border-[#edebe9] dark:border-[#2d2d2d] rounded-lg shadow-[0_25.6px_57.6px_0_rgba(0,0,0,0.22),0_4.8px_14.4px_0_rgba(0,0,0,0.18)] flex flex-col overflow-hidden">

        {/* Microsoft Fluent Command Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#edebe9] dark:border-[#2d2d2d] bg-white dark:bg-[#201F1E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#0078D4]/10 dark:bg-[#0078D4]/20 flex items-center justify-center text-[#0078D4]">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#201F1E] dark:text-[#F3F2F1] leading-tight">
                Diagrams & Projects
              </h2>
              <p className="text-[11px] text-[#605E5C] dark:text-[#A19F9D]">
                Manage, preview, and open your Microsoft Flow diagrams
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <a
                href={`${accountAppUrl}/a/login?re=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-xs font-medium shadow-xs transition-colors"
                title="Sign in to your account"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </a>
            )}
            {isLoggedIn && (
              <button
                onClick={() => fetchFiles(activeTab)}
                disabled={loading}
                title="Refresh diagrams"
                className="p-1.5 rounded text-[#605E5C] hover:text-[#201F1E] dark:text-[#A19F9D] dark:hover:text-white hover:bg-[#F3F2F1] dark:hover:bg-[#2B2B2B] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0078D4]' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded text-[#605E5C] hover:text-[#201F1E] dark:text-[#A19F9D] dark:hover:text-white hover:bg-[#F3F2F1] dark:hover:bg-[#2B2B2B] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Microsoft Fluent Command Bar Ribbon */}
        <div className="px-6 py-2.5 bg-[#FAF9F8] dark:bg-[#252423] border-b border-[#edebe9] dark:border-[#2d2d2d] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onNewProject) onNewProject();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white font-medium shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Diagram</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onNewWindow) onNewWindow();
                else window.open(window.location.origin, '_blank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] dark:hover:bg-[#333] text-[#201F1E] dark:text-[#F3F2F1] font-medium transition-colors"
              title="Open a brand new diagram in a new browser tab/window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>New in Tab</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onImportLocal) onImportLocal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] dark:hover:bg-[#333] text-[#201F1E] dark:text-[#F3F2F1] font-medium transition-colors"
              title="Open a local .drawmap, .json, or .xml diagram file from your computer"
            >
              <Upload className="w-3.5 h-3.5 text-[#0078D4]" />
              <span>Import from your computer</span>
            </button>
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A19F9D]" />
              <input
                type="text"
                placeholder="Search diagrams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] text-[#201F1E] dark:text-[#F3F2F1] placeholder-[#A19F9D] focus:outline-hidden focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A19F9D] hover:text-[#201F1E]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-[#EDEBE9] dark:bg-[#333] p-0.5 rounded">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#201F1E] text-[#0078D4] shadow-xs' : 'text-[#605E5C] dark:text-[#A19F9D]'}`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#201F1E] text-[#0078D4] shadow-xs' : 'text-[#605E5C] dark:text-[#A19F9D]'}`}
                title="Grid / Tiles View"
              >
                <GridIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Pivot Navigation Tabs (Recent vs All) */}
        <div className="px-6 flex items-center border-b border-[#EDEBE9] dark:border-[#2d2d2d] bg-white dark:bg-[#201F1E]">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${activeTab === 'recent'
                ? 'border-[#0078D4] text-[#0078D4]'
                : 'border-transparent text-[#605E5C] dark:text-[#A19F9D] hover:text-[#201F1E] dark:hover:text-white'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recent Diagrams</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${activeTab === 'all'
                ? 'border-[#0078D4] text-[#0078D4]'
                : 'border-transparent text-[#605E5C] dark:text-[#A19F9D] hover:text-[#201F1E] dark:hover:text-white'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Diagrams</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#EDEBE9] dark:bg-[#333] text-[#605E5C] dark:text-[#A19F9D]">
              {isLoggedIn ? files.length : 0}
            </span>
          </button>
        </div>

        {/* Diagram List Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F8] dark:bg-[#1E1E1E]">
          {!isLoggedIn ? (
            <div className="h-80 flex flex-col items-center justify-center text-center p-6 text-[#605E5C] dark:text-[#A19F9D]">
              <div className="w-14 h-14 rounded-full bg-[#0078D4]/10 dark:bg-[#0078D4]/20 flex items-center justify-center text-[#0078D4] mb-3.5">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-[#201F1E] dark:text-[#F3F2F1]">
                Sign in to view and manage your diagrams
              </h3>
              <p className="text-xs text-[#605E5C] dark:text-[#A19F9D] mt-1.5 max-w-sm leading-relaxed">
                Your cloud diagrams and recent projects are saved to your account. Sign in to access, preview, and synchronize your work.
              </p>
              <div className="flex items-center gap-2.5 mt-5">
                <a
                  href={`${accountAppUrl}/a/login?re=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-xs font-medium shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign in now</span>
                </a>
                <button
                  onClick={() => {
                    onClose();
                    if (onImportLocal) onImportLocal();
                  }}
                  className="px-3.5 py-2 rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] dark:hover:bg-[#333] text-xs font-medium text-[#201F1E] dark:text-[#F3F2F1] transition-colors"
                >
                  Import from Computer
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-[#605E5C] dark:text-[#A19F9D] gap-2.5 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-[#0078D4]" />
              <span>Loading your diagrams from server...</span>
            </div>
          ) : null}

          {isLoggedIn && !loading && error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to load diagrams</p>
                <p className="mt-0.5 text-[11px] opacity-90">{error}</p>
                <button
                  onClick={() => fetchFiles(activeTab)}
                  className="mt-2 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {isLoggedIn && !loading && !error && filteredFiles.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#605E5C] dark:text-[#A19F9D]">
              <div className="w-12 h-12 rounded-full bg-[#EDEBE9] dark:bg-[#2B2B2B] flex items-center justify-center text-[#A19F9D] mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#201F1E] dark:text-[#F3F2F1]">
                {searchQuery ? 'No diagrams matched your search' : 'No diagrams found'}
              </p>
              <p className="text-xs text-[#605E5C] dark:text-[#A19F9D] mt-1 max-w-sm">
                {searchQuery
                  ? `Try adjusting your query "${searchQuery}" or clear the filter.`
                  : 'Get started by creating a new diagram or import an existing file.'}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    onClose();
                    if (onNewProject) onNewProject();
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium"
                >
                  Create New Diagram
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onImportLocal) onImportLocal();
                  }}
                  className="px-3.5 py-1.5 rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] text-xs font-medium text-[#201F1E] dark:text-[#F3F2F1]"
                >
                  Import from Computer
                </button>
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {isLoggedIn && !loading && !error && filteredFiles.length > 0 && viewMode === 'list' && (
            <div className="space-y-2">
              {filteredFiles.map((file) => {
                const isCurrent = currentFileId === file.file_id;
                const openedText = formatDaysAgo(file.opened_at || file.updated_at);
                const createdText = formatCreatedDate(file.created_at || file.updated_at);

                return (
                  <div
                    key={file.file_id}
                    onClick={() => handleOpenDiagram(file)}
                    className={`group flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer ${isCurrent
                        ? 'bg-[#0078D4]/10 border-[#0078D4]/50 dark:bg-[#0078D4]/15 shadow-xs'
                        : 'bg-white dark:bg-[#252423] border-[#EDEBE9] dark:border-[#2D2D2D] hover:border-[#0078D4]/40 hover:bg-[#F9F9F8] dark:hover:bg-[#2B2B2B] shadow-2xs'
                      }`}
                  >
                    {/* Left: Icon & Titles & Dates */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-md bg-[#0078D4]/10 dark:bg-[#0078D4]/20 flex items-center justify-center text-[#0078D4] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-[#201F1E] dark:text-[#F3F2F1] truncate">
                            {file.name || 'Untitled Diagram'}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-[#0078D4] text-white shrink-0">
                              Current
                            </span>
                          )}
                        </div>

                        {/* Dates: Opened in days ago format + created date */}
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[#605E5C] dark:text-[#A19F9D]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#0078D4]" />
                            <span>{openedText}</span>
                          </span>
                          <span className="text-[#EDEBE9] dark:text-[#383838]">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#605E5C]" />
                            <span>{createdText}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (View preview + Open in Canvas + Delete) */}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {/* VIEW PREVIEW BUTTON */}
                      <button
                        onClick={(e) => handleViewPreview(file, e)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] dark:hover:bg-[#333] text-[#201F1E] dark:text-[#F3F2F1] text-xs font-medium transition-colors shadow-2xs"
                        title="View image preview of this diagram"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0078D4]" />
                        <span>View</span>
                      </button>

                      {/* OPEN IN CANVAS BUTTON */}
                      <button
                        onClick={() => handleOpenDiagram(file)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-xs font-medium transition-colors shadow-xs"
                        title="Open diagram into the live canvas"
                      >
                        <span>Open in canvas</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        onClick={(e) => handleDeleteDiagram(file, e)}
                        className="p-1.5 rounded text-[#A19F9D] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete this diagram"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID / TILES VIEW */}
          {isLoggedIn && !loading && !error && filteredFiles.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredFiles.map((file) => {
                const isCurrent = currentFileId === file.file_id;
                const openedText = formatDaysAgo(file.opened_at || file.updated_at);
                const createdText = formatCreatedDate(file.created_at || file.updated_at);

                return (
                  <div
                    key={file.file_id}
                    onClick={() => handleOpenDiagram(file)}
                    className={`group flex flex-col justify-between p-4 rounded-lg border transition-all cursor-pointer bg-white dark:bg-[#252423] shadow-2xs hover:shadow-md ${isCurrent
                        ? 'border-[#0078D4] ring-1 ring-[#0078D4]/40 bg-[#0078D4]/5 dark:bg-[#0078D4]/10'
                        : 'border-[#EDEBE9] dark:border-[#2D2D2D] hover:border-[#0078D4]/50'
                      }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="w-8 h-8 rounded bg-[#0078D4]/10 dark:bg-[#0078D4]/20 flex items-center justify-center text-[#0078D4]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <button
                          onClick={(e) => handleDeleteDiagram(file, e)}
                          className="p-1 rounded text-[#A19F9D] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete diagram"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-semibold text-[#201F1E] dark:text-[#F3F2F1] truncate" title={file.name}>
                        {file.name || 'Untitled Diagram'}
                      </h4>

                      <div className="mt-2 space-y-1 text-[11px] text-[#605E5C] dark:text-[#A19F9D]">
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#0078D4]" />
                          <span className="truncate">{openedText}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[#605E5C]" />
                          <span className="truncate">{createdText}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#EDEBE9] dark:border-[#2D2D2D]">
                      <button
                        onClick={(e) => handleViewPreview(file, e)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded border border-[#EDEBE9] dark:border-[#383838] bg-[#FAF9F8] dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] text-xs font-medium text-[#201F1E] dark:text-[#F3F2F1]"
                      >
                        <Eye className="w-3 h-3 text-[#0078D4]" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleOpenDiagram(file)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#EDEBE9] dark:border-[#2D2D2D] bg-white dark:bg-[#201F1E] flex items-center justify-between text-xs">
          <span className="text-[#605E5C] dark:text-[#A19F9D]">
            {filteredFiles.length} {filteredFiles.length === 1 ? 'diagram' : 'diagrams'} available
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] dark:hover:bg-[#333] text-[#201F1E] dark:text-[#F3F2F1] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Offscreen Static SVG renderer for arbitrary saved diagrams */}
      {previewDiagramData && previewTargetFile && previewTargetFile.file_id !== currentFileId && (
        <div style={{ position: 'fixed', left: 0, top: '-99999px', zIndex: -9999, pointerEvents: 'none' }}>
          <DiagramStaticSvg
            ref={offscreenSvgRef}
            nodes={previewDiagramData.nodes || []}
            edges={previewDiagramData.edges || []}
            canvasConfig={previewDiagramData.canvasConfig || {}}
            isDark={previewDark}
            bounds={previewBounds}
            scale={1}
            width={Math.max(1, Math.round(previewBounds.width))}
            height={Math.max(1, Math.round(previewBounds.height))}
          />
        </div>
      )}

      {/* ── DIAGRAM IMAGE PREVIEW MODAL ("VIEW" BUTTON) ── */}
      {previewModalOpen && previewTargetFile && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-[#201F1E] border border-[#EDEBE9] dark:border-[#383838] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EDEBE9] dark:border-[#333] bg-white dark:bg-[#201F1E]">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-[#0078D4]" />
                <h3 className="text-sm font-semibold text-[#201F1E] dark:text-white truncate">
                  Preview: {previewTargetFile.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-[#605E5C] hover:text-[#201F1E] dark:text-[#A19F9D] dark:hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata & Controls Ribbon */}
            <div className="px-5 py-2 bg-[#FAF9F8] dark:bg-[#252423] border-b border-[#EDEBE9] dark:border-[#333] flex items-center justify-between text-[11px] text-[#605E5C] dark:text-[#A19F9D]">
              <div className="flex items-center gap-3">
                <span>{formatDaysAgo(previewTargetFile.opened_at || previewTargetFile.updated_at)}</span>
                <span>•</span>
                <span>{formatCreatedDate(previewTargetFile.created_at || previewTargetFile.updated_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Theme appearance toggle */}
                <div className="flex items-center border border-[#EDEBE9] dark:border-[#383838] rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewDark(false)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      !previewDark
                        ? 'bg-[#0078D4] text-white'
                        : 'bg-white dark:bg-[#2B2B2B] text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1]'
                    }`}
                  >
                    <Sun className="w-3 h-3" /> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDark(true)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      previewDark
                        ? 'bg-[#0078D4] text-white'
                        : 'bg-white dark:bg-[#2B2B2B] text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1]'
                    }`}
                  >
                    <Moon className="w-3 h-3" /> Dark
                  </button>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#EDEBE9] dark:bg-[#333]">
                  WYSIWYG PNG
                </span>
              </div>
            </div>

            {/* Image Preview Canvas */}
            <div className="p-5 bg-[#F3F2F1] dark:bg-[#1A1A1A] flex items-center justify-center min-h-[300px] max-h-[460px]">
              <DiagramPreviewBox
                previewSrc={previewImageSrc}
                loading={previewLoading}
                error={previewError}
                width={previewBounds.width}
                height={previewBounds.height}
                zoom="Fit"
                isDark={previewDark}
                canvasBg={previewDiagramData?.canvasConfig?.backgroundColor}
                downloadFileName={`${previewTargetFile.name || 'diagram'}-preview.png`}
                minHeight={280}
                maxHeight={360}
                showInfoBar={false}
                showFooterBar={true}
                subtitle="WYSIWYG Live Render"
              />
            </div>

            {/* Preview Footer Actions */}
            <div className="px-5 py-3 border-t border-[#EDEBE9] dark:border-[#333] bg-white dark:bg-[#201F1E] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-[#EDEBE9] dark:border-[#383838] hover:bg-[#F3F2F1] dark:hover:bg-[#2B2B2B] text-[#201F1E] dark:text-[#F3F2F1] transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setPreviewModalOpen(false);
                  handleOpenDiagram(previewTargetFile);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white shadow-xs transition-colors"
              >
                <span>Open in Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
