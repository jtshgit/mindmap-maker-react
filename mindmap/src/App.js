import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGesture, useDrag } from '@use-gesture/react';
import AppHeader from './components/AppHeader';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import PageTabBar from './components/PageToolbar';
import ShapeLibrarySidebar from './components/ShapeLibrarySidebar';
import Sidebar, { CollapsibleSection } from './components/Sidebar';
import { getShapeSVG, getShapeDefaultSize, SHAPE_PORT_IDS } from './components/shapes/ShapeDefinitions';
import { getLineType } from './components/shapes/LineDefinitions.jsx';
import ImageCropModal from './components/ImageCropModal';
import ExportDialog from './components/ExportDialog';
import ContextMenu from './components/ContextMenu';
import { useTheme } from 'next-themes';
import { useConnectionMath } from './utils/connectionMath';
import { clamp, findAxisSnap, computeSmartGuides } from './utils/layoutMath';
import ShapeNode from './components/shapes/ShapeNode';
import ConnectionLine from './components/shapes/ConnectionLine';
import EdgeMarkerDefs from './components/shapes/EdgeMarkerDefs';
import EdgeEndpointHandles from './components/shapes/EdgeEndpointHandles';

const MIN_SCALE = 0.1;
const MAX_SCALE = 10.0;
const panLimitX = 4000;
const panLimitY = 4000;
const ZOOM_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10];


export default function ProfessionalMindMap() {
  const GRID = 20;
  const BOX_W = 120;
  const BOX_H = 40;
  const PAD = 20;
  const SNAP_RADIUS = 40;
  const ALIGN_TOLERANCE = 15;
  const EXIT = PAD; // minimum perpendicular stub length leaving any port

  // --- 0. DEFAULT PAGE DATA ---
  const makeDefaultPage = (id, name) => ({
    id,
    name,
    nodes: [],
    edges: [],
    canvasConfig: { backgroundColor: '#ffffff', showGrid: true },
    canvasSettings: { width: 1920, height: 1080, orientation: 'landscape' },
    transform: { x: 50, y: 50, scale: 1 },
    past: [],
    future: [],
  });

  const initialPage = {
    id: "page-1",
    name: "Page 1",
    nodes: [
      {
        id: "n1",
        x: 220,
        y: 120,
        text: "Topic",
        strokeWidth: 1,
      },
      {
        id: "n2",
        x: 300,
        y: 240,
        text: "Subtopic B",
        strokeWidth: 1,
      },
      {
        id: "n3",
        x: 140,
        y: 240,
        text: "Subtopic B",
        strokeWidth: 1,
      },
    ],
    edges: [
      {
        id: "e1785188504018",
        sourceType: "node",
        source: "n1",
        portS: "B",
        targetType: "node",
        target: "n3",
        portT: "T",
        waypoints: [
          { x: 280, y: 200 },
          { x: 200, y: 199.99999999999997 },
        ],
        customized: true,
      },
      {
        id: "e1785188517968",
        sourceType: "node",
        source: "n2",
        portS: "T",
        targetType: "node",
        target: "n1",
        portT: "B",
        waypoints: [
          { x: 360, y: 200 },
          { x: 280, y: 200 },
        ],
        customized: true,
        markerStart: "arrow",
        markerEnd: "none",
      },
    ],
    canvasConfig: {
      backgroundColor: "#ffffff",
      showGrid: true,
    },
    canvasSettings: {
      width: 1920,
      height: 1080,
      orientation: "landscape",
    },
    transform: {
      scale: 0.9585867604030182,
      x: 301.9436301711017,
      y: 150.97089073383478,
    },
    past: [],
    future: [],
  };


  // --- PAGES STATE ---
  const [pages, setPages] = useState([initialPage]);
  const [activePageId, setActivePageId] = useState('page-1');
  const pageCounterRef = useRef(1); // for generating unique page names

  // --- 1. GRAPH STATE (live working state for active page) ---
  const [nodes, setNodes] = useState(initialPage.nodes);
  const [edges, setEdges] = useState(initialPage.edges);

  // --- 2. INTERACTION & UX STATE ---
  const [mode, setMode] = useState('select'); // 'select' | 'pan'
  const [selected, setSelected] = useState(null);
  const [multiSelected, setMultiSelected] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [snapPort, setSnapPort] = useState(null);
  const [snapEdgePoint, setSnapEdgePoint] = useState(null); // { edgeId, x, y, t } — line-to-line snap target
  const [draftWps, setDraftWps] = useState(null);
  const [drawCursor, setDrawCursor] = useState(null);
  const [drawRoute, setDrawRoute] = useState(null);
  const [libraryDrag, setLibraryDrag] = useState(null);
  const [libraryLineDrag, setLibraryLineDrag] = useState(null);
  const [transform, setTransform] = useState(initialPage.transform);
  const [isTransforming, setIsTransforming] = useState(false);
  const [canvasSettings, setCanvasSettings] = useState(initialPage.canvasSettings);
  const [shapeLibOpen, setShapeLibOpen] = useState(true);
  const [propsSidebarOpen, setPropsSidebarOpen] = useState(true);

  const viewportRef = useRef(null);
  const vTrackRef = useRef(null);
  const hTrackRef = useRef(null);
  const lastNodeClickRef = useRef({ id: null, time: 0 });
  const DOUBLE_CLICK_MS = 350;

  // snapLines: array of { axis:'x'|'y', value:number, label:string }
  const [snapLines, setSnapLines] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [clipboard, setClipboard] = useState({ nodes: [], edges: [] });
  const [multiSelectedEdges, setMultiSelectedEdges] = useState([]);

  // NEW STYLING STATES
  const [canvasConfig, setCanvasConfig] = useState(initialPage.canvasConfig);
  // App-wide light/dark theme, driven by next-themes (which toggles the
  // `dark` class on <html> per the ThemeProvider in index.js). Dark mode only
  // flips pure-black strokes to white and renders the canvas page black — it
  // does not touch fills, the app chrome, or the user's chosen
  // canvasConfig.backgroundColor (that's restored on export if the user asks
  // for a light export, and used as-is when the theme is light).
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes only resolves the real theme (incl. "system") after mount,
  // so gate on that to avoid a flash of the wrong stroke colors.
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => { setThemeMounted(true); }, []);
  const isDarkTheme = themeMounted && resolvedTheme === 'dark';
  // Flips pure black <-> white when dark theme is active — used for
  // strokes (black outlines become white), fills (white box backgrounds
  // become black), and node text (black text becomes white), so shapes
  // and their labels stay readable against the black canvas. Any other
  // color the user explicitly picked passes through untouched, per the
  // "no other changes" requirement.
  const flipColorForTheme = useCallback((color) => {
    if (!isDarkTheme) return color;
    const c = (color || '').toString().trim().toLowerCase();
    if (c === '#000' || c === '#000000' || c === '#000000ff' || c === 'black') return '#ffffff';
    if (c === '#fff' || c === '#ffffff' || c === '#ffffffff' || c === 'white') return '#000000';
    return color;
  }, [isDarkTheme]);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [hoveredPort, setHoveredPort] = useState(null);
  // Image crop modal: holds the id of the node currently being cropped
  const [cropModalNodeId, setCropModalNodeId] = useState(null);
  // Node id awaiting a file pick from the "Replace Image" context-menu action
  const [replaceImageNodeId, setReplaceImageNodeId] = useState(null);
  const replaceImageInputRef = useRef(null);

  // Context menu state: { x, y, target: { type:'node'|'edge'|'canvas', id? } }
  const [contextMenu, setContextMenu] = useState(null);
  // Node z-order (array of node ids, last = front)
  const [nodeOrder, setNodeOrder] = useState([]);
  const [exportModal, setExportModal] = useState({ isOpen: false, format: 'png' });

  // HISTORY STATE (Undo/Redo)
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [dragStartSnapshot, setDragStartSnapshot] = useState(null);

  const svgRef = useRef(null);
  const snap = (val) => Math.round(val / GRID) * GRID;

  // --- PAGE MANAGEMENT ---
  // Save current working state into the pages array for the current active page
  const saveCurrentPageState = useCallback(() => {
    setPages(prev => prev.map(p => p.id === activePageId ? {
      ...p,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      canvasConfig: { ...canvasConfig },
      canvasSettings: { ...canvasSettings },
      transform: { ...transform },
      past: JSON.parse(JSON.stringify(past)),
      future: JSON.parse(JSON.stringify(future)),
    } : p));
  }, [activePageId, nodes, edges, canvasConfig, canvasSettings, transform, past, future]);

  // Load a page's state into the working state variables
  const loadPageState = useCallback((page) => {
    setNodes(JSON.parse(JSON.stringify(page.nodes)));
    setEdges(JSON.parse(JSON.stringify(page.edges)));
    setCanvasConfig({ ...page.canvasConfig });
    setCanvasSettings({ ...page.canvasSettings });
    setTransform({ ...page.transform });
    setPast(JSON.parse(JSON.stringify(page.past || [])));
    setFuture(JSON.parse(JSON.stringify(page.future || [])));
    // Reset interaction state
    setSelected(null);
    setMultiSelected([]);
    setMultiSelectedEdges([]);
    setEditingNodeId(null);
    setContextMenu(null);
    setDragging(null);
    setSnapLines([]);
  }, []);

  const handleSwitchPage = useCallback((targetPageId) => {
    if (targetPageId === activePageId) return;
    // Save current page state first
    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      canvasConfig: { ...canvasConfig },
      canvasSettings: { ...canvasSettings },
      transform: { ...transform },
      past: JSON.parse(JSON.stringify(past)),
      future: JSON.parse(JSON.stringify(future)),
    };
    setPages(prev => {
      const updated = prev.map(p => p.id === activePageId ? { ...p, ...currentState } : p);
      // Load target page
      const targetPage = updated.find(p => p.id === targetPageId);
      if (targetPage) {
        loadPageState(targetPage);
      }
      return updated;
    });
    setActivePageId(targetPageId);
  }, [activePageId, nodes, edges, canvasConfig, canvasSettings, transform, past, future, loadPageState]);

  const handleAddPage = useCallback(() => {
    // Save current page first
    saveCurrentPageState();
    pageCounterRef.current += 1;
    const newId = `page-${Date.now()}`;
    const newPage = makeDefaultPage(newId, `Page ${pageCounterRef.current}`);
    setPages(prev => [...prev, newPage]);
    loadPageState(newPage);
    setActivePageId(newId);
  }, [saveCurrentPageState, loadPageState]);

  const handleClosePage = useCallback((pageId) => {
    setPages(prev => {
      if (prev.length <= 1) return prev; // prevent closing last page
      const newPages = prev.filter(p => p.id !== pageId);
      // If closing the active page, switch to a neighbor
      if (pageId === activePageId) {
        const oldIdx = prev.findIndex(p => p.id === pageId);
        const newActive = newPages[Math.min(oldIdx, newPages.length - 1)];
        loadPageState(newActive);
        setActivePageId(newActive.id);
      }
      return newPages;
    });
  }, [activePageId, loadPageState]);

  const handleRenamePage = useCallback((pageId, newName) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, name: newName } : p));
  }, []);

  const handleDuplicatePage = useCallback((pageId) => {
    // Save current page state first so we get the latest data
    saveCurrentPageState();
    setPages(prev => {
      const sourcePage = prev.find(p => p.id === pageId);
      if (!sourcePage) return prev;
      pageCounterRef.current += 1;
      const newId = `page-${Date.now()}`;
      const newPage = {
        ...JSON.parse(JSON.stringify(sourcePage)),
        id: newId,
        name: `${sourcePage.name} (Copy)`,
        past: [],
        future: [],
      };
      const idx = prev.findIndex(p => p.id === pageId);
      const newPages = [...prev];
      newPages.splice(idx + 1, 0, newPage);
      // Switch to the duplicated page
      loadPageState(newPage);
      setActivePageId(newId);
      return newPages;
    });
  }, [saveCurrentPageState, loadPageState]);

  // --- 3. UTILITY & HISTORY ---
  const performAction = useCallback((actionCallback) => {
    setPast(prev => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setFuture([]);
    actionCallback();
  }, [nodes, edges]);

  const handleAddShape = useCallback((shapeType, clientX, clientY) => {
    let pt;
    if (clientX !== undefined && clientY !== undefined && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      pt = {
        x: (clientX - rect.left - transform.x) / transform.scale,
        y: (clientY - rect.top - transform.y) / transform.scale
      };
    } else if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      pt = {
        x: (rect.width / 2 - transform.x) / transform.scale,
        y: (rect.height / 2 - transform.y) / transform.scale
      };
    } else {
      pt = { x: 500, y: 500 };
    }
    const { w: defaultW, h: defaultH } = getShapeDefaultSize(shapeType, BOX_W, BOX_H);
    const newNode = {
      id: `n${Date.now()}`,
      shapeType,
      x: snap(pt.x) - defaultW / 2,
      y: snap(pt.y) - defaultH / 2,
      width: defaultW,
      height: defaultH,
      strokeColor: '#000000',
      strokeWidth: 1,
      text: 'Text'
    };
    performAction(() => {
      setNodes(prev => [...prev, newNode]);
    });
    setSelected({ type: 'node', id: newNode.id });
  }, [viewportRef, performAction, nodes, transform]);

  const handleAddImageNode = useCallback((dataUrl, naturalW, naturalH, clientX, clientY) => {
    let pt;
    if (clientX !== undefined && clientY !== undefined && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      pt = {
        x: (clientX - rect.left - transform.x) / transform.scale,
        y: (clientY - rect.top - transform.y) / transform.scale
      };
    } else if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      pt = {
        x: (rect.width / 2 - transform.x) / transform.scale,
        y: (rect.height / 2 - transform.y) / transform.scale
      };
    } else {
      pt = { x: 500, y: 500 };
    }

    const MAX_DIM = 240;
    const safeNatW = naturalW || 160;
    const safeNatH = naturalH || 120;
    const ratio = safeNatW / safeNatH;
    let w = safeNatW, h = safeNatH;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (ratio >= 1) { w = MAX_DIM; h = MAX_DIM / ratio; }
      else { h = MAX_DIM; w = MAX_DIM * ratio; }
    }

    const newNode = {
      id: `n${Date.now()}`,
      shapeType: 'image',
      x: snap(pt.x) - w / 2,
      y: snap(pt.y) - h / 2,
      width: Math.round(w),
      height: Math.round(h),
      fillType: 'none',
      fillColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 0,
      imageSrc: dataUrl,
      imageNaturalWidth: safeNatW,
      imageNaturalHeight: safeNatH,
      imageFit: 'stretch', // Changed from 'cover' to 'stretch'
      imageRadius: 0,
      imageCropRect: { x: 0, y: 0, width: 1, height: 1 },
      text: ''
    };
    performAction(() => {
      setNodes(prev => [...prev, newNode]);
    });
    setSelected({ type: 'node', id: newNode.id });
  }, [viewportRef, performAction, transform]);

  const handleAddLine = useCallback((lineId, clientX, clientY) => {
    let pt;
    if (clientX !== undefined && clientY !== undefined && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      pt = {
        x: (clientX - rect.left - transform.x) / transform.scale,
        y: (clientY - rect.top - transform.y) / transform.scale
      };
    } else if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      pt = {
        x: (rect.width / 2 - transform.x) / transform.scale,
        y: (rect.height / 2 - transform.y) / transform.scale
      };
    } else {
      pt = { x: 500, y: 500 };
    }
    const lineType = getLineType(lineId);
    const cx = snap(pt.x);
    const cy = snap(pt.y);
    const newEdge = {
      id: `e${Date.now()}`,
      sourceType: 'point',
      sourcePoint: { x: cx - 50, y: cy },
      targetType: 'point',
      targetPoint: { x: cx + 50, y: cy },
      waypoints: [],
      customized: false,
      markerStart: lineType.markerStart,
      markerEnd: lineType.markerEnd,
      strokeStyle: lineType.strokeStyle,
    };
    performAction(() => {
      setEdges(prev => [...prev, newEdge]);
    });
    // Intentionally not auto-selecting the new line: selecting it immediately
    // shows the endpoint-edit (green circle) handles on drop, before the user
    // has actually clicked to select/edit it.
    setSelected(null);
  }, [viewportRef, performAction, edges, transform]);

  // Inserts a diagram generated by the Data Editor (DiagramTextImporter)
  // into the canvas, selects it, and pans/zooms so it's fully in view.
  const handleGenerateDiagramImport = useCallback((newNodes, newEdges, bounds) => {
    performAction(() => {
      setNodes(prev => [...prev, ...newNodes]);
      setEdges(prev => [...prev, ...newEdges]);
    });
    setMultiSelected(newNodes.map(n => n.id));
    setSelected(null);

    if (bounds && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const pad = 80;
      const diagW = Math.max(1, (bounds.maxX - bounds.minX) + pad * 2);
      const diagH = Math.max(1, (bounds.maxY - bounds.minY) + pad * 2);
      const scale = clamp(Math.min(rect.width / diagW, rect.height / diagH), MIN_SCALE, 1.2);
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      setTransform({ x: rect.width / 2 - cx * scale, y: rect.height / 2 - cy * scale, scale });
    }
  }, [performAction, viewportRef, transform]);

  useEffect(() => {
    if (!libraryDrag) return;
    const handleMove = (e) => {
      setLibraryDrag(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null);
    };
    const handleUp = (e) => {
      if (libraryDrag.clientX !== undefined) {
        handleAddShape(libraryDrag.shapeId, e.clientX, e.clientY);
      }
      setLibraryDrag(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [libraryDrag, handleAddShape]);

  useEffect(() => {
    if (!libraryLineDrag) return;
    const handleMove = (e) => {
      setLibraryLineDrag(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null);
    };
    const handleUp = (e) => {
      if (libraryLineDrag.clientX !== undefined) {
        handleAddLine(libraryLineDrag.lineId, e.clientX, e.clientY);
      }
      setLibraryLineDrag(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [libraryLineDrag, handleAddLine]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(prev => [{ nodes, edges }, ...prev]);
    setPast(past.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setSelected(null); setMultiSelected([]);
  }, [past, nodes, edges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(prev => [...prev, { nodes, edges }]);
    setFuture(future.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelected(null); setMultiSelected([]);
  }, [future, nodes, edges]);

  const pruneOrphanAnchors = (edgesArr) => {
    let result = edgesArr;
    let changed = true;
    while (changed) {
      changed = false;
      const ids = new Set(result.map(e => e.id));
      const filtered = result.filter(e => e.targetType !== 'edgeAnchor' || ids.has(e.anchorEdgeId));
      if (filtered.length !== result.length) { result = filtered; changed = true; }
    }
    return result;
  };

  const updateNode = useCallback((id, updates) => {
    performAction(() => {
      if (updates._action === 'front') {
        setNodes(prev => {
          const n = prev.find(n => n.id === id);
          return n ? [...prev.filter(n => n.id !== id), n] : prev;
        });
      } else if (updates._action === 'back') {
        setNodes(prev => {
          const n = prev.find(n => n.id === id);
          return n ? [n, ...prev.filter(n => n.id !== id)] : prev;
        });
      } else {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
      }
    });
  }, [performAction]);

  const handleReplaceImageFileChosen = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    const nodeId = replaceImageNodeId;
    setReplaceImageNodeId(null);
    if (!file || !nodeId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        updateNode(nodeId, {
          imageSrc: dataUrl,
          imageNaturalWidth: img.naturalWidth,
          imageNaturalHeight: img.naturalHeight,
          imageCropRect: { x: 0, y: 0, width: 1, height: 1 }
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [replaceImageNodeId, updateNode]);

  const updateEdge = useCallback((updatedEdge) => {
    performAction(() => {
      setEdges(prev => prev.map(e => e.id === updatedEdge.id ? updatedEdge : e));
    });
  }, [performAction]);

  const handleDelete = useCallback(() => {
    performAction(() => {
      let nextNodes = [...nodes]; let nextEdges = [...edges];
      if (selected) {
        if (selected.type === 'node') {
          nextNodes = nextNodes.filter(n => n.id !== selected.id);
          nextEdges = nextEdges.filter(e => e.source !== selected.id && e.target !== selected.id);
        } else if (selected.type === 'edge') {
          nextEdges = nextEdges.filter(e => e.id !== selected.id);
        }
      }
      if (multiSelected.length > 0) {
        nextNodes = nextNodes.filter(n => !multiSelected.includes(n.id));
        nextEdges = nextEdges.filter(e => !multiSelected.includes(e.source) && !multiSelected.includes(e.target));
      }
      if (multiSelectedEdges.length > 0) {
        nextEdges = nextEdges.filter(e => !multiSelectedEdges.includes(e.id));
      }
      nextEdges = pruneOrphanAnchors(nextEdges);
      setNodes(nextNodes); setEdges(nextEdges);
      setSelected(null); setMultiSelected([]); setMultiSelectedEdges([]);
    });
  }, [nodes, edges, selected, multiSelected, multiSelectedEdges, performAction]);

  const getSvgPoint = (clientX, clientY) => {
    if (!viewportRef.current) return { x: clientX, y: clientY };
    const rect = viewportRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - transform.x) / transform.scale,
      y: (clientY - rect.top - transform.y) / transform.scale
    };
  };

  // Keyboard Hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') handleDelete();

      // COPY (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        let selectedNodeIds = [];
        if (multiSelected.length > 0) {
          selectedNodeIds = multiSelected;
        } else if (selected?.type === 'node') {
          selectedNodeIds = [selected.id];
        }

        let selectedEdgeIds = [];
        if (multiSelectedEdges.length > 0) {
          selectedEdgeIds = multiSelectedEdges;
        } else if (selected?.type === 'edge') {
          selectedEdgeIds = [selected.id];
        }

        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
          const selectedEdges = edges.filter(e =>
            selectedEdgeIds.includes(e.id) ||
            (selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target))
          );
          setClipboard({ nodes: selectedNodes, edges: selectedEdges });
        }
      }

      // PASTE (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard.nodes.length > 0 || clipboard.edges.length > 0) {
          performAction(() => {
            const oldToNewId = {};
            const offsetX = GRID * 2;
            const offsetY = GRID * 2;

            const newNodes = clipboard.nodes.map(n => {
              const newId = `n${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
              oldToNewId[n.id] = newId;
              return {
                ...n,
                id: newId,
                x: n.x + offsetX,
                y: n.y + offsetY
              };
            });

            const newEdges = clipboard.edges.map(e => {
              const newId = `e${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
              oldToNewId[e.id] = newId;

              const newSource = (e.sourceType === 'node' && oldToNewId[e.source])
                ? oldToNewId[e.source]
                : (e.sourceType === 'node' && nodes.some(n => n.id === e.source) ? e.source : null);

              const newTarget = (e.targetType === 'node' && oldToNewId[e.target])
                ? oldToNewId[e.target]
                : (e.targetType === 'node' && nodes.some(n => n.id === e.target) ? e.target : null);

              const newAnchorEdgeId = (e.targetType === 'edgeAnchor' && oldToNewId[e.anchorEdgeId])
                ? oldToNewId[e.anchorEdgeId]
                : e.anchorEdgeId;

              const newSourceAnchorEdgeId = (e.sourceType === 'edgeAnchor' && oldToNewId[e.sourceAnchorEdgeId])
                ? oldToNewId[e.sourceAnchorEdgeId]
                : e.sourceAnchorEdgeId;

              return {
                ...e,
                id: newId,
                source: newSource,
                sourceType: newSource ? 'node' : (e.sourceType === 'point' ? 'point' : e.sourceType),
                target: newTarget,
                targetType: newTarget ? 'node' : e.targetType,
                anchorEdgeId: newAnchorEdgeId,
                sourceAnchorEdgeId: newSourceAnchorEdgeId,
                sourcePoint: e.sourcePoint ? { x: e.sourcePoint.x + offsetX, y: e.sourcePoint.y + offsetY } : null,
                targetPoint: e.targetPoint ? { x: e.targetPoint.x + offsetX, y: e.targetPoint.y + offsetY } : null,
                waypoints: e.waypoints ? e.waypoints.map(wp => ({ x: wp.x + offsetX, y: wp.y + offsetY })) : []
              };
            });

            setClipboard({ nodes: newNodes, edges: newEdges });
            setNodes(prev => [...prev, ...newNodes]);
            setEdges(prev => [...prev, ...newEdges]);

            setMultiSelected(newNodes.map(n => n.id));
            setMultiSelectedEdges(newEdges.map(e => e.id));
            if (newNodes.length === 1 && newEdges.length === 0) {
              setSelected({ type: 'node', id: newNodes[0].id });
            } else if (newEdges.length === 1 && newNodes.length === 0) {
              setSelected({ type: 'edge', id: newEdges[0].id });
            } else {
              setSelected(null);
            }
          });
        }
      }

      // UNDO (Ctrl+Z / Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      // REDO (Ctrl+Y / Cmd+Y / Cmd+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, selected, multiSelected, multiSelectedEdges, clipboard, past, future, handleDelete, performAction, undo, redo]);

  // --- 4. CORE MATH & PORTS ---
  // Port geometry, orthogonal routing, waypoint cleanup, line-to-line
  // snapping, and reconnect-on-drag logic all live in utils/connectionMath.js
  // now. useConnectionMath() re-derives these functions whenever nodes/edges
  // change, so every call site below keeps working exactly as before.
  const {
    getPortCoord, getStartCoord, getEndCoord, buildFullLine, buildAnchorCoord,
    getFullLine, getAnchorPointInfo, checkLineRectIntersect, isPathClear,
    findEdgeSnapPoint, getExitPoint, smartRoute, cleanup, reconnectEnd,
    straightLineWaypoints, detachChildrenOfMovingEdges, reconnectEdgeEnd,
  } = useConnectionMath({ nodes, edges, BOX_W, BOX_H, EXIT, SNAP_RADIUS, snap });


  // Add a new free line directly on canvas
  const handleAddFreeLine = () => {
    performAction(() => {
      const center = { x: 4700, y: 4500 };
      const newEdge = {
        id: `e${Date.now()}`,
        sourceType: 'point',
        sourcePoint: { x: center.x - 100, y: center.y },
        targetType: 'point',
        targetPoint: { x: center.x + 100, y: center.y },
        waypoints: [],
        customized: false
      };
      setEdges([...edges, newEdge]);
      setSelected({ type: 'edge', id: newEdge.id });
    });
  };

  // --- EXPORT & IMPORT ---
  const downloadFile = (data, filename, type) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    // Save current page state before export so pages array is up-to-date
    const currentPageState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      canvasConfig: { ...canvasConfig },
      canvasSettings: { ...canvasSettings },
      transform: { ...transform },
      past: [],
      future: [],
    };
    const allPages = pages.map(p => p.id === activePageId ? { ...p, ...currentPageState } : p);
    const dataJSON = JSON.stringify({ pages: allPages, activePageId, nodes, edges, canvasConfig, canvasSettings });

    if (['png', 'jpeg', 'svg', 'pdf'].includes(format)) {
      // Clear any active selection/hover before the dialog captures the canvas,
      // so selection outlines, resize handles, and line endpoint handles never
      // end up baked into the exported image/PDF/SVG.
      setSelected(null);
      setMultiSelected([]);
      setMultiSelectedEdges([]);
      setHovered(null);
      setHoveredPort(null);
      setExportModal({ isOpen: true, format });
      return;
    }

    if (format === 'json') {
      downloadFile(dataJSON, 'mindmap.json', 'application/json');
    } else if (format === 'drawmap' || format === 'xml') {
      const ext = format === 'drawmap' ? 'drawmap' : 'xml';
      const escapeXML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const pagesData = JSON.stringify(allPages);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<drawmap>\n  <pages>${escapeXML(pagesData)}</pages>\n  <nodes>${escapeXML(JSON.stringify(nodes))}</nodes>\n  <edges>${escapeXML(JSON.stringify(edges))}</edges>\n  <canvasConfig>${escapeXML(JSON.stringify(canvasConfig))}</canvasConfig>\n  <canvasSettings>${escapeXML(JSON.stringify(canvasSettings))}</canvasSettings>\n</drawmap>`;
      downloadFile(xml, `mindmap.${ext}`, 'application/xml');
    } else if (format === 'html') {
      const html = `<!DOCTYPE html><html><head><title>Mindmap Export</title></head><body style="margin:0;padding:20px;font-family:sans-serif;background:${canvasConfig.backgroundColor};"><h1>Mindmap Data</h1><textarea style="width:100%;height:400px;" readonly>${dataJSON.replace(/</g, '&lt;')}</textarea></body></html>`;
      downloadFile(html, 'mindmap.html', 'text/html');
    } else if (format === 'svg') {
      if (!svgRef.current) return;
      const svgClone = svgRef.current.cloneNode(true);
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgClone);
      const xmlData = '<?xml version="1.0" standalone="no"?>\r\n' + source;
      downloadFile(xmlData, 'mindmap.svg', 'image/svg+xml;charset=utf-8');
    } else if (format === 'png' || format === 'jpeg') {
      if (!viewportRef.current) return;
      const method = format === 'png' ? domtoimage.toPng : domtoimage.toJpeg;
      method(viewportRef.current, { quality: 1, bgcolor: canvasConfig.backgroundColor })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `mindmap.${format}`;
          link.href = dataUrl;
          link.click();
        }).catch(err => alert("Error exporting image"));
    } else if (format === 'pdf') {
      if (!viewportRef.current) return;
      domtoimage.toPng(viewportRef.current, { bgcolor: canvasConfig.backgroundColor })
        .then((dataUrl) => {
          const pdf = new jsPDF({ orientation: canvasSettings.orientation === 'landscape' ? 'l' : 'p', unit: 'px', format: [canvasSettings.width, canvasSettings.height] });
          pdf.addImage(dataUrl, 'PNG', 0, 0, canvasSettings.width, canvasSettings.height);
          pdf.save('mindmap.pdf');
        }).catch(err => alert("Error exporting PDF"));
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      try {
        let parsedNodes, parsedEdges, parsedConfig, parsedSettings;
        if (file.name.endsWith('.drawmap') || file.name.endsWith('.xml')) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "text/xml");

          const decodeXML = (str) => {
            const txt = document.createElement("textarea");
            txt.innerHTML = str;
            return txt.value;
          };

          const nodesNode = xmlDoc.getElementsByTagName('nodes')[0];
          const edgesNode = xmlDoc.getElementsByTagName('edges')[0];
          const configNode = xmlDoc.getElementsByTagName('canvasConfig')[0];
          const settingsNode = xmlDoc.getElementsByTagName('canvasSettings')[0];
          const pagesNode = xmlDoc.getElementsByTagName('pages')[0];

          if (pagesNode) {
            const importedPages = JSON.parse(decodeXML(pagesNode.textContent));
            if (importedPages && importedPages.length > 0) {
              setPages(importedPages);
              const firstPage = importedPages[0];
              setActivePageId(firstPage.id);
              loadPageState(firstPage);
              pageCounterRef.current = importedPages.length;
              return;
            }
          }

          if (nodesNode) parsedNodes = JSON.parse(decodeXML(nodesNode.textContent));
          if (edgesNode) parsedEdges = JSON.parse(decodeXML(edgesNode.textContent));
          if (configNode) parsedConfig = JSON.parse(decodeXML(configNode.textContent));
          if (settingsNode) parsedSettings = JSON.parse(decodeXML(settingsNode.textContent));
        } else if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          // Multi-page format
          if (parsed.pages && parsed.pages.length > 0) {
            setPages(parsed.pages);
            const firstPage = parsed.pages[0];
            setActivePageId(firstPage.id);
            loadPageState(firstPage);
            pageCounterRef.current = parsed.pages.length;
            return;
          }
          parsedNodes = parsed.nodes;
          parsedEdges = parsed.edges;
          parsedConfig = parsed.canvasConfig;
          parsedSettings = parsed.canvasSettings;
        }

        if (parsedNodes || parsedEdges || parsedConfig || parsedSettings) {
          performAction(() => {
            if (parsedNodes) setNodes(parsedNodes);
            if (parsedEdges) setEdges(parsedEdges);
            if (parsedConfig) setCanvasConfig(parsedConfig);
            if (parsedSettings) setCanvasSettings(parsedSettings);
            setSelected(null);
            setMultiSelected([]);
            setMultiSelectedEdges([]);
            setTransform({ x: 50, y: 50, scale: 1 });
          });
        }
      } catch (err) {
        alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const fileInputRef = useRef(null);

  // --- CONTEXT MENU HANDLERS ---
  const closeContextMenu = () => setContextMenu(null);

  const MULTI_ALIGN_ACTIONS = ['alignLeft', 'alignHCenter', 'alignRight', 'alignTop', 'alignVCenter', 'alignBottom', 'distributeH', 'distributeV'];

  const handleContextMenuAction = (action) => {
    closeContextMenu();

    // Alignment / distribution across the current multi-selection. Handled
    // up front because these are dispatched from the Sidebar's multi-select
    // panel (no context menu / single `selected` target involved).
    if (MULTI_ALIGN_ACTIONS.includes(action) && multiSelected.length > 1) {
      performAction(() => {
        setNodes(prev => {
          const selectedNodes = prev.filter(n => multiSelected.includes(n.id) && !n.locked);
          if (selectedNodes.length < 2) return prev;
          const getW = (n) => n.width || BOX_W;
          const getH = (n) => n.height || BOX_H;
          const minX = Math.min(...selectedNodes.map(n => n.x));
          const maxX = Math.max(...selectedNodes.map(n => n.x + getW(n)));
          const minY = Math.min(...selectedNodes.map(n => n.y));
          const maxY = Math.max(...selectedNodes.map(n => n.y + getH(n)));
          let updated = selectedNodes;

          switch (action) {
            case 'alignLeft':
              updated = selectedNodes.map(n => ({ ...n, x: minX }));
              break;
            case 'alignHCenter':
              updated = selectedNodes.map(n => ({ ...n, x: (minX + maxX) / 2 - getW(n) / 2 }));
              break;
            case 'alignRight':
              updated = selectedNodes.map(n => ({ ...n, x: maxX - getW(n) }));
              break;
            case 'alignTop':
              updated = selectedNodes.map(n => ({ ...n, y: minY }));
              break;
            case 'alignVCenter':
              updated = selectedNodes.map(n => ({ ...n, y: (minY + maxY) / 2 - getH(n) / 2 }));
              break;
            case 'alignBottom':
              updated = selectedNodes.map(n => ({ ...n, y: maxY - getH(n) }));
              break;
            case 'distributeH': {
              if (selectedNodes.length < 3) break;
              const sorted = [...selectedNodes].sort((a, b) => (a.x + getW(a) / 2) - (b.x + getW(b) / 2));
              const first = sorted[0], last = sorted[sorted.length - 1];
              const firstCenter = first.x + getW(first) / 2;
              const lastCenter = last.x + getW(last) / 2;
              const step = (lastCenter - firstCenter) / (sorted.length - 1);
              updated = sorted.map((n, i) => (i === 0 || i === sorted.length - 1) ? n : { ...n, x: firstCenter + step * i - getW(n) / 2 });
              break;
            }
            case 'distributeV': {
              if (selectedNodes.length < 3) break;
              const sorted = [...selectedNodes].sort((a, b) => (a.y + getH(a) / 2) - (b.y + getH(b) / 2));
              const first = sorted[0], last = sorted[sorted.length - 1];
              const firstCenter = first.y + getH(first) / 2;
              const lastCenter = last.y + getH(last) / 2;
              const step = (lastCenter - firstCenter) / (sorted.length - 1);
              updated = sorted.map((n, i) => (i === 0 || i === sorted.length - 1) ? n : { ...n, y: firstCenter + step * i - getH(n) / 2 });
              break;
            }
            default:
              break;
          }

          const byId = new Map(updated.map(n => [n.id, n]));
          return prev.map(n => byId.get(n.id) || n);
        });
      });
      return;
    }

    // Fall back to current selection when called from toolbar (no context menu open)
    const target = contextMenu?.target || (
      selected?.type === 'node' ? { type: 'node', id: selected.id } :
        selected?.type === 'edge' ? { type: 'edge', id: selected.id } :
          { type: 'canvas' }
    );
    if (!target) return;

    if (target.type === 'node') {
      const node = nodes.find(n => n.id === target.id);
      if (!node) return;

      switch (action) {
        case 'delete':
          performAction(() => {
            setNodes(prev => prev.filter(n => n.id !== target.id));
            setEdges(prev => prev.filter(e => e.source !== target.id && e.target !== target.id));
            setSelected(null);
          });
          break;
        case 'cut':
          setClipboard({ nodes: [node], edges: [] });
          performAction(() => {
            setNodes(prev => prev.filter(n => n.id !== target.id));
            setEdges(prev => prev.filter(e => e.source !== target.id && e.target !== target.id));
            setSelected(null);
          });
          break;
        case 'copy':
          setClipboard({ nodes: [node], edges: [] });
          break;
        case 'duplicate': {
          const newId = `n${Date.now()}`;
          const newNode = { ...node, id: newId, x: node.x + 40, y: node.y + 40 };
          performAction(() => { setNodes(prev => [...prev, newNode]); });
          setSelected({ type: 'node', id: newId });
          break;
        }
        case 'toFront':
          performAction(() => setNodes(prev => {
            const n = prev.find(n => n.id === target.id);
            return n ? [...prev.filter(n => n.id !== target.id), n] : prev;
          }));
          break;
        case 'toBack':
          performAction(() => setNodes(prev => {
            const n = prev.find(n => n.id === target.id);
            return n ? [n, ...prev.filter(n => n.id !== target.id)] : prev;
          }));
          break;
        case 'bringForward': {
          // Move one position toward front in nodes array
          setNodes(prev => {
            const idx = prev.findIndex(n => n.id === target.id);
            if (idx < prev.length - 1) {
              const arr = [...prev];
              [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
              return arr;
            }
            return prev;
          });
          break;
        }
        case 'sendBackward': {
          setNodes(prev => {
            const idx = prev.findIndex(n => n.id === target.id);
            if (idx > 0) {
              const arr = [...prev];
              [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
              return arr;
            }
            return prev;
          });
          break;
        }
        case 'lock':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, locked: !n.locked } : n)));
          break;
        case 'alignLeftPage':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, x: 0 } : n)));
          break;
        case 'alignHCenterPage':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, x: (canvasSettings.width || 1920) / 2 - (n.width || BOX_W) / 2 } : n)));
          break;
        case 'alignRightPage':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, x: (canvasSettings.width || 1920) - (n.width || BOX_W) } : n)));
          break;
        case 'alignTopPage':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, y: 0 } : n)));
          break;
        case 'alignVCenterPage':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, y: (canvasSettings.height || 1080) / 2 - (n.height || BOX_H) / 2 } : n)));
          break;
        case 'alignBottomPage':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, y: (canvasSettings.height || 1080) - (n.height || BOX_H) } : n)));
          break;
        case 'editText':
          setEditingNodeId(target.id);
          setSelected({ type: 'node', id: target.id });
          break;
        case 'cropImage':
          setCropModalNodeId(target.id);
          break;
        case 'replaceImage':
          setReplaceImageNodeId(target.id);
          if (replaceImageInputRef.current) replaceImageInputRef.current.click();
          break;
        case 'resetCrop':
          performAction(() => setNodes(prev => prev.map(n => n.id === target.id ? { ...n, imageCropRect: { x: 0, y: 0, width: 1, height: 1 } } : n)));
          break;
        case 'selectAll':
          setMultiSelected(nodes.map(n => n.id));
          break;
        default: break;
      }
    } else if (target.type === 'edge') {
      const edge = edges.find(e => e.id === target.id);
      if (!edge) return;

      switch (action) {
        case 'delete':
          performAction(() => {
            setEdges(prev => prev.filter(e => e.id !== target.id));
            setSelected(null);
          });
          break;
        case 'cut':
          setClipboard({ nodes: [], edges: [edge] });
          performAction(() => { setEdges(prev => prev.filter(e => e.id !== target.id)); setSelected(null); });
          break;
        case 'copy':
          setClipboard({ nodes: [], edges: [edge] });
          break;
        case 'duplicate': {
          const newEdge = { ...edge, id: `e${Date.now()}`, waypoints: edge.waypoints.map(wp => ({ ...wp, x: wp.x + 20, y: wp.y + 20 })) };
          performAction(() => setEdges(prev => [...prev, newEdge]));
          setSelected({ type: 'edge', id: newEdge.id });
          break;
        }
        case 'reverseDirection': {
          performAction(() => setEdges(prev => prev.map(e => e.id !== target.id ? e : {
            ...e,
            source: e.target, sourceType: e.targetType, portS: e.portT, sourcePoint: e.targetPoint,
            sourceAnchorEdgeId: e.anchorEdgeId, sourceAnchorT: e.anchorT,
            target: e.source, targetType: e.sourceType, portT: e.portS, targetPoint: e.sourcePoint,
            anchorEdgeId: e.sourceAnchorEdgeId, anchorT: e.sourceAnchorT,
            waypoints: [...(e.waypoints || [])].reverse()
          })));
          break;
        }
        case 'selectAll':
          setMultiSelected(nodes.map(n => n.id));
          break;
        default: break;
      }
    } else if (target.type === 'canvas') {
      switch (action) {
        case 'selectAll':
          setMultiSelected(nodes.map(n => n.id));
          setMultiSelectedEdges(edges.map(e => e.id));
          break;
        case 'paste':
          if (clipboard.nodes.length > 0 || clipboard.edges.length > 0) {
            performAction(() => {
              // If called from toolbar (no contextMenu), paste at viewport centre
              let pasteClientX, pasteClientY;
              if (contextMenu) {
                pasteClientX = contextMenu.x;
                pasteClientY = contextMenu.y;
              } else if (viewportRef.current) {
                const r = viewportRef.current.getBoundingClientRect();
                pasteClientX = r.left + r.width / 2;
                pasteClientY = r.top + r.height / 2;
              } else {
                pasteClientX = 400;
                pasteClientY = 300;
              }
              const targetSvgPt = getSvgPoint(pasteClientX, pasteClientY);

              let offsetX = 40;
              let offsetY = 40;

              if (clipboard.nodes.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                clipboard.nodes.forEach(n => {
                  minX = Math.min(minX, n.x);
                  minY = Math.min(minY, n.y);
                  maxX = Math.max(maxX, n.x + (n.width || BOX_W));
                  maxY = Math.max(maxY, n.y + (n.height || BOX_H));
                });
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                offsetX = snap(targetSvgPt.x - centerX);
                offsetY = snap(targetSvgPt.y - centerY);
              }

              const oldToNewId = {};
              const newNodes = clipboard.nodes.map(n => {
                const newId = `n${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                oldToNewId[n.id] = newId;
                return { ...n, id: newId, x: n.x + offsetX, y: n.y + offsetY };
              });
              const newEdges = clipboard.edges.map(e => ({
                ...e, id: `e${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                source: oldToNewId[e.source] || e.source,
                target: oldToNewId[e.target] || e.target,
                waypoints: (e.waypoints || []).map(wp => ({ x: wp.x + offsetX, y: wp.y + offsetY }))
              }));
              setNodes(prev => [...prev, ...newNodes]);
              setEdges(prev => [...prev, ...newEdges]);

              // We don't update clipboard here so next context-menu paste calculates offset from ORIGINAL clipboard coordinates.
              // BUT we DO want Ctrl+V to paste 40px away from THIS paste. So let's update the clipboard to the new items.
              setClipboard({ nodes: newNodes, edges: newEdges });
              setMultiSelected(newNodes.map(n => n.id));
            });
          }
          break;
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'fitPage':
          setTransform({ x: 50, y: 50, scale: 1 });
          break;
        case 'toggleGrid':
          setCanvasConfig(p => ({ ...p, showGrid: !p.showGrid }));
          break;
        case 'import':
          if (fileInputRef.current) fileInputRef.current.click();
          break;
        case 'export-drawmap': handleExport('drawmap'); break;
        case 'export-xml': handleExport('xml'); break;
        case 'export-json': handleExport('json'); break;
        case 'export-svg': handleExport('svg'); break;
        case 'export-png': handleExport('png'); break;
        case 'export-jpeg': handleExport('jpeg'); break;
        case 'export-pdf': handleExport('pdf'); break;
        case 'export-html': handleExport('html'); break;
        default: break;
      }
    }
  };

  // --- 5. EVENT HANDLERS ---
  const handleBgDown = (e) => {
    if (e.button === 2) return; // right-click handled by onContextMenu
    if (mode === 'pan') return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    setDragging({ type: 'selection' });
    setSelectionBox({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y });
    setSelected(null);
    setMultiSelected([]);
    setMultiSelectedEdges([]);
    closeContextMenu();
  };

  const handleDoubleClick = (e) => {
    if (mode === 'pan') return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    const w = 160, h = 40;
    const x = snap(pt.x) - w / 2;
    const y = snap(pt.y) - h / 2;
    const newNode = {
      id: `n${Date.now()}`,
      shapeType: 'rectangle',
      x, y, width: w, height: h,
      fillType: 'none',
      fillColor: 'transparent',
      strokeWidth: 0,
      text: 'Text',
      textPaddingX: 4,
      textPaddingY: 4,
    };
    performAction(() => {
      setNodes(prev => [...prev, newNode]);
    });
    setSelected({ type: 'node', id: newNode.id });
    setEditingNodeId(newNode.id);
  };

  const handlePointerDown = (e, target) => {
    if (e.button === 2) return; // Ignore right-clicks for dragging/selecting
    if (mode === 'pan') return;
    e.preventDefault(); e.stopPropagation();
    // Capture pointer on the viewport div so onPointerMove/Up always fire
    if (viewportRef.current && e.pointerId !== undefined) {
      try { viewportRef.current.setPointerCapture(e.pointerId); } catch (_) { }
    }

    setDragStartSnapshot({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });

    if (target.type === 'resize') {
      setDragging(target);
      return;
    }

    if (target.type === 'node') {
      const now = Date.now();
      const isDoubleClick =
        lastNodeClickRef.current.id === target.nodeId &&
        (now - lastNodeClickRef.current.time) < DOUBLE_CLICK_MS;
      lastNodeClickRef.current = { id: target.nodeId, time: now };

      const nodeObj = nodes.find(n => n.id === target.nodeId);

      if (isDoubleClick) {
        lastNodeClickRef.current = { id: null, time: 0 };
        setSelected({ type: 'node', id: target.nodeId });
        setMultiSelected([]);
        setMultiSelectedEdges([]);
        // Only enter text-edit if NOT locked
        if (!nodeObj?.locked) {
          setEditingNodeId(target.nodeId);
        }
        return;
      }
      const isMultiSelected = multiSelected.includes(target.nodeId);
      const movingNodeIds = isMultiSelected ? multiSelected : [target.nodeId];

      // If the single target node is locked, just select it — no drag
      if (!isMultiSelected && nodeObj?.locked) {
        setSelected({ type: 'node', id: target.nodeId });
        setMultiSelected([]);
        setMultiSelectedEdges([]);
        return;
      }

      // Filter out locked nodes from group move
      const movableNodeIds = movingNodeIds.filter(id => !nodes.find(n => n.id === id)?.locked);
      if (movableNodeIds.length === 0) return;

      const touchingEdges = edges.filter(ed => movableNodeIds.includes(ed.source) || movableNodeIds.includes(ed.target)).map(ed => ed.id);

      // Moving a single node's box detaches any child lines anchored to lines
      // connected to that node, since a single-node move can reroute its line
      // however it likes. A multi-node "group" move instead translates
      // everything rigidly, and the group-drag branch of handlePointerMove
      // already re-derives each anchored child's position every frame off the
      // translated host — so detaching here would only sever a connected
      // line-to-line junction that should have stayed attached.
      let detachedEdges = edges;
      if (!isMultiSelected) {
        detachedEdges = detachChildrenOfMovingEdges(touchingEdges, edges, nodes);
        if (detachedEdges !== edges) setEdges(detachedEdges);
      }

      if (isMultiSelected) {
        const initialNodes = nodes.filter(n => movableNodeIds.includes(n.id)).map(n => ({ ...n }));
        const initialEdges = detachedEdges.map(ed => ({
          ...ed,
          waypoints: ed.waypoints.map(wp => ({ ...wp }))
        }));
        setDragging({
          type: 'group',
          nodeId: target.nodeId,
          initialMouse: getSvgPoint(e.clientX, e.clientY),
          initialNodes,
          initialEdges
        });
      } else {
        setSelected({ type: 'node', id: target.nodeId });
        setMultiSelected([]);
        setMultiSelectedEdges([]);
        setDragging({
          type: 'node',
          nodeId: target.nodeId,
          initialMouse: getSvgPoint(e.clientX, e.clientY),
          initialNodeX: nodeObj ? nodeObj.x : 0,
          initialNodeY: nodeObj ? nodeObj.y : 0
        });
      }
    } else if (target.type === 'port') {
      const existingEdge = edges.find(e =>
        (e.sourceType !== 'point' && e.source === target.nodeId && e.portS === target.port) ||
        (e.targetType === 'node' && e.target === target.nodeId && e.portT === target.port)
      );

      const currentlySelectedEdge = (selected?.type === 'edge')
        ? edges.find(e => e.id === selected.id && (e.source === target.nodeId || e.target === target.nodeId))
        : null;

      const targetEdge = existingEdge || currentlySelectedEdge;

      if (targetEdge) {
        // Port or node has a connected edge — adjust / detach that line end!
        const isStart = (targetEdge.sourceType !== 'point' && targetEdge.source === target.nodeId);
        const end = isStart ? 'start' : 'end';
        setSelected({ type: 'edge', id: targetEdge.id });
        setDragging({ type: 'endpoint', edgeId: targetEdge.id, end });
        const startPt = getStartCoord(targetEdge, edges, nodes);
        const endPt = getEndCoord(targetEdge, edges, nodes);
        setDrawCursor(end === 'start' ? startPt : endPt);
      } else {
        // Unoccupied port and no line selected -> generate new line
        setSelected(null);
        setDragging({ type: 'drawing', source: target.nodeId, portS: target.port, sourceType: 'node', initialMouse: getSvgPoint(e.clientX, e.clientY), initialClientX: e.clientX, initialClientY: e.clientY });
        setDrawCursor(getPortCoord(nodes.find(n => n.id === target.nodeId), target.port));
      }
    } else if (target.type === 'endpoint') {
      setSelected({ type: 'edge', id: target.edgeId });
      setDragging({ type: 'endpoint', edgeId: target.edgeId, end: target.end });
      const edge = edges.find(ed => ed.id === target.edgeId);
      const startPt = getStartCoord(edge, edges, nodes);
      const endPt = getEndCoord(edge, edges, nodes);
      setDrawCursor(target.end === 'start' ? startPt : endPt);
    } else if (target.type === 'segment' || target.type === 'corner') {
      setSelected({ type: 'edge', id: target.edgeId });

      // Moving parent line segment/corner immediately detaches any child lines attached to it!
      const detachedEdges = detachChildrenOfMovingEdges([target.edgeId], edges, nodes);
      if (detachedEdges !== edges) setEdges(detachedEdges);

      const edge = detachedEdges.find(e => e.id === target.edgeId);
      const pts = getFullLine(edge);
      let initialWps = edge.waypoints.map(wp => ({ ...wp }));
      let dragIndex = target.index;
      let dragState = { ...target };

      if (target.type === 'segment') {
        const pt1 = pts[target.index];
        const pt2 = pts[target.index + 1];
        dragState.isHoriz = pt1.y === pt2.y;
        if (pts.length === 2) { initialWps = [{ ...pt1 }, { ...pt2 }]; dragIndex = 1; }
        else if (target.index === 0) { initialWps = [{ ...pt1 }, { ...pt2 }, ...initialWps]; dragIndex = 1; }
        else if (target.index === pts.length - 2) { initialWps = [...initialWps, { ...pt1 }, { ...pt2 }]; dragIndex = initialWps.length - 1; }
        dragState.index = dragIndex;
      }

      if (target.type === 'corner') {
        dragState.isPrevHoriz = pts[target.index].y === pts[target.index + 1].y;
        dragState.isNextHoriz = pts[target.index + 1].y === pts[target.index + 2].y;
      }
      setDraftWps(initialWps);
      setDragging(dragState);
    }
    setHovered(null);
  };

  const handlePointerMove = (e) => {
    if (!dragging || mode === 'pan') return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    let x = snap(pt.x); let y = snap(pt.y);

    if (dragging.type === 'resize') {
      const dx = pt.x - dragging.initialMouse.x;
      const dy = pt.y - dragging.initialMouse.y;
      let newX = dragging.initialX;
      let newY = dragging.initialY;
      let newW = dragging.initialW;
      let newH = dragging.initialH;

      const MIN_SIZE = 20;

      if (dragging.dir.includes('e')) newW = Math.max(MIN_SIZE, dragging.initialW + dx);
      if (dragging.dir.includes('s')) newH = Math.max(MIN_SIZE, dragging.initialH + dy);
      if (dragging.dir.includes('w')) {
        const dw = dx;
        if (dragging.initialW - dw >= MIN_SIZE) {
          newW = dragging.initialW - dw;
          newX = dragging.initialX + dw;
        }
      }
      if (dragging.dir.includes('n')) {
        const dh = dy;
        if (dragging.initialH - dh >= MIN_SIZE) {
          newH = dragging.initialH - dh;
          newY = dragging.initialY + dh;
        }
      }
      const others = nodes.filter(n => n.id !== dragging.nodeId)
        .map(n => ({ x: n.x, y: n.y, w: n.width || BOX_W, h: n.height || BOX_H }));
      const guides = [];

      if (dragging.dir.includes('e')) {
        const snapR = findAxisSnap(newX + newW,
          others.flatMap(n => [{ val: n.x, label: 'L' }, { val: n.x + n.w, label: 'R' }, { val: n.x + n.w / 2, label: 'C' }])
            .concat([{ val: pageW / 2, label: 'Page Center' }]));
        if (snapR) { newW = snapR.value - newX; guides.push({ type: 'align', axis: 'x', value: snapR.value, label: snapR.label }); }
      }
      if (dragging.dir.includes('w')) {
        const snapL = findAxisSnap(newX,
          others.flatMap(n => [{ val: n.x, label: 'L' }, { val: n.x + n.w, label: 'R' }, { val: n.x + n.w / 2, label: 'C' }])
            .concat([{ val: pageW / 2, label: 'Page Center' }]));
        if (snapL) { newW += newX - snapL.value; newX = snapL.value; guides.push({ type: 'align', axis: 'x', value: snapL.value, label: snapL.label }); }
      }
      if (dragging.dir.includes('s')) {
        const snapB = findAxisSnap(newY + newH,
          others.flatMap(n => [{ val: n.y, label: 'T' }, { val: n.y + n.h, label: 'B' }, { val: n.y + n.h / 2, label: 'M' }])
            .concat([{ val: pageH / 2, label: 'Page Center' }]));
        if (snapB) { newH = snapB.value - newY; guides.push({ type: 'align', axis: 'y', value: snapB.value, label: snapB.label }); }
      }
      if (dragging.dir.includes('n')) {
        const snapT = findAxisSnap(newY,
          others.flatMap(n => [{ val: n.y, label: 'T' }, { val: n.y + n.h, label: 'B' }, { val: n.y + n.h / 2, label: 'M' }])
            .concat([{ val: pageH / 2, label: 'Page Center' }]));
        if (snapT) { newH += newY - snapT.value; newY = snapT.value; guides.push({ type: 'align', axis: 'y', value: snapT.value, label: snapT.label }); }
      }
      if (others.some(n => Math.abs(n.w - newW) < 2)) guides.push({ type: 'size-match', label: '=W' });
      if (others.some(n => Math.abs(n.h - newH) < 2)) guides.push({ type: 'size-match', label: '=H' });
      setSnapLines(guides);

      setNodes(nodes.map(n => n.id === dragging.nodeId
        ? { ...n, x: snap(newX), y: snap(newY), width: snap(newW), height: snap(newH) }
        : n));
      return;
    }

    if (dragging.type === 'selection') {
      setSelectionBox(prev => ({ ...prev, endX: pt.x, endY: pt.y }));
      return;
    }

    if (dragging.type === 'drawing') {
      const cursor = { x, y };
      setDrawCursor(cursor);
      const startPt = getPortCoord(nodes.find(n => n.id === dragging.source), dragging.portS);

      let nearest = null; let minDist = SNAP_RADIUS;
      nodes.forEach(n => {
        if (n.id === dragging.source) return;
        SHAPE_PORT_IDS.forEach(p => {
          const portPt = getPortCoord(n, p);
          const dist = Math.hypot(cursor.x - portPt.x, cursor.y - portPt.y);
          if (dist < minDist) { minDist = dist; nearest = { nodeId: n.id, port: p, x: portPt.x, y: portPt.y }; }
        });
      });
      setSnapPort(nearest);

      const edgeSnap = nearest ? null : findEdgeSnapPoint(cursor, dragging.source);
      setSnapEdgePoint(edgeSnap);

      const endPt = nearest ? { x: nearest.x, y: nearest.y } : (edgeSnap ? { x: edgeSnap.x, y: edgeSnap.y } : cursor);
      const routePortT = nearest ? nearest.port : (edgeSnap ? 'T' : null);
      setDrawRoute([startPt, ...smartRoute(startPt, endPt, dragging.portS, routePortT), endPt]);
      return;
    }

    // --- ENDPOINT DRAGGING & RECONNECTION ---
    if (dragging.type === 'endpoint') {
      const cursor = { x, y };
      setDrawCursor(cursor);
      const edge = edges.find(ed => ed.id === dragging.edgeId);
      if (!edge) return;

      const isStart = dragging.end === 'start';
      const fixedEndPt = isStart ? getEndCoord(edge, edges, nodes) : getStartCoord(edge, edges, nodes);

      // Snap check
      let nearest = null; let minDist = SNAP_RADIUS;
      const excludeNodeId = isStart
        ? (edge.targetType === 'node' ? edge.target : null)
        : (edge.sourceType === 'node' ? edge.source : null);

      nodes.forEach(n => {
        if (n.id === excludeNodeId) return;
        SHAPE_PORT_IDS.forEach(p => {
          const portPt = getPortCoord(n, p);
          const dist = Math.hypot(cursor.x - portPt.x, cursor.y - portPt.y);
          if (dist < minDist) { minDist = dist; nearest = { nodeId: n.id, port: p, x: portPt.x, y: portPt.y }; }
        });
      });
      setSnapPort(nearest);

      const edgeSnap = nearest ? null : findEdgeSnapPoint(cursor, edge.id);
      setSnapEdgePoint(edgeSnap);

      const activePt = nearest ? { x: nearest.x, y: nearest.y } : (edgeSnap ? { x: edgeSnap.x, y: edgeSnap.y } : cursor);

      let portS = isStart ? (nearest ? nearest.port : null) : (edge.sourceType === 'node' ? edge.portS : null);
      let portT = !isStart ? (nearest ? nearest.port : (edgeSnap ? 'T' : null)) : (edge.targetType === 'node' ? edge.portT : null);

      const A = isStart ? activePt : fixedEndPt;
      const B = isStart ? fixedEndPt : activePt;

      setDrawRoute([A, ...smartRoute(A, B, portS, portT), B]);
      return;
    }

    // --- GROUP DRAG ---
    if (dragging.type === 'group') {
      const deltaX = pt.x - dragging.initialMouse.x;
      const deltaY = pt.y - dragging.initialMouse.y;

      const grabbedInitial = dragging.initialNodes.find(n => n.id === dragging.nodeId);
      if (!grabbedInitial) return;

      const rawBaseX = grabbedInitial.x + deltaX;
      const rawBaseY = grabbedInitial.y + deltaY;

      let bestX = null;
      let bestY = null;

      const grabbedNode = dragging.initialNodes.find(n => n.id === dragging.nodeId);
      const gW = grabbedNode ? (grabbedNode.width || BOX_W) : BOX_W;
      const gH = grabbedNode ? (grabbedNode.height || BOX_H) : BOX_H;

      nodes.forEach(n => {
        if (multiSelected.includes(n.id)) return;
        const nW = n.width || BOX_W;
        const nH = n.height || BOX_H;

        [
          { ref: rawBaseX, val: n.x, label: 'L' },
          { ref: rawBaseX + gW / 2, val: n.x + nW / 2, label: 'C' },
          { ref: rawBaseX + gW, val: n.x + nW, label: 'R' },
          { ref: rawBaseX, val: n.x + nW, label: 'R→L' },
          { ref: rawBaseX + gW, val: n.x, label: 'L←R' },
        ].forEach(({ ref, val, label }) => {
          const diff = Math.abs(val - ref);
          if (diff < ALIGN_TOLERANCE && (!bestX || diff < bestX.diff))
            bestX = { value: val, label, diff, correction: val - ref };
        });

        [
          { ref: rawBaseY, val: n.y, label: 'T' },
          { ref: rawBaseY + gH / 2, val: n.y + nH / 2, label: 'M' },
          { ref: rawBaseY + gH, val: n.y + nH, label: 'B' },
          { ref: rawBaseY, val: n.y + nH, label: 'B→T' },
          { ref: rawBaseY + gH, val: n.y, label: 'T←B' },
        ].forEach(({ ref, val, label }) => {
          const diff = Math.abs(val - ref);
          if (diff < ALIGN_TOLERANCE && (!bestY || diff < bestY.diff))
            bestY = { value: val, label, diff, correction: val - ref };
        });
      });

      let baseX = bestX ? rawBaseX + bestX.correction : snap(rawBaseX);
      let baseY = bestY ? rawBaseY + bestY.correction : snap(rawBaseY);

      const guides = [];
      if (bestX) guides.push({ axis: 'x', value: bestX.value, label: bestX.label });
      if (bestY) guides.push({ axis: 'y', value: bestY.value, label: bestY.label });
      setSnapLines(guides);

      const finalDeltaX = baseX - grabbedInitial.x;
      const finalDeltaY = baseY - grabbedInitial.y;

      const updatedNodes = nodes.map(n => {
        if (!multiSelected.includes(n.id)) return n;
        const initial = dragging.initialNodes.find(inode => inode.id === n.id);
        return { ...n, x: initial.x + finalDeltaX, y: initial.y + finalDeltaY };
      });
      setNodes(updatedNodes);

      const movedSet = new Set(multiSelected);
      const pass1 = edges.map(edge => {
        if (edge.targetType === 'edgeAnchor' || edge.sourceType === 'edgeAnchor') return edge;
        const srcMoved = movedSet.has(edge.source);
        const tgtMoved = movedSet.has(edge.target);
        if (!srcMoved && !tgtMoved) return edge;

        if (srcMoved && tgtMoved) {
          const initialEdge = dragging.initialEdges
            ? dragging.initialEdges.find(ie => ie.id === edge.id)
            : null;
          const baseWps = initialEdge ? initialEdge.waypoints : edge.waypoints;
          return { ...edge, waypoints: baseWps.map(wp => ({ x: wp.x + finalDeltaX, y: wp.y + finalDeltaY })) };
        }

        const movedId = srcMoved ? edge.source : edge.target;
        return reconnectEdgeEnd(edge, movedId, updatedNodes, edges);
      });

      const updatedEdges = pass1.map(edge => {
        if (edge.targetType !== 'edgeAnchor' && edge.sourceType !== 'edgeAnchor') return edge;
        const movedId = movedSet.has(edge.source) ? edge.source : (movedSet.has(edge.target) ? edge.target : null);
        return reconnectEdgeEnd(edge, movedId, updatedNodes, pass1);
      });
      setEdges(updatedEdges);
      return;
    }

    // --- SINGLE NODE DRAG ---
    if (dragging.type === 'node') {
      const offsetX = dragging.initialMouse.x - dragging.initialNodeX;
      const offsetY = dragging.initialMouse.y - dragging.initialNodeY;
      const rawX = pt.x - offsetX;
      const rawY = pt.y - offsetY;

      const draggingNode = nodes.find(n => n.id === dragging.nodeId);
      const dW = draggingNode ? (draggingNode.width || BOX_W) : BOX_W;
      const dH = draggingNode ? (draggingNode.height || BOX_H) : BOX_H;

      const others = nodes.filter(n => n.id !== dragging.nodeId)
        .map(n => ({ x: n.x, y: n.y, w: n.width || BOX_W, h: n.height || BOX_H }));

      const { bestX, bestY, guides } = computeSmartGuides({ x: rawX, y: rawY, w: dW, h: dH }, others, pageW, pageH);

      const nextX = bestX ? rawX + bestX.correction : snap(rawX);
      const nextY = bestY ? rawY + bestY.correction : snap(rawY);

      setSnapLines(guides);

      const updatedNodes = nodes.map(n => n.id === dragging.nodeId ? { ...n, x: nextX, y: nextY } : n);
      setNodes(updatedNodes);

      const pass1 = edges.map(edge => {
        if (edge.targetType === 'edgeAnchor' || edge.sourceType === 'edgeAnchor') return edge;
        if (edge.source !== dragging.nodeId && edge.target !== dragging.nodeId) return edge;
        return reconnectEdgeEnd(edge, dragging.nodeId, updatedNodes, edges);
      });
      const updatedEdges = pass1.map(edge => {
        if (edge.targetType !== 'edgeAnchor' && edge.sourceType !== 'edgeAnchor') return edge;
        return reconnectEdgeEnd(edge, dragging.nodeId, updatedNodes, pass1);
      });
      setEdges(updatedEdges);
      return;
    }

    // Segment & Corner dragging
    const edge = edges.find(ed => ed.id === dragging.edgeId);
    if (!edge) return;
    const A = getStartCoord(edge, edges, nodes);
    const B = getEndCoord(edge, edges, nodes);
    let nextWps = draftWps.map(wp => ({ ...wp }));

    if (dragging.type === 'segment') {
      if (dragging.isHoriz) { nextWps[dragging.index - 1].y = y; nextWps[dragging.index].y = y; }
      else { nextWps[dragging.index - 1].x = x; nextWps[dragging.index].x = x; }
    }

    if (dragging.type === 'corner') {
      const j = dragging.index;
      let cx = x; let cy = y;
      if (j === 0) { if (dragging.isPrevHoriz) cy = A.y; else cx = A.x; }
      if (j === draftWps.length - 1) { if (dragging.isNextHoriz) cy = B.y; else cx = B.x; }
      nextWps[j] = { x: cx, y: cy };
      if (j > 0) { if (dragging.isPrevHoriz) nextWps[j - 1].y = cy; else nextWps[j - 1].x = cx; }
      if (j < nextWps.length - 1) { if (dragging.isNextHoriz) nextWps[j + 1].y = cy; else nextWps[j + 1].x = cx; }
    }
    setDraftWps(nextWps);
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;

    let finalNodes = nodes;
    let finalEdges = edges;

    if (dragging.type === 'selection' && selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      const selectedNodeIds = nodes
        .filter(n => n.x + BOX_W > minX && n.x < maxX && n.y + BOX_H > minY && n.y < maxY)
        .map(n => n.id);
      setMultiSelected(selectedNodeIds);
      const selectedEdgeIds = edges
        .filter(e => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target))
        .map(e => e.id);
      setMultiSelectedEdges(selectedEdgeIds);
    } else if (dragging.type === 'drawing') {
      const pt = getSvgPoint(e.clientX, e.clientY);
      // Threshold in screen pixels (5px regardless of zoom)
      if (dragging.initialClientX !== undefined && Math.hypot(e.clientX - dragging.initialClientX, e.clientY - dragging.initialClientY) < 5) {
        setDragging(null);
        return; // Ignore simple click on port, require at least 5px drag
      }

      const cursor = { x: snap(pt.x), y: snap(pt.y) };
      const A = getPortCoord(nodes.find(n => n.id === dragging.source), dragging.portS);

      if (snapPort) {
        // Node connection
        const newEdge = {
          id: `e${Date.now()}`,
          sourceType: 'node', source: dragging.source, portS: dragging.portS,
          targetType: 'node', target: snapPort.nodeId, portT: snapPort.port,
          waypoints: smartRoute(A, { x: snapPort.x, y: snapPort.y }, dragging.portS, snapPort.port),
          customized: false
        };
        finalEdges = [...edges, newEdge];
        setEdges(finalEdges);
        setSelected({ type: 'edge', id: newEdge.id });
      } else if (snapEdgePoint) {
        // Edge anchor connection
        const hostEdge = edges.find(e => e.id === snapEdgePoint.edgeId);
        const info = hostEdge ? getAnchorPointInfo(hostEdge, snapEdgePoint.t) : null;
        if (hostEdge && info) {
          const virtualPort = info.orientation === 'horizontal'
            ? (A.y <= info.y ? 'T' : 'B')
            : (A.x <= info.x ? 'L' : 'R');
          const targetPt = { x: info.x, y: info.y };
          const newEdge = {
            id: `e${Date.now()}`,
            sourceType: 'node', source: dragging.source, portS: dragging.portS,
            targetType: 'edgeAnchor', target: null, portT: virtualPort,
            anchorEdgeId: hostEdge.id, anchorT: snapEdgePoint.t,
            waypoints: smartRoute(A, targetPt, dragging.portS, virtualPort),
            customized: false
          };
          finalEdges = [...edges, newEdge];
          setEdges(finalEdges);
          setSelected({ type: 'edge', id: newEdge.id });
        }
      } else {
        // Free grid end line
        const targetPt = cursor;
        const newEdge = {
          id: `e${Date.now()}`,
          sourceType: 'node', source: dragging.source, portS: dragging.portS,
          targetType: 'point', targetPoint: targetPt,
          waypoints: smartRoute(A, targetPt, dragging.portS, null),
          customized: false
        };
        finalEdges = [...edges, newEdge];
        setEdges(finalEdges);
        setSelected({ type: 'edge', id: newEdge.id });
      }
    } else if (dragging.type === 'endpoint') {
      const pt = getSvgPoint(e.clientX, e.clientY);
      const cursor = { x: snap(pt.x), y: snap(pt.y) };
      const isStart = dragging.end === 'start';
      const edge = edges.find(ed => ed.id === dragging.edgeId);

      if (edge) {
        let nextEdge = { ...edge, customized: true };
        const activePt = snapPort ? { x: snapPort.x, y: snapPort.y } : (snapEdgePoint ? { x: snapEdgePoint.x, y: snapEdgePoint.y } : cursor);

        if (isStart) {
          if (snapPort) {
            nextEdge.sourceType = 'node';
            nextEdge.source = snapPort.nodeId;
            nextEdge.portS = snapPort.port;
            nextEdge.sourcePoint = null;
            nextEdge.sourceAnchorEdgeId = null;
            nextEdge.sourceAnchorT = null;
          } else if (snapEdgePoint) {
            const hostEdge = edges.find(e => e.id === snapEdgePoint.edgeId);
            const info = hostEdge ? getAnchorPointInfo(hostEdge, snapEdgePoint.t) : null;
            const virtualPort = info ? (info.orientation === 'horizontal' ? (activePt.y <= info.y ? 'T' : 'B') : (activePt.x <= info.x ? 'L' : 'R')) : 'T';
            nextEdge.sourceType = 'edgeAnchor';
            nextEdge.source = null;
            nextEdge.portS = virtualPort;
            nextEdge.sourceAnchorEdgeId = snapEdgePoint.edgeId;
            nextEdge.sourceAnchorT = snapEdgePoint.t;
            nextEdge.sourcePoint = null;
          } else {
            nextEdge.sourceType = 'point';
            nextEdge.source = null;
            nextEdge.portS = null;
            nextEdge.sourcePoint = activePt;
            nextEdge.sourceAnchorEdgeId = null;
            nextEdge.sourceAnchorT = null;
          }
        } else {
          if (snapPort) {
            nextEdge.targetType = 'node';
            nextEdge.target = snapPort.nodeId;
            nextEdge.portT = snapPort.port;
            nextEdge.targetPoint = null;
            nextEdge.anchorEdgeId = null;
            nextEdge.anchorT = null;
          } else if (snapEdgePoint) {
            const hostEdge = edges.find(e => e.id === snapEdgePoint.edgeId);
            const info = hostEdge ? getAnchorPointInfo(hostEdge, snapEdgePoint.t) : null;
            const virtualPort = info ? (info.orientation === 'horizontal' ? (activePt.y <= info.y ? 'T' : 'B') : (activePt.x <= info.x ? 'L' : 'R')) : 'T';
            nextEdge.targetType = 'edgeAnchor';
            nextEdge.target = null;
            nextEdge.portT = virtualPort;
            nextEdge.anchorEdgeId = snapEdgePoint.edgeId;
            nextEdge.anchorT = snapEdgePoint.t;
            nextEdge.targetPoint = null;
          } else {
            nextEdge.targetType = 'point';
            nextEdge.target = null;
            nextEdge.portT = null;
            nextEdge.targetPoint = activePt;
            nextEdge.anchorEdgeId = null;
            nextEdge.anchorT = null;
          }
        }

        const newA = getStartCoord(nextEdge, edges, nodes);
        const newB = getEndCoord(nextEdge, edges, nodes);
        nextEdge.waypoints = smartRoute(newA, newB, nextEdge.portS, nextEdge.portT);

        finalEdges = edges.map(e => e.id === edge.id ? nextEdge : e);
        setEdges(finalEdges);
        setSelected({ type: 'edge', id: edge.id });
      }
    } else if (draftWps) {
      const edge = edges.find(ed => ed.id === dragging.edgeId);
      const A = getStartCoord(edge, edges, nodes);
      const B = getEndCoord(edge, edges, nodes);
      const cleanWps = cleanup(draftWps, A, B);
      let nextEdges = edges.map(e => e.id === edge.id ? { ...e, waypoints: cleanWps, customized: true } : e);
      nextEdges = nextEdges.map(e2 => (e2.targetType === 'edgeAnchor' || e2.sourceType === 'edgeAnchor') ? reconnectEdgeEnd(e2, null, nodes, nextEdges) : e2);
      finalEdges = nextEdges;
      setEdges(finalEdges);
    }

    if (dragStartSnapshot) {
      if (JSON.stringify(finalNodes) !== JSON.stringify(dragStartSnapshot.nodes) || JSON.stringify(finalEdges) !== JSON.stringify(dragStartSnapshot.edges)) {
        setPast(prev => [...prev, dragStartSnapshot]); setFuture([]);
      }
      setDragStartSnapshot(null);
    }

    setDragging(null); setDraftWps(null); setDrawCursor(null); setDrawRoute(null); setSnapPort(null); setSnapEdgePoint(null); setSelectionBox(null); setSnapLines([]);
  };

  const selectedEdgeObj = selected?.type === 'edge' ? edges.find(e => e.id === selected.id) : null;

  const pageW = canvasSettings.orientation === 'landscape' ? canvasSettings.width : canvasSettings.height;
  const pageH = canvasSettings.orientation === 'landscape' ? canvasSettings.height : canvasSettings.width;
  const panLimitX = pageW * transform.scale + 500;
  const panLimitY = pageH * transform.scale + 500;

  useGesture(
    {
      // Single-pointer drag: mouse-drag panning, only when explicitly in Pan mode.
      // Touch is excluded entirely so a single finger is always free for
      // draw / resize / select, even while in Pan mode.
      onDragStart: ({ event }) => {
        if (event.pointerType === 'touch') return;
        if (mode !== 'pan') return;
        setIsTransforming(true);
      },
      onDrag: ({ delta: [dx, dy], event }) => {
        if (event.pointerType === 'touch') return;
        if (mode !== 'pan') return;
        setTransform((prev) => ({
          ...prev,
          x: clamp(prev.x + dx, -panLimitX, panLimitX),
          y: clamp(prev.y + dy, -panLimitY, panLimitY),
        }));
      },
      onDragEnd: ({ event }) => {
        if (event.pointerType === 'touch') return;
        if (mode !== 'pan') return;
        setIsTransforming(false);
      },

      // Two-finger pinch: ALWAYS active regardless of mode/select-vs-pan,
      // since two fingers is unambiguous. Handles both zoom (scale change)
      // and pan (centroid movement) at the same time.
      onPinchStart: () => setIsTransforming(true),
      onPinch: ({ origin: [ox, oy], offset: [scale], first, memo }) => {
        if (!viewportRef.current) return memo;
        const rect = viewportRef.current.getBoundingClientRect();
        const pointerX = ox - rect.left;
        const pointerY = oy - rect.top;

        if (first) {
          memo = { prevX: pointerX, prevY: pointerY };
        }

        setTransform((prev) => {
          const newScale = clamp(scale, MIN_SCALE, MAX_SCALE);
          const scaleRatio = newScale / prev.scale;

          // Zoom anchored on the current pinch centroid...
          let newX = pointerX - (pointerX - prev.x) * scaleRatio;
          let newY = pointerY - (pointerY - prev.y) * scaleRatio;

          // ...PLUS however far that centroid itself has moved since the
          // last frame. This is what makes plain two-finger dragging (no
          // change in finger spacing) actually pan the canvas.
          newX += pointerX - memo.prevX;
          newY += pointerY - memo.prevY;

          return {
            scale: newScale,
            x: clamp(newX, -panLimitX, panLimitX),
            y: clamp(newY, -panLimitY, panLimitY),
          };
        });

        memo.prevX = pointerX;
        memo.prevY = pointerY;
        return memo;
      },
      onPinchEnd: () => setIsTransforming(false),

      // Trackpad wheel/gesture events (unchanged) — ctrlKey means
      // pinch-to-zoom on a trackpad, plain wheel = two-finger scroll = pan.
      onWheelStart: () => setIsTransforming(true),
      onWheel: ({ delta: [dx, dy], ctrlKey, event }) => {
        event.preventDefault();
        if (ctrlKey) {
          setTransform((prev) => {
            const newScale = clamp(prev.scale - dy * 0.005, MIN_SCALE, MAX_SCALE);
            if (newScale === prev.scale) return prev;
            if (!viewportRef.current) return { ...prev, scale: newScale };
            const rect = viewportRef.current.getBoundingClientRect();
            const pointerX = event.clientX - rect.left;
            const pointerY = event.clientY - rect.top;
            const scaleRatio = newScale / prev.scale;
            const newX = pointerX - (pointerX - prev.x) * scaleRatio;
            const newY = pointerY - (pointerY - prev.y) * scaleRatio;
            return { scale: newScale, x: clamp(newX, -panLimitX, panLimitX), y: clamp(newY, -panLimitY, panLimitY) };
          });
        } else {
          setTransform((prev) => ({
            ...prev,
            x: clamp(prev.x - dx, -panLimitX, panLimitX),
            y: clamp(prev.y - dy, -panLimitY, panLimitY),
          }));
        }
      },
      onWheelEnd: () => setIsTransforming(false),
    },
    {
      target: viewportRef,
      eventOptions: { passive: false },
      pinch: { scaleBounds: { min: MIN_SCALE, max: MAX_SCALE } },
    }
  );

  const bindVThumb = useDrag(({ delta: [, dy], event }) => {
    event.stopPropagation();
    const track = vTrackRef.current;
    if (!track) return;
    const trackHeight = track.getBoundingClientRect().height;
    const viewportVirtualH = window.innerHeight / transform.scale;
    const thumbRatioY = clamp(viewportVirtualH / (panLimitY * 2 + viewportVirtualH), 0.05, 1);
    const thumbHeight = thumbRatioY * trackHeight;
    const travel = trackHeight - thumbHeight;
    if (travel <= 0) return;
    const pxToPan = (panLimitY * 2) / travel;
    setTransform((prev) => ({ ...prev, y: clamp(prev.y - dy * pxToPan, -panLimitY, panLimitY) }));
  });

  const bindHThumb = useDrag(({ delta: [dx], event }) => {
    event.stopPropagation();
    const track = hTrackRef.current;
    if (!track) return;
    const trackWidth = track.getBoundingClientRect().width;
    const viewportVirtualW = window.innerWidth / transform.scale;
    const thumbRatioX = clamp(viewportVirtualW / (panLimitX * 2 + viewportVirtualW), 0.05, 1);
    const thumbWidth = thumbRatioX * trackWidth;
    const travel = trackWidth - thumbWidth;
    if (travel <= 0) return;
    const pxToPan = (panLimitX * 2) / travel;
    setTransform((prev) => ({ ...prev, x: clamp(prev.x - dx * pxToPan, -panLimitX, panLimitX) }));
  });

  const jumpVertical = (e) => {
    if (e.target !== vTrackRef.current) return; // Prevent jump if clicking thumb itself
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform((prev) => ({ ...prev, y: -percentage * (panLimitY * 2) }));
  };

  const jumpHorizontal = (e) => {
    if (e.target !== hTrackRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width - 0.5;
    setTransform((prev) => ({ ...prev, x: -percentage * (panLimitX * 2) }));
  };

  const scrollYPercent = clamp(((-transform.y + panLimitY) / (panLimitY * 2)) * 100, 0, 100);
  const scrollXPercent = clamp(((-transform.x + panLimitX) / (panLimitX * 2)) * 100, 0, 100);

  const viewportVirtualW = window.innerWidth / transform.scale;
  const viewportVirtualH = window.innerHeight / transform.scale;
  const thumbRatioX = clamp(viewportVirtualW / (panLimitX * 2 + viewportVirtualW), 0.05, 1);
  const thumbRatioY = clamp(viewportVirtualH / (panLimitY * 2 + viewportVirtualH), 0.05, 1);
  const thumbSizePercentX = thumbRatioX * 100;
  const thumbSizePercentY = thumbRatioY * 100;
  const thumbTravelX = 100 - thumbSizePercentX;
  const thumbTravelY = 100 - thumbSizePercentY;
  const thumbTopPercent = (scrollYPercent / 100) * thumbTravelY;
  const thumbLeftPercent = (scrollXPercent / 100) * thumbTravelX;

  const [hoverV, setHoverV] = useState(false);
  const [hoverH, setHoverH] = useState(false);

  // Fullscreen logic
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const sf = 1 / transform.scale;
  const showEditingUI = !isTransforming && transform.scale >= 0.4;
  const activePage = pages.find(p => p.id === activePageId);
  // --- RENDER ---
  return (
    <div className="w-[100vw] h-[100vh] bg-[#f8fafc] dark:bg-[#0f0f10] overflow-hidden relative flex flex-col transition-colors">
      <AppHeader
        activePage={activePage}
        onRenamePage={handleRenamePage}
        mode={mode}
        setMode={setMode}
        past={past}
        future={future}
        undo={undo}
        redo={redo}
        handleDelete={handleDelete}
        handleAddShape={handleAddShape}
        handleAddFreeLine={handleAddFreeLine}
        transform={transform}
        setTransform={setTransform}
        canvasConfig={canvasConfig}
        setCanvasConfig={setCanvasConfig}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        clipboard={clipboard}
        selectedNode={selected?.type === 'node' ? nodes.find(n => n.id === selected.id) : null}
        selectedEdge={selected?.type === 'edge' ? edges.find(e => e.id === selected.id) : null}
        onAction={handleContextMenuAction}
        onOpenExport={(fmt) => {
          // Non-image formats download directly, no modal needed
          if (['png', 'jpeg', 'svg', 'pdf'].includes(fmt)) {
            setExportModal({ isOpen: true, format: fmt });
          } else {
            handleExport(fmt);
          }
        }}
        onImport={handleImport}
        pages={pages}
        onAddPage={handleAddPage}
        onClosePage={handleClosePage}
        shapeLibOpen={shapeLibOpen}
        setShapeLibOpen={setShapeLibOpen}
        propsSidebarOpen={propsSidebarOpen}
        setPropsSidebarOpen={setPropsSidebarOpen}
        onAiGenerate={handleGenerateDiagramImport}
        onImportImage={(dataUrl, naturalW, naturalH) => {
          handleAddImageNode(dataUrl, naturalW, naturalH);
        }}
      />
      {/* Fixed "Data Editor" launcher: paste a node/edge text spec, generate a full diagram */}

      <div className='flex-1 flex relative min-h-0'>
        <CollapsibleSection side="left" open={shapeLibOpen} onToggle={() => setShapeLibOpen(o => !o)} width={220} label="Shape Library">
          <ShapeLibrarySidebar
            onPointerDownShape={(e, shapeId) => {
              e.preventDefault();
              setLibraryDrag({ shapeId, clientX: e.clientX, clientY: e.clientY });
            }}
            onClickShape={(e, shapeId) => {
              handleAddShape(shapeId);
            }}
            onPointerDownLine={(e, lineId) => {
              e.preventDefault();
              setLibraryLineDrag({ lineId, clientX: e.clientX, clientY: e.clientY });
            }}
            onClickLine={(e, lineId) => {
              handleAddLine(lineId);
            }}
            onImportImage={(dataUrl, naturalW, naturalH) => {
              handleAddImageNode(dataUrl, naturalW, naturalH);
            }}
          />
        </CollapsibleSection>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div
              ref={viewportRef}
              style={{ flex: 1, overflow: 'hidden', touchAction: 'none', position: 'relative', background: isDarkTheme ? '#1e1e1e' : '#e5e7eb' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <svg
                ref={svgRef}
                style={{
                  width: '100%', height: '100%',
                  cursor: mode === 'pan' ? (dragging ? 'grabbing' : 'grab') : 'default',
                  display: 'block'
                }}
                onPointerDown={handleBgDown}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, target: { type: 'canvas' } });
                }}
              >
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                  {/* Page shadow */}
                  <rect data-role="canvas-shadow" x="4" y="4" width={pageW} height={pageH} rx="1" fill="rgba(0,0,0,0.08)" />
                  <rect data-role="canvas-bg" x="0" y="0" width={pageW} height={pageH} rx="1" fill={isDarkTheme ? '#000000' : (canvasConfig.backgroundColor || '#ffffff')} stroke="#d1d5db" strokeWidth={1 / transform.scale} />
                  <defs>
                    <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                      <rect width={GRID} height={GRID} fill="none" stroke={isDarkTheme ? '#2e2e2e' : '#e2e8f0'} strokeWidth={1 / transform.scale} />
                    </pattern>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="#000000" /></marker>
                    <marker id="arrow-selected" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="#3b82f6" /></marker>
                    <marker id="arrow-shadow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="#94a3b8" /></marker>

                    {/* Dynamic Custom Markers for Edges */}
                    <EdgeMarkerDefs edges={edges} flipColorForTheme={flipColorForTheme} />
                  </defs>

                  {canvasConfig.showGrid !== false && <rect data-role="canvas-grid" x="0" y="0" width={pageW} height={pageH} fill="url(#grid)" />}

                  <g id="mindmap-bounds">
                    {/* Alignment guides */}
                    {snapLines.map((g, i) => {
                      const ALIGN_COLOR = '#f97316';
                      const SPACING_COLOR = '#a855f7';
                      const TICK = 10;

                      if (g.type === 'align' && g.axis === 'x') {
                        return (
                          <g key={`gx-${i}`} style={{ pointerEvents: 'none' }}>
                            <line x1={g.value} y1={0} x2={g.value} y2={10000} stroke={ALIGN_COLOR} strokeWidth="1" strokeDasharray="6,4" opacity="0.85" />
                            <line x1={g.value - TICK} y1={0} x2={g.value + TICK} y2={0} stroke={ALIGN_COLOR} strokeWidth="1" />
                            <line x1={g.value - TICK} y1={10000} x2={g.value + TICK} y2={10000} stroke={ALIGN_COLOR} strokeWidth="1" />
                            <rect x={g.value + 4} y={12} width={g.label === 'Page Center' ? 74 : 22} height={14} rx={3} fill={ALIGN_COLOR} opacity="0.9" />
                            <text x={g.value + (g.label === 'Page Center' ? 41 : 15)} y={23} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="monospace">{g.label}</text>
                          </g>
                        );
                      }

                      if (g.type === 'align' && g.axis === 'y') {
                        return (
                          <g key={`gy-${i}`} style={{ pointerEvents: 'none' }}>
                            <line x1={0} y1={g.value} x2={10000} y2={g.value} stroke={ALIGN_COLOR} strokeWidth="1" strokeDasharray="6,4" opacity="0.85" />
                            <line x1={0} y1={g.value - TICK} x2={0} y2={g.value + TICK} stroke={ALIGN_COLOR} strokeWidth="1" />
                            <line x1={10000} y1={g.value - TICK} x2={10000} y2={g.value + TICK} stroke={ALIGN_COLOR} strokeWidth="1" />
                            <rect x={12} y={g.value - 11} width={g.label === 'Page Center' ? 74 : 22} height={14} rx={3} fill={ALIGN_COLOR} opacity="0.9" />
                            <text x={12 + (g.label === 'Page Center' ? 37 : 11)} y={g.value} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="monospace">{g.label}</text>
                          </g>
                        );
                      }

                      if (g.type === 'spacing' && g.axis === 'x') {
                        return (
                          <g key={`sp-x-${i}`} style={{ pointerEvents: 'none' }}>
                            <line x1={g.x1} y1={g.y} x2={g.x2} y2={g.y} stroke={SPACING_COLOR} strokeWidth="1" />
                            <line x1={g.x3} y1={g.y} x2={g.x4} y2={g.y} stroke={SPACING_COLOR} strokeWidth="1" />
                            <rect x={(g.x2 + g.x3) / 2 - 16} y={g.y - 8} width="32" height="14" rx="3" fill={SPACING_COLOR} />
                            <text x={(g.x2 + g.x3) / 2} y={g.y + 3} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="monospace">{g.gap}px</text>
                          </g>
                        );
                      }

                      if (g.type === 'spacing' && g.axis === 'y') {
                        return (
                          <g key={`sp-y-${i}`} style={{ pointerEvents: 'none' }}>
                            <line x1={g.x} y1={g.y1} x2={g.x} y2={g.y2} stroke={SPACING_COLOR} strokeWidth="1" />
                            <line x1={g.x} y1={g.y3} x2={g.x} y2={g.y4} stroke={SPACING_COLOR} strokeWidth="1" />
                            <rect x={g.x - 16} y={(g.y2 + g.y3) / 2 - 7} width="32" height="14" rx="3" fill={SPACING_COLOR} />
                            <text x={g.x} y={(g.y2 + g.y3) / 2 + 4} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="monospace">{g.gap}px</text>
                          </g>
                        );
                      }

                      return null; // 'size-match' badges render in the fixed HUD below, not on the canvas
                    })}
                    {snapLines.some(g => g.type === 'size-match') && (
                      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
                        {snapLines.filter(g => g.type === 'size-match').map((g, i) => (
                          <span key={i} style={{ background: '#a855f7', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace' }}>
                            {g.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {(dragging?.type === 'drawing' || dragging?.type === 'endpoint') && drawRoute && (
                      <>
                        <path d={`M ${drawRoute.map(p => `${p.x} ${p.y}`).join(' L ')}`} stroke={snapPort || snapEdgePoint ? "#3b82f6" : "#059669"} strokeWidth={2.5 * sf} strokeDasharray={snapPort || snapEdgePoint ? "none" : `${6 * sf},${6 * sf}`} fill="none" markerEnd={snapPort || snapEdgePoint ? "url(#arrow-selected)" : "url(#arrow-shadow)"} style={{ pointerEvents: 'none' }} />
                        {snapPort && <circle cx={snapPort.x} cy={snapPort.y} r={12 * sf} fill="none" stroke="#00000055" strokeWidth={3 * sf} style={{ pointerEvents: 'none' }} />}
                        {!snapPort && snapEdgePoint && (
                          <rect x={snapEdgePoint.x - 7 * sf} y={snapEdgePoint.y - 7 * sf} width={14 * sf} height={14 * sf}
                            fill="none" stroke="#a855f7" strokeWidth={3 * sf}
                            transform={`rotate(45 ${snapEdgePoint.x} ${snapEdgePoint.y})`}
                            style={{ pointerEvents: 'none' }} />
                        )}
                        {!snapPort && !snapEdgePoint && drawCursor && (
                          <circle cx={drawCursor.x} cy={drawCursor.y} r={5 * sf} fill="#059669" stroke="#fff" strokeWidth={1.5 * sf} style={{ pointerEvents: 'none' }} />
                        )}
                      </>
                    )}

                    {edges.map(edge => {
                      const isSelected = selected?.id === edge.id || multiSelectedEdges.includes(edge.id);
                      const isDraftingThis = dragging && (dragging.edgeId === edge.id || (dragging.type === 'endpoint' && dragging.edgeId === edge.id));
                      const frozenPts = getFullLine(edge);
                      const shadowPts = isDraftingThis && draftWps ? [
                        getStartCoord(edge),
                        ...draftWps,
                        getEndCoord(edge)
                      ] : null;

                      if (frozenPts.length < 2) return null;

                      return (
                        <ConnectionLine
                          key={edge.id}
                          edge={edge}
                          frozenPts={frozenPts}
                          shadowPts={shadowPts}
                          isSelected={isSelected}
                          isDraftingThis={isDraftingThis}
                          showEditingUI={showEditingUI}
                          mode={mode}
                          sf={sf}
                          flipColorForTheme={flipColorForTheme}
                          onSelect={(e) => { if (e.button !== 2) { e.stopPropagation(); setSelected({ type: 'edge', id: edge.id }); setMultiSelected([]); setMultiSelectedEdges([]); } }}
                          onContextMenu={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            setSelected({ type: 'edge', id: edge.id });
                            setContextMenu({ x: e.clientX, y: e.clientY, target: { type: 'edge', id: edge.id } });
                          }}
                          onSegmentPointerDown={(e, index) => handlePointerDown(e, { type: 'segment', edgeId: edge.id, index })}
                          onCornerPointerDown={(e, index) => handlePointerDown(e, { type: 'corner', edgeId: edge.id, index })}
                        />
                      );
                    })}

                    {nodes.map(node => {
                      const isSelected = selected?.id === node.id || multiSelected.includes(node.id);
                      const showPorts = !isSelected && hovered?.id === node.id && mode === 'select';
                      return (
                        <ShapeNode
                          key={node.id}
                          node={node}
                          isSelected={isSelected}
                          showPorts={showPorts}
                          showEditingUI={showEditingUI}
                          mode={mode}
                          sf={sf}
                          edges={edges}
                          hoveredPort={hoveredPort}
                          isEditingText={editingNodeId === node.id}
                          flipColorForTheme={flipColorForTheme}
                          getPortCoord={getPortCoord}
                          onPointerDown={(e) => handlePointerDown(e, { type: 'node', nodeId: node.id })}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if ((node.shapeType || 'rectangle') === 'image') { setCropModalNodeId(node.id); }
                            else { setEditingNodeId(node.id); }
                          }}
                          onHoverEnter={() => setHovered({ type: 'node', id: node.id })}
                          onHoverLeave={() => setHovered(null)}
                          onContextMenu={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            setSelected({ type: 'node', id: node.id });
                            setContextMenu({ x: e.clientX, y: e.clientY, target: { type: 'node', id: node.id } });
                          }}
                          onResizeHandlePointerDown={(e, dir) => handlePointerDown(e, {
                            type: 'resize', nodeId: node.id, dir,
                            initialMouse: getSvgPoint(e.clientX, e.clientY),
                            initialW: node.width || BOX_W, initialH: node.height || BOX_H,
                            initialX: node.x, initialY: node.y
                          })}
                          onPortHoverEnter={(port) => setHoveredPort(`${node.id}-${port}`)}
                          onPortHoverLeave={() => setHoveredPort(null)}
                          onPortPointerDown={(e, port) => handlePointerDown(e, { type: 'port', nodeId: node.id, port })}
                          onTextSave={(html) => { updateNode(node.id, { text: html }); setEditingNodeId(null); }}
                          onTextExit={() => setEditingNodeId(null)}
                        />
                      );
                    })}

                    {/* Top Layer: Endpoint reconnect handles for selected or hovered edges */}
                    {edges.map(edge => {
                      const isSelected = selected?.id === edge.id || multiSelectedEdges.includes(edge.id);
                      const isHovered = hovered?.id === edge.id;
                      const isDraftingThis = dragging && (dragging.edgeId === edge.id || (dragging.type === 'endpoint' && dragging.edgeId === edge.id));
                      if ((!isSelected && !isHovered) || mode !== 'select' || isDraftingThis || !showEditingUI) return null;
                      const frozenPts = getFullLine(edge);
                      if (frozenPts.length < 2) return null;
                      const startPt = frozenPts[0];
                      const endPt = frozenPts[frozenPts.length - 1];

                      return (
                        <g key={`handles-${edge.id}`}>
                          <EdgeEndpointHandles
                            startPt={startPt}
                            endPt={endPt}
                            sf={sf}
                            onStartPointerDown={(e) => handlePointerDown(e, { type: 'endpoint', edgeId: edge.id, end: 'start' })}
                            onEndPointerDown={(e) => handlePointerDown(e, { type: 'endpoint', edgeId: edge.id, end: 'end' })}
                          />
                        </g>
                      );
                    })}

                    {selectionBox && (
                      <rect
                        x={Math.min(selectionBox.startX, selectionBox.endX)}
                        y={Math.min(selectionBox.startY, selectionBox.endY)}
                        width={Math.abs(selectionBox.startX - selectionBox.endX)}
                        height={Math.abs(selectionBox.startY - selectionBox.endY)}
                        fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" pointerEvents="none"
                      />
                    )}

                    {libraryDrag && libraryDrag.clientX !== undefined && (() => {
                      const lpt = getSvgPoint(libraryDrag.clientX, libraryDrag.clientY);
                      const shapeType = libraryDrag.shapeId;
                      const { w: defaultW, h: defaultH } = getShapeDefaultSize(shapeType, BOX_W, BOX_H);
                      const snX = snap(lpt.x) - defaultW / 2;
                      const snY = snap(lpt.y) - defaultH / 2;
                      return (
                        <g transform={`translate(${snX}, ${snY})`}>
                          {getShapeSVG(shapeType, defaultW, defaultH, { fill: "rgba(255, 255, 255, 0.5)", stroke: "#00000055", strokeWidth: 1, strokeDasharray: "6,6", pointerEvents: "none" })}
                        </g>
                      );
                    })()}

                    {libraryLineDrag && libraryLineDrag.clientX !== undefined && (() => {
                      const lpt = getSvgPoint(libraryLineDrag.clientX, libraryLineDrag.clientY);
                      const cx = snap(lpt.x);
                      const cy = snap(lpt.y);
                      return (
                        <line x1={cx - 50} y1={cy} x2={cx + 50} y2={cy}
                          stroke="#00000055" strokeWidth={1.5} strokeDasharray="6,6" pointerEvents="none" />
                      );
                    })()}
                  </g>
                </g>
              </svg>
            </div>

            {/* Vertical scrollbar */}
            <div
              ref={vTrackRef}
              onPointerDown={(e) => { if (e.target === vTrackRef.current) jumpVertical(e); }}
              style={{
                position: 'absolute', right: 1, top: 4, bottom: 4, width: 5,
                background: 'transparent', cursor: 'pointer', zIndex: 5
              }}
            >
              <div
                {...bindVThumb()}
                style={{
                  position: 'absolute', width: '100%', height: `${thumbSizePercentY}%`, top: `${thumbTopPercent}%`,
                  background: hoverV ? '#6b7280' : '#9ca3af', opacity: hoverV ? 1 : 0.5,
                  borderRadius: 5, touchAction: 'none', cursor: 'grab',
                  transition: 'opacity 0.15s, background 0.15s'
                }}
                onPointerEnter={() => setHoverV(true)}
                onPointerLeave={() => setHoverV(false)}
              />
            </div>
            <div
              ref={hTrackRef}
              onPointerDown={(e) => { if (e.target === hTrackRef.current) jumpHorizontal(e); }}
              style={{
                position: 'absolute', bottom: 1, left: 4, right: 4, height: 5,
                background: 'transparent', cursor: 'pointer', zIndex: 5
              }}
            >
              <div
                {...bindHThumb()}
                style={{
                  position: 'absolute', height: '100%', width: `${thumbSizePercentX}%`, left: `${thumbLeftPercent}%`,
                  background: hoverH ? '#6b7280' : '#9ca3af', opacity: hoverH ? 1 : 0.5,
                  borderRadius: 5, touchAction: 'none', cursor: 'grab',
                  transition: 'opacity 0.15s, background 0.15s'
                }}
                onPointerEnter={() => setHoverH(true)}
                onPointerLeave={() => setHoverH(false)}
              />
            </div>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} accept=".drawmap,.xml,.json" />


          {/* Context Menu */}
          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              target={contextMenu.target}
              nodes={nodes}
              edges={edges}
              clipboard={clipboard}
              canvasConfig={canvasConfig}
              selectedNode={contextMenu.target?.type === 'node' ? nodes.find(n => n.id === contextMenu.target.id) : null}
              onAction={handleContextMenuAction}
              onClose={closeContextMenu}
              canUndo={past.length > 0}
              canRedo={future.length > 0}
            />
          )}

          {/* Export Modal */}
          <ExportDialog
            isOpen={exportModal.isOpen}
            format={exportModal.format}
            nodes={nodes}
            edges={edges}
            svgRef={svgRef}
            canvasSettings={canvasSettings}
            canvasConfig={canvasConfig}
            downloadFile={downloadFile}
            theme={isDarkTheme ? 'dark' : 'light'}
            onClose={() => setExportModal({ ...exportModal, isOpen: false })}
          />

          {/* Hidden input backing the "Replace Image" context-menu action */}
          <input type="file" ref={replaceImageInputRef} onChange={handleReplaceImageFileChosen} style={{ display: 'none' }} accept="image/*" />

          {/* Image Crop Modal */}
          {cropModalNodeId && (() => {
            const cropNode = nodes.find((n) => n.id === cropModalNodeId);
            if (!cropNode || !cropNode.imageSrc) return null;

            const nodeW = cropNode.width || 200;
            const nodeH = cropNode.height || 200;

            return (
              <ImageCropModal
                isOpen={true}
                imageSrc={cropNode.imageSrc}
                aspect={nodeW / nodeH}
                initialCropRect={cropNode.imageCropRect}
                onCancel={() => setCropModalNodeId(null)}
                onSave={(cropRect) => {
                  updateNode(cropNode.id, { imageCropRect: cropRect });
                  setCropModalNodeId(null);
                }}
              />
            );
          })()}
        </div>
        <Sidebar
          canvasConfig={canvasConfig}
          setCanvasConfig={setCanvasConfig}
          canvasSettings={canvasSettings}
          setCanvasSettings={setCanvasSettings}
          selectedNode={selected?.type === 'node' ? nodes.find(n => n.id === selected.id) : null}
          updateNode={updateNode}
          selectedEdge={selected?.type === 'edge' ? edges.find(e => e.id === selected.id) : null}
          updateEdge={updateEdge}
          onOpenCropModal={(id) => setCropModalNodeId(id)}
          isOpen={propsSidebarOpen}
          onToggle={() => setPropsSidebarOpen(o => !o)}
          width={300}
          onAction={handleContextMenuAction}
          multiSelectedCount={multiSelected.length}
        />
      </div>
      <PageTabBar
        pages={pages}
        activePageId={activePageId}
        onSwitchPage={handleSwitchPage}
        onAddPage={handleAddPage}
        onClosePage={handleClosePage}
        onRenamePage={handleRenamePage}
        onDuplicatePage={handleDuplicatePage}
        onReorderPages={(newPages) => setPages(newPages)}
      />
    </div>
  );
}