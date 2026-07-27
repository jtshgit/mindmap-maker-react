import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    ChevronDown,
    Lightbulb,
    Loader2,
    X
} from 'lucide-react';
const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ENDPOINT = API_BASE_URL + '/generate-dsl';

// ─── SYNTAX REGEX & UTILITIES ──────────────────────────────────────────────
const NODE_RE = /^([A-Za-z0-9_\-]+)\s*\[([^\]]*)\](?:\s*\[([^\]]*)\])?$/;
const EDGE_RE = /^([A-Za-z0-9_\-]+)\s*(?:---|--|->|-{1,2}>|==>)\s*([A-Za-z0-9_\-]+)(?:\s*[:|]\s*(.+))?$/;
const COMMENT_RE = /^\s*(?:\/\/|#).*/;

const PROMPT_SUGGESTIONS = [
    "E-commerce checkout system with shopping cart, payment, and inventory.",
    "CI/CD pipeline: code push, Docker build, unit testing, and Kubernetes deploy.",
    "User authentication flow: API gateway, auth service, Redis cache, and Postgres DB."
];

const SHAPE_ALIASES = {
    rectangle: 'rectangle', rect: 'rectangle', box: 'rectangle', square: 'rectangle',
    rounded: 'rounded-rectangle', 'rounded-rectangle': 'rounded-rectangle', roundedrect: 'rounded-rectangle',
    circle: 'circle', round: 'circle',
    ellipse: 'ellipse', oval: 'ellipse',
    diamond: 'diamond', rhombus: 'diamond', decision: 'diamond',
    triangle: 'triangle',
    hexagon: 'hexagon', hex: 'hexagon',
    cylinder: 'cylinder', database: 'database', db: 'database',
    queue: 'delay', delay: 'delay', document: 'document', doc: 'document',
    callout: 'callout', actor: 'actor', user: 'actor'
};

function resolveShape(raw) {
    if (!raw) return 'rectangle';
    const key = raw.trim().toLowerCase().replace(/\s+/g, '-');
    return SHAPE_ALIASES[key] || 'rectangle';
}

const escapeHtml = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// ─── TEXT MEASUREMENT ─────────────────────────────────────────────────────
let _measureCanvas = null;
function measureTextWidth(text, font) {
    if (typeof document === 'undefined') return (text || '').length * 7.5;
    if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
    const ctx = _measureCanvas.getContext('2d');
    ctx.font = font;
    return ctx.measureText(text || '').width;
}

// ─── PARSER ───────────────────────────────────────────────────────────────
export function parseDiagramText(raw) {
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !COMMENT_RE.test(l));
    const nodeMap = new Map();
    const order = [];
    const edges = [];

    const ensureNode = (id, label, shapeRaw) => {
        if (!nodeMap.has(id)) {
            order.push(id);
            nodeMap.set(id, { id, label: label !== undefined ? label : id, shape: resolveShape(shapeRaw) });
        } else if (label !== undefined) {
            const existing = nodeMap.get(id);
            existing.label = label;
            if (shapeRaw !== undefined) existing.shape = resolveShape(shapeRaw);
        }
    };

    lines.forEach(line => {
        const nodeMatch = line.match(NODE_RE);
        if (nodeMatch) {
            const [, id, label, shapeRaw] = nodeMatch;
            ensureNode(id, (label || '').trim(), shapeRaw);
            return;
        }

        const edgeMatch = line.match(EDGE_RE);
        if (edgeMatch) {
            const [, from, to, label] = edgeMatch;
            ensureNode(from);
            ensureNode(to);
            edges.push({ from, to, label: label ? label.trim() : '' });
        }
    });

    return { nodeMap, order, edges };
}

// ─── LAYOUT ENGINE ────────────────────────────────────────────────────────
export function layoutDiagram(nodeMap, order, parsedEdges) {
    const ids = order.length ? order : Array.from(nodeMap.keys());
    const adj = new Map();
    const revAdj = new Map();
    ids.forEach(id => { adj.set(id, []); revAdj.set(id, []); });

    parsedEdges.forEach(({ from, to }) => {
        if (adj.has(from) && adj.has(to)) {
            adj.get(from).push(to);
            revAdj.get(to).push(from);
        }
    });

    const visitedState = new Map();
    const backEdges = new Set();
    const dfsCycle = (u) => {
        visitedState.set(u, 1);
        (adj.get(u) || []).forEach(v => {
            const state = visitedState.get(v) || 0;
            if (state === 1) {
                backEdges.add(`${u}->${v}`);
            } else if (state === 0) {
                dfsCycle(v);
            }
        });
        visitedState.set(u, 2);
    };
    ids.forEach(id => { if ((visitedState.get(id) || 0) === 0) dfsCycle(id); });

    const rank = new Map();
    ids.forEach(id => rank.set(id, 0));

    let changed = true;
    let passes = 0;
    while (changed && passes < ids.length * 2) {
        changed = false;
        passes++;
        ids.forEach(u => {
            const uRank = rank.get(u);
            (adj.get(u) || []).forEach(v => {
                if (!backEdges.has(`${u}->${v}`)) {
                    if (rank.get(v) <= uRank) {
                        rank.set(v, uRank + 1);
                        changed = true;
                    }
                }
            });
        });
    }

    const layersMap = new Map();
    ids.forEach(id => {
        const r = rank.get(id);
        if (!layersMap.has(r)) layersMap.set(r, []);
        layersMap.get(r).push(id);
    });

    const sortedRanks = Array.from(layersMap.keys()).sort((a, b) => a - b);
    const layers = sortedRanks.map(r => layersMap.get(r));

    const FONT_BASE = 'bold 13px system-ui, -apple-system, sans-serif';
    const HPAD = 44;
    const MIN_W = 120, MAX_W = 240;
    const nodes = new Map();

    ids.forEach(id => {
        const def = nodeMap.get(id);
        const label = def.label || id;
        const textW = measureTextWidth(label, FONT_BASE);
        let width = Math.max(MIN_W, Math.min(MAX_W, textW + HPAD));
        let height = 54;

        if (textW + HPAD > MAX_W) {
            const avgCharW = textW / Math.max(1, label.length);
            const charsPerLine = Math.max(4, Math.floor((MAX_W - HPAD) / Math.max(4, avgCharW)));
            const linesCount = Math.max(1, Math.ceil(label.length / charsPerLine));
            height = 52 + (linesCount - 1) * 16;
        }

        const shape = def.shape;

        switch (shape) {
            case 'actor':
                width = Math.max(70, Math.min(100, Math.round(textW + 30)));
                height = 100;
                break;
            case 'diamond':
                width = Math.round(Math.max(130, width * 1.35));
                height = Math.round(Math.max(85, height * 1.4));
                break;
            case 'circle': {
                const s = Math.round(Math.max(width, height, 88));
                width = s;
                height = s;
                break;
            }
            case 'ellipse':
                width = Math.round(Math.max(width * 1.25, 120));
                height = Math.round(Math.max(height * 1.15, 64));
                break;
            case 'cylinder':
            case 'database':
                width = Math.round(Math.max(width, 100));
                height = Math.round(Math.max(height * 1.3, 85));
                break;
            case 'hexagon':
                width = Math.round(Math.max(width * 1.2, 120));
                height = Math.round(Math.max(height, 58));
                break;
            case 'callout':
                width = Math.round(Math.max(width * 1.15, 135));
                height = Math.round(Math.max(height * 1.4, 90));
                break;
            case 'cloud':
                width = Math.round(Math.max(width * 1.2, 120));
                height = Math.round(Math.max(height * 1.3, 75));
                break;
            case 'document':
            case 'multidocument':
                width = Math.round(Math.max(width, 110));
                height = Math.round(Math.max(height * 1.2, 72));
                break;
            case 'star':
            case 'star-4':
            case 'star-6':
            case 'badge': {
                const s = Math.round(Math.max(width, height, 90));
                width = s;
                height = s;
                break;
            }
            case 'triangle':
            case 'right-triangle':
                width = Math.round(Math.max(width * 1.25, 110));
                height = Math.round(Math.max(height * 1.3, 75));
                break;
            case 'delay':
                width = Math.round(Math.max(width * 1.1, 110));
                height = Math.round(Math.max(height, 60));
                break;
            default:
                break;
        }

        nodes.set(id, { id, label, shape, width: Math.round(width), height: Math.round(height), rank: rank.get(id) });
    });

    const V_GAP = 90;
    const rowY = [];
    let cumY = 60;
    layers.forEach((layerIds) => {
        const maxHeight = Math.max(...layerIds.map(id => nodes.get(id).height));
        rowY.push(cumY);
        cumY += maxHeight + V_GAP;
    });

    const H_GAP = 65;
    layers.forEach((layerIds, r) => {
        const y = rowY[r];
        let lastX = 60;
        layerIds.forEach(id => {
            const n = nodes.get(id);
            n.y = y;
            const parents = (revAdj.get(id) || []).map(p => nodes.get(p)).filter(p => p && p.cx !== undefined);
            n.cx = parents.length ? parents.reduce((s, p) => s + p.cx, 0) / parents.length : lastX + n.width / 2;
            n.x = Math.round(n.cx - n.width / 2);
            lastX = n.x + n.width + H_GAP;
        });

        for (let i = 1; i < layerIds.length; i++) {
            const prev = nodes.get(layerIds[i - 1]);
            const curr = nodes.get(layerIds[i]);
            if (curr.x < prev.x + prev.width + H_GAP) {
                curr.x = prev.x + prev.width + H_GAP;
                curr.cx = curr.x + curr.width / 2;
            }
        }
    });

    return { nodesById: nodes, layers, backEdges, rowY };
}

// ─── GRAPH BUILDER ────────────────────────────────────────────────────────
const PALETTE = [
    { fill: '#4f46e5', accent: '#818cf8', stroke: '#3730a3' },
    { fill: '#0284c7', accent: '#38bdf8', stroke: '#0369a1' },
    { fill: '#059669', accent: '#34d399', stroke: '#047857' },
    { fill: '#d97706', accent: '#fbbf24', stroke: '#b45309' },
    { fill: '#db2777', accent: '#f472b6', stroke: '#9d174d' },
];

export function buildDiagramObjects(nodesById, parsedEdges, backEdges) {
    const idPrefix = `imp_${Date.now()}`;
    const idMap = new Map();
    let i = 0;
    const appNodes = [];

    nodesById.forEach(n => {
        const genId = `${idPrefix}_n${i++}`;
        idMap.set(n.id, genId);
        const palette = PALETTE[n.rank % PALETTE.length];
        appNodes.push({
            id: genId,
            shapeType: n.shape,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            text: escapeHtml(n.label),
            fillType: 'gradient',
            fillColor: palette.accent,
            gradientColor: palette.fill,
            gradientAngle: 145,
            strokeColor: palette.stroke,
            strokeWidth: 1.75,
            fontColor: '#ffffff',
            fontWeight: 700,
            fontSize: 13,
            cornerRadius: n.shape === 'rectangle' ? 10 : undefined,
        });
    });

    const appEdges = [];
    parsedEdges.forEach((edge, idx) => {
        const A = nodesById.get(edge.from);
        const B = nodesById.get(edge.to);
        if (!A || !B) return;

        const isBackEdge = backEdges.has(`${edge.from}->${edge.to}`);
        appEdges.push({
            id: `${idPrefix}_e${idx}`,
            sourceType: 'node',
            source: idMap.get(edge.from),
            portS: A.rank === B.rank ? (A.x < B.x ? 'R' : 'L') : (isBackEdge ? 'L' : 'B'),
            targetType: 'node',
            target: idMap.get(edge.to),
            portT: A.rank === B.rank ? (A.x < B.x ? 'L' : 'R') : (isBackEdge ? 'L' : 'T'),
            waypoints: [],
            text: edge.label || '',
            strokeColor: isBackEdge ? '#d97706' : '#64748b',
            strokeWidth: 2,
            strokeStyle: isBackEdge ? 'dashed' : 'solid',
            markerEnd: 'arrow',
        });
    });

    return { nodes: appNodes, edges: appEdges, bounds: null };
}

export function generateDiagramFromText(text) {
    const { nodeMap, order, edges } = parseDiagramText(text);
    if (nodeMap.size === 0) return null;
    const { nodesById, backEdges } = layoutDiagram(nodeMap, order, edges);
    return buildDiagramObjects(nodesById, edges, backEdges);
}

// ─── REDESIGNED MICROSOFT FLUENT-STYLE COMPONENT ──────────────────────────
export default function DiagramTextImporter({ onGenerate, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [promptInput, setPromptInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAiGenerate = async () => {
        if (!promptInput.trim()) {
            setError('Please describe the diagram you want to generate.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptInput }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to generate diagram from server.');
            }

            const data = await res.json();
            const result = generateDiagramFromText(data.dsl_text);

            if (!result || result.nodes.length === 0) {
                throw new Error('Could not render diagram from generated result.');
            }

            onGenerate(result.nodes, result.edges, result.bounds);
            setIsOpen(false);
            setPromptInput('');
        } catch (err) {
            setError(err.message || 'An error occurred while generating the diagram.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="group relative inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 p-[1px] transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/10"
            >
                <div className="flex items-center gap-2 rounded-[5px] bg-white dark:bg-slate-950 px-2 py-1.5">
                    <Sparkles className="h-4 w-4 text-violet-500 transition-colors group-hover:text-cyan-500" />

                    <span className="bg-gradient-to-r from-slate-900 via-violet-700 to-cyan-600 dark:from-white dark:via-violet-200 dark:to-cyan-300 bg-clip-text text-xm font-medium text-transparent">
                        Generate Diagram
                    </span>

                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </div>
            </button>



            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute left-0 mt-1.5 w-[90vw] sm:w-[480px] z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg overflow-hidden text-neutral-800 dark:text-neutral-200 font-sans select-none transition-colors duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-xs">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-white">AI Diagram Generator</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                                Describe system flow or architecture
                            </label>
                            <textarea
                                value={promptInput}
                                onChange={(e) => { setPromptInput(e.target.value); setError(null); }}
                                placeholder="e.g. User submits login form -> API Gateway validates token -> Auth Service checks PostgreSQL database..."
                                rows={4}
                                className="w-full text-xs p-3 rounded-md border border-neutral-200 dark:border-neutral-700/80 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                            />
                        </div>

                        {/* Suggestions */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                                <Lightbulb className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                                <span>Try standard templates</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setPromptInput(suggestion)}
                                        className="text-left text-[11px] px-2.5 py-1.5 rounded-md bg-neutral-50/50 dark:bg-neutral-950/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-500/60 text-neutral-700 dark:text-neutral-300 transition-all duration-150 truncate"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="p-2.5 rounded-md bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-xs flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAiGenerate}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-md transition-colors shadow-xs"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Generate Diagram</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}