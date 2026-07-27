import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export default function ProfessionalMindMap() {
  const GRID = 20;
  const BOX_W = 120;
  const BOX_H = 40;
  const PAD = 20;
  const SNAP_RADIUS = 40;
  const ALIGN_TOLERANCE = 15;

  // --- 1. GRAPH STATE (Centered in massive 10000x10000 canvas) ---
  const [nodes, setNodes] = useState([
    { id: 'n1', x: 4500, y: 4500, text: 'Main Idea' }, 
    { id: 'n2', x: 4900, y: 4640, text: 'Subtopic A' },
    { id: 'n3', x: 4700, y: 4560, text: 'Obstacle Box' }
  ]);
  const [edges, setEdges] = useState([
    { id: 'e1', source: 'n1', target: 'n2', portS: 'R', portT: 'L', waypoints: [{ x: 4660, y: 4520 }, { x: 4660, y: 4660 }] }
  ]);

  // --- 2. INTERACTION & UX STATE ---
  const [mode, setMode] = useState('select'); // 'select' | 'pan'
  const [selected, setSelected] = useState(null);
  const [multiSelected, setMultiSelected] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [snapPort, setSnapPort] = useState(null);
  const [draftWps, setDraftWps] = useState(null);
  const [drawCursor, setDrawCursor] = useState(null);
  const [drawRoute, setDrawRoute] = useState(null);
  
  const [snapLines, setSnapLines] = useState({ x: null, y: null });
  const [selectionBox, setSelectionBox] = useState(null);
  const [clipboard, setClipboard] = useState([]);
  
  // HISTORY STATE (Undo/Redo)
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [dragStartSnapshot, setDragStartSnapshot] = useState(null);

  const svgRef = useRef(null);
  const snap = (val) => Math.round(val / GRID) * GRID;

  // --- 3. UTILITY & HISTORY ---
  const performAction = useCallback((actionCallback) => {
    setPast(prev => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setFuture([]);
    actionCallback();
  }, [nodes, edges]);

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
      setNodes(nextNodes); setEdges(nextEdges);
      setSelected(null); setMultiSelected([]);
    });
  }, [nodes, edges, selected, multiSelected, performAction]);

  const getSvgPoint = (clientX, clientY) => {
    if (!svgRef.current) return { x: clientX, y: clientY };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    return pt.matrixTransform(ctm.inverse());
  };

  // Keyboard Hooks (Delete, Undo, Redo, Copy, Paste)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't fire if typing in an input (future proofing)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') handleDelete();
      
      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (multiSelected.length > 0) {
          setClipboard(nodes.filter(n => multiSelected.includes(n.id)));
        } else if (selected?.type === 'node') {
          setClipboard([nodes.find(n => n.id === selected.id)]);
        }
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard.length > 0) {
          performAction(() => {
            const newNodes = clipboard.map(n => ({
              ...n, 
              id: `n${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
              x: n.x + GRID * 2, 
              y: n.y + GRID * 2 
            }));
            setNodes([...nodes, ...newNodes]);
            setMultiSelected(newNodes.map(n => n.id));
            setSelected(null);
          });
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, selected, multiSelected, clipboard, past, future, handleDelete, performAction, undo, redo]);

  // --- 4. CORE MATH & PORTS ---
  const getPortCoord = (node, port) => {
    if (!node) return { x: 0, y: 0 };
    if (port === 'T') return { x: node.x + BOX_W / 2, y: node.y };
    if (port === 'B') return { x: node.x + BOX_W / 2, y: node.y + BOX_H };
    if (port === 'L') return { x: node.x, y: node.y + BOX_H / 2 };
    if (port === 'R') return { x: node.x + BOX_W, y: node.y + BOX_H / 2 };
    return { x: node.x, y: node.y };
  };

  const getFullLine = (edge) => {
    const srcNode = nodes.find(n => n.id === edge.source);
    const tgtNode = nodes.find(n => n.id === edge.target);
    if (!srcNode || !tgtNode) return [];
    return [getPortCoord(srcNode, edge.portS), ...edge.waypoints, getPortCoord(tgtNode, edge.portT)];
  };

  const checkLineRectIntersect = (p1, p2, rect) => {
    const minX = Math.min(p1.x, p2.x); const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y); const maxY = Math.max(p1.y, p2.y);
    return !(maxX < rect.x || minX > rect.x + BOX_W || maxY < rect.y || minY > rect.y + BOX_H);
  };

  const isPathClear = (wps) => {
    for (let i = 0; i < wps.length - 1; i++) {
      for (let n of nodes) {
        if (checkLineRectIntersect(wps[i], wps[i+1], n)) return n;
      }
    }
    return null;
  };

  const smartRoute = (A, B, portS, portT) => {
    const getExitPoint = (pt, port) => {
      if (port === 'T') return { x: pt.x, y: pt.y - PAD };
      if (port === 'B') return { x: pt.x, y: pt.y + PAD };
      if (port === 'L') return { x: pt.x - PAD, y: pt.y };
      if (port === 'R') return { x: pt.x + PAD, y: pt.y };
      return { ...pt };
    };

    const exA = getExitPoint(A, portS);
    const exB = portT ? getExitPoint(B, portT) : { ...B };
    
    let route = [];

    if (!portT) {
      const isVert = portS === 'T' || portS === 'B';
      route = [A, exA, isVert ? { x: B.x, y: exA.y } : { x: exA.x, y: B.y }, B];
    } else {
      const isHorizS = portS === 'L' || portS === 'R';
      const isHorizT = portT === 'L' || portT === 'R';

      if (isHorizS && isHorizT) {
        const midX = snap((exA.x + exB.x) / 2);
        route = [A, exA, { x: midX, y: exA.y }, { x: midX, y: exB.y }, exB, B];
      } else if (!isHorizS && !isHorizT) {
        const midY = snap((exA.y + exB.y) / 2);
        route = [A, exA, { x: exA.x, y: midY }, { x: exB.x, y: midY }, exB, B];
      } else {
        route = [A, exA, isHorizS ? { x: exB.x, y: exA.y } : { x: exA.x, y: exB.y }, exB, B];
      }
    }

    const obstacle = isPathClear(route);
    if (obstacle) {
      const detourY = B.y > A.y ? obstacle.y + BOX_H + PAD : obstacle.y - PAD;
      route = [ A, exA, { x: exA.x, y: detourY }, { x: exB.x, y: detourY }, exB, B ];
    }

    return portT ? cleanup(route, A, B) : cleanup(route.slice(0, -1), A, B);
  };

  const cleanup = (wps, portA, portB) => {
    let p = [portA, ...wps, portB];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < p.length - 1; i++) {
        if (p[i].x === p[i + 1].x && p[i].y === p[i + 1].y) { p.splice(i, 1); changed = true; break; }
      }
      if (changed) continue;
      for (let i = 0; i < p.length - 2; i++) {
        if ((p[i].x === p[i + 1].x && p[i + 1].x === p[i + 2].x) ||
            (p[i].y === p[i + 1].y && p[i + 1].y === p[i + 2].y)) { p.splice(i + 1, 1); changed = true; break; }
      }
    }
    let finalWps = p.slice(1, -1);
    if (finalWps.length === 0 && portA.x !== portB.x && portA.y !== portB.y) {
      const midX = snap((portA.x + portB.x) / 2);
      finalWps = [{ x: midX, y: portA.y }, { x: midX, y: portB.y }];
    }
    return finalWps;
  };

  // --- 5. EVENT HANDLERS ---
  const handleBgDown = (e) => {
    if (mode === 'pan') return; 
    const pt = getSvgPoint(e.clientX, e.clientY);
    setDragging({ type: 'selection' });
    setSelectionBox({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y });
    setSelected(null);
    setMultiSelected([]);
  };

  const handleDoubleClick = (e) => {
    if (mode === 'pan') return;
    performAction(() => {
      const pt = getSvgPoint(e.clientX, e.clientY);
      const x = snap(pt.x) - BOX_W / 2;
      const y = snap(pt.y) - BOX_H / 2;
      const newNode = { id: `n${Date.now()}`, x, y, text: 'New Node' };
      setNodes([...nodes, newNode]);
      setSelected({ type: 'node', id: newNode.id });
    });
  };

  const handlePointerDown = (e, target) => {
    if (mode === 'pan') return; 
    e.preventDefault(); e.stopPropagation(); 
    
    // Save history snapshot before drag begins
    setDragStartSnapshot({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });

    if (target.type === 'node') {
      setSelected({ type: 'node', id: target.nodeId });
      setMultiSelected([]); 
      setDragging(target);
    } 
    else if (target.type === 'port') {
      setSelected(null);
      setDragging({ type: 'drawing', source: target.nodeId, portS: target.port });
      setDrawCursor(getPortCoord(nodes.find(n => n.id === target.nodeId), target.port));
    } 
    else if (target.type === 'segment' || target.type === 'corner') {
      setSelected({ type: 'edge', id: target.edgeId });
      const edge = edges.find(e => e.id === target.edgeId);
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
    if (!dragging || !svgRef.current || mode === 'pan') return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    let x = snap(pt.x); let y = snap(pt.y);

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
        ['T', 'B', 'L', 'R'].forEach(p => {
          const portPt = getPortCoord(n, p);
          const dist = Math.hypot(cursor.x - portPt.x, cursor.y - portPt.y);
          if (dist < minDist) { minDist = dist; nearest = { nodeId: n.id, port: p, x: portPt.x, y: portPt.y }; }
        });
      });
      setSnapPort(nearest);
      const endPt = nearest ? { x: nearest.x, y: nearest.y } : cursor;
      setDrawRoute([startPt, ...smartRoute(startPt, endPt, dragging.portS, nearest?.port), endPt]);
      return;
    }

    if (dragging.type === 'node') {
      let nextX = pt.x - BOX_W / 2; let nextY = pt.y - BOX_H / 2;
      let sx = null, sy = null;

      // Snapline Engine
      nodes.forEach(n => {
        if (n.id === dragging.nodeId) return;
        if (Math.abs(n.x - nextX) < ALIGN_TOLERANCE) { nextX = n.x; sx = n.x; }
        if (Math.abs(n.y - nextY) < ALIGN_TOLERANCE) { nextY = n.y; sy = n.y; }
      });
      setSnapLines({ x: sx, y: sy });
      if (sx === null) nextX = snap(nextX);
      if (sy === null) nextY = snap(nextY);

      const updatedNodes = nodes.map(n => n.id === dragging.nodeId ? { ...n, x: nextX, y: nextY } : n);
      setNodes(updatedNodes);
      
      const updatedEdges = edges.map(edge => {
        if (edge.source !== dragging.nodeId && edge.target !== dragging.nodeId) return edge;
        let newWps = edge.waypoints.map(wp => ({ ...wp }));
        const A = getPortCoord(updatedNodes.find(n => n.id === edge.source), edge.portS);
        const B = getPortCoord(updatedNodes.find(n => n.id === edge.target), edge.portT);

        if (newWps.length > 0) {
          if (edge.source === dragging.nodeId) {
            const oldA = getPortCoord(nodes.find(n => n.id === dragging.nodeId), edge.portS);
            if (oldA.y === edge.waypoints[0].y) newWps[0].y = A.y; else newWps[0].x = A.x;
          }
          if (edge.target === dragging.nodeId) {
            const oldB = getPortCoord(nodes.find(n => n.id === dragging.nodeId), edge.portT);
            const last = newWps.length - 1;
            if (oldB.y === edge.waypoints[last].y) newWps[last].y = B.y; else newWps[last].x = B.x;
          }
        }
        return { ...edge, waypoints: cleanup(newWps, A, B) };
      });
      setEdges(updatedEdges);
      return;
    }

    // Segment & Corner dragging
    const edge = edges.find(ed => ed.id === dragging.edgeId);
    const A = getPortCoord(nodes.find(n => n.id === edge.source), edge.portS);
    const B = getPortCoord(nodes.find(n => n.id === edge.target), edge.portT);
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

    if (dragging.type === 'selection' && selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      setMultiSelected(nodes.filter(n => n.x + BOX_W > minX && n.x < maxX && n.y + BOX_H > minY && n.y < maxY).map(n => n.id));
    }
    else if (dragging.type === 'drawing' && snapPort) {
      const A = getPortCoord(nodes.find(n => n.id === dragging.source), dragging.portS);
      const newEdge = {
        id: `e${Date.now()}`, source: dragging.source, target: snapPort.nodeId, portS: dragging.portS, portT: snapPort.port,
        waypoints: smartRoute(A, { x: snapPort.x, y: snapPort.y }, dragging.portS, snapPort.port)
      };
      setEdges([...edges, newEdge]);
      setSelected({ type: 'edge', id: newEdge.id });
    } 
    else if (draftWps) {
      const edge = edges.find(ed => ed.id === dragging.edgeId);
      const cleanWps = cleanup(draftWps, getPortCoord(nodes.find(n => n.id === edge.source), edge.portS), getPortCoord(nodes.find(n => n.id === edge.target), edge.portT));
      setEdges(edges.map(e => e.id === edge.id ? { ...e, waypoints: cleanWps } : e));
    }

    // Push to History if state changed
    if (dragStartSnapshot) {
      if (JSON.stringify(nodes) !== JSON.stringify(dragStartSnapshot.nodes) || JSON.stringify(edges) !== JSON.stringify(dragStartSnapshot.edges)) {
        setPast(prev => [...prev, dragStartSnapshot]); setFuture([]);
      }
      setDragStartSnapshot(null);
    }

    setDragging(null); setDraftWps(null); setDrawCursor(null); setDrawRoute(null); setSnapPort(null); setSelectionBox(null); setSnapLines({x: null, y: null});
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      
      {/* TransformWrapper setup for Infinite Canvas and Mode toggling */}
      <TransformWrapper 
        initialScale={1}
        initialPositionX={-4000} // Offset to center our initial 4500x4500 coords in the view
        initialPositionY={-4000}
        minScale={0.2} 
        maxScale={2.5} 
        limitToBounds={false} // Infinite Canvas
        panning={{ disabled: mode === 'select' }} // Panning only active when mode is 'pan'
        doubleClick={{ disabled: true }} // Disable standard double click zoom so we can add nodes
      >
        {({ zoomToElement }) => (
          <>
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              <svg
                ref={svgRef}
                style={{ 
                  width: 10000, height: 10000, // Massive canvas
                  cursor: mode === 'pan' ? (dragging ? 'grabbing' : 'grab') : 'crosshair'
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerDown={handleBgDown}
                onDoubleClick={handleDoubleClick}
              >
                <defs>
                  <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                    <rect width={GRID} height={GRID} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                  </pattern>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="#64748b" /></marker>
                  <marker id="arrow-selected" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="#3b82f6" /></marker>
                  <marker id="arrow-shadow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="#94a3b8" /></marker>
                </defs>
                
                {/* Background Grid */}
                <rect x="0" y="0" width="10000" height="10000" fill="url(#grid)" />

                {/* WRAPPER FOR 'FIT TO SCREEN' CAPABILITY */}
                <g id="mindmap-bounds">
                  
                  {/* --- SNAPLINES --- */}
                  {snapLines.x !== null && <line x1={snapLines.x} y1="0" x2={snapLines.x} y2="10000" stroke="#06b6d4" strokeWidth="1" strokeDasharray="5,5" />}
                  {snapLines.y !== null && <line x1="0" y1={snapLines.y} x2="10000" y2={snapLines.y} stroke="#06b6d4" strokeWidth="1" strokeDasharray="5,5" />}

                  {/* --- DRAWING ROUTES --- */}
                  {dragging?.type === 'drawing' && drawRoute && (
                    <>
                      <path d={`M ${drawRoute.map(p => `${p.x} ${p.y}`).join(' L ')}`} stroke={snapPort ? "#3b82f6" : "#94a3b8"} strokeWidth="2.5" strokeDasharray={snapPort ? "none" : "6,6"} fill="none" markerEnd={snapPort ? "url(#arrow-selected)" : "url(#arrow-shadow)"} style={{ pointerEvents: 'none' }} />
                      {snapPort && <circle cx={snapPort.x} cy={snapPort.y} r="12" fill="none" stroke="#3b82f6" strokeWidth="3" style={{ pointerEvents: 'none' }} />}
                    </>
                  )}

                  {/* --- EDGES --- */}
                  {edges.map(edge => {
                    const isSelected = selected?.id === edge.id;
                    const isDraftingThis = dragging && dragging.edgeId === edge.id;
                    const frozenPts = getFullLine(edge);
                    const shadowPts = isDraftingThis && draftWps ? [getPortCoord(nodes.find(n => n.id === edge.source), edge.portS), ...draftWps, getPortCoord(nodes.find(n => n.id === edge.target), edge.portT)] : null;
                    
                    if (frozenPts.length < 2) return null;
                    const frozenPath = `M ${frozenPts.map(p => `${p.x} ${p.y}`).join(' L ')}`;

                    return (
                      <g key={edge.id}>
                        {isSelected && !isDraftingThis && <path d={frozenPath} fill="none" stroke="#bfdbfe" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />}
                        <path d={frozenPath} fill="none" stroke={isSelected ? "#3b82f6" : "#64748b"} strokeWidth="2.5" markerEnd={isSelected ? "url(#arrow-selected)" : "url(#arrow)"} style={{ pointerEvents: 'none' }} />
                        {shadowPts && <path d={`M ${shadowPts.map(p => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6,6" markerEnd="url(#arrow-shadow)" style={{ pointerEvents: 'none' }} />}

                        {/* Edge Segments (Hitboxes) */}
                        {!isDraftingThis && frozenPts.map((pt, i) => {
                          if (i >= frozenPts.length - 1) return null;
                          return (
                            <line key={`seg-${i}`} x1={pt.x} y1={pt.y} x2={frozenPts[i + 1].x} y2={frozenPts[i + 1].y} stroke="transparent" strokeWidth="15"
                              style={{ cursor: mode === 'select' ? (pt.y === frozenPts[i + 1].y ? 'ns-resize' : 'ew-resize') : 'inherit' }}
                              onPointerDown={(e) => handlePointerDown(e, { type: 'segment', edgeId: edge.id, index: i })}
                            />
                          );
                        })}

                        {/* Edge Corner Handles */}
                        {isSelected && !isDraftingThis && edge.waypoints.map((wp, i) => (
                          <circle key={`corner-${i}`} cx={wp.x} cy={wp.y} r="5" fill="#fff" stroke="#3b82f6" strokeWidth="2" style={{ cursor: mode === 'select' ? 'move' : 'inherit' }}
                            onPointerDown={(e) => handlePointerDown(e, { type: 'corner', edgeId: edge.id, index: i })} />
                        ))}
                      </g>
                    );
                  })}

                  {/* --- NODES --- */}
                  {nodes.map(node => {
                    const isSelected = selected?.id === node.id || multiSelected.includes(node.id);
                    const showPorts = (isSelected || hovered?.id === node.id) && mode === 'select';

                    return (
                      <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                         onPointerEnter={() => setHovered({ type: 'node', id: node.id })}
                         onPointerLeave={() => setHovered(null)}>
                        
                        {isSelected && <rect x="-4" y="-4" width={BOX_W + 8} height={BOX_H + 8} rx="10" fill="none" stroke="#bfdbfe" strokeWidth="4" pointerEvents="none" />}
                        <rect width={BOX_W} height={BOX_H} rx="6" fill="#fff" stroke={isSelected ? "#2563eb" : "#3b82f6"} strokeWidth={isSelected ? "3" : "2"} cursor={mode === 'pan' ? 'grab' : 'move'}
                              onPointerDown={(e) => handlePointerDown(e, { type: 'node', nodeId: node.id })} />
                        <text x={BOX_W / 2} y={BOX_H / 2 + 5} textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="600" pointerEvents="none">{node.text}</text>

                        {/* Connection Ports */}
                        {showPorts && ['T', 'B', 'L', 'R'].map(port => {
                          const cx = port === 'T' || port === 'B' ? BOX_W / 2 : port === 'L' ? 0 : BOX_W;
                          const cy = port === 'L' || port === 'R' ? BOX_H / 2 : port === 'T' ? 0 : BOX_H;
                          return <circle key={port} cx={cx} cy={cy} r="8" fill="#3b82f6" cursor="crosshair" onPointerDown={(e) => handlePointerDown(e, { type: 'port', nodeId: node.id, port })} />;
                        })}
                      </g>
                    )
                  })}

                  {/* --- SELECTION BOX --- */}
                  {selectionBox && (
                     <rect 
                        x={Math.min(selectionBox.startX, selectionBox.endX)} 
                        y={Math.min(selectionBox.startY, selectionBox.endY)}
                        width={Math.abs(selectionBox.startX - selectionBox.endX)}
                        height={Math.abs(selectionBox.startY - selectionBox.endY)}
                        fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" pointerEvents="none"
                     />
                  )}
                </g>
              </svg>
            </TransformComponent>

            {/* --- MAIN TOP TOOLBAR (Modes & Fit) --- */}
            <div style={{ position:'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '6px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', gap: '8px', zIndex: 10 }}>
              <button 
                onClick={() => setMode('select')}
                style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: mode === 'select' ? '#e2e8f0' : 'transparent', color: '#1e293b', transition: 'all 0.2s' }}
              >
                Pointer
              </button>
              <button 
                onClick={() => setMode('pan')}
                style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: mode === 'pan' ? '#e2e8f0' : 'transparent', color: '#1e293b', transition: 'all 0.2s' }}
              >
                🖐 Pan
              </button>
              <div style={{ width: '1px', background: '#cbd5e1', margin: '4px 0' }} />
              <button 
                onClick={() => zoomToElement('mindmap-bounds', 1)} // Zooms perfectly to content
                style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: 'transparent', color: '#3b82f6', transition: 'all 0.2s' }}
              >
                Fit View
              </button>
            </div>
          </>
        )}
      </TransformWrapper>

      {/* --- HUD INSTRUCTIONS --- */}
      <div style={{ position:'absolute', top: 16, left: 16, background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', pointerEvents: 'none', zIndex: 10 }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Graph Engine v3</p>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#475569' }}>
          <li><b>Pan/Zoom</b>: Enable Pan mode or pinch-to-zoom.</li>
          <li><b>Multi-Select</b>: Drag background in Pointer mode.</li>
          <li><b>Snaplines</b>: Drag a node to auto-align.</li>
          <li><b>History</b>: <kbd>Ctrl</kbd>+<kbd>Z</kbd> (Undo), <kbd>Ctrl</kbd>+<kbd>Y</kbd> (Redo).</li>
          <li><b>Clipboard</b>: <kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>Ctrl</kbd>+<kbd>V</kbd>.</li>
        </ul>
      </div>

      {/* --- CONTEXT BOTTOM TOOLBAR --- */}
      {(selected || multiSelected.length > 0) && (
        <div style={{ 
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', 
          background: '#1e293b', color: '#fff', padding: '12px 20px', borderRadius: '12px', 
          display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 10 
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600' }}>
            {multiSelected.length > 0 ? `${multiSelected.length} Nodes` : (selected?.type === 'node' ? 'Node' : 'Connection')} Selected
          </span>
          <button onClick={handleDelete} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}