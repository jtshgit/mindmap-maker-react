import React, { useRef, useEffect } from 'react';
import { getShapeSVG, getShapeTextArea, SHAPE_PORT_IDS } from './ShapeDefinitions';

// ─── IMAGE NODE RENDERER ────────────────────────────────────────────────────
export function renderImageNode(node, nodeW, nodeH, shapeProps) {
    const { fill, stroke, strokeWidth, cursor, onPointerDown, onDoubleClick } = shapeProps;
    const natW = node.imageNaturalWidth || 160;
    const natH = node.imageNaturalHeight || 120;
    const cropRect = node.imageCropRect || { x: 0, y: 0, width: 1, height: 1 };
    const radius = Math.max(0, Math.min(node.imageRadius || 0, Math.min(nodeW, nodeH) / 2));
    const fit = node.imageFit || 'cover';
    const sw = strokeWidth || 0;
    const clipId = `img-clip-${node.id}`;

    const vbX = cropRect.x * natW;
    const vbY = cropRect.y * natH;
    const vbW = Math.max(1, cropRect.width * natW);
    const vbH = Math.max(1, cropRect.height * natH);

    const isTransparent = node.fillType === 'none' || node.fillColor === 'transparent' || fill === 'none';

    return (
        <g cursor={cursor} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
            <defs>
                <clipPath id={clipId}>
                    <rect width={nodeW} height={nodeH} rx={radius} ry={radius} />
                </clipPath>
            </defs>

            {/* Draw background fill ONLY if explicitly configured and NOT transparent */}
            {!isTransparent && fill && (
                <rect width={nodeW} height={nodeH} rx={radius} ry={radius} fill={fill} />
            )}

            {/* Fallback placeholder background ONLY if image source is completely missing */}
            {!node.imageSrc && isTransparent && (
                <rect width={nodeW} height={nodeH} rx={radius} ry={radius} fill="#e2e8f0" />
            )}

            {node.imageSrc && (
                <g clipPath={`url(#${clipId})`}>
                    <svg
                        x="0" y="0" width={nodeW} height={nodeH}
                        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                        preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : fit === 'stretch' ? 'none' : 'xMidYMid slice'}
                    >
                        <image href={node.imageSrc} x="0" y="0" width={natW} height={natH} preserveAspectRatio="none" />
                    </svg>
                </g>
            )}
            {sw > 0 && (
                <rect width={nodeW} height={nodeH} rx={radius} ry={radius} fill="none" stroke={stroke} strokeWidth={sw} />
            )}
            {/* Invisible full-box hit target so clicks/drags work everywhere */}
            <rect width={nodeW} height={nodeH} fill="transparent" stroke="none" />
        </g>
    );
}

// ─── SELECTION-AWARE TEXT FORMATTING ───────────────────────────────────────
// Maps the property names used by the toolbar to real CSS style keys.
const STYLE_PROP_MAP = {
    fontWeight: 'fontWeight',
    fontStyle: 'fontStyle',
    fontFamily: 'fontFamily',
    fontColor: 'color',
    textDecoration: 'textDecoration',
    fontSize: 'fontSize',
    letterSpacing: 'letterSpacing',
};

// Toolbar controls that must take real DOM focus to work (number inputs,
// the color popover's RGB fields) unavoidably blur the contentEditable div,
// which clears window.getSelection(). To survive that, EditableNodeText
// continuously mirrors the last non-collapsed in-node selection here while
// editing, so a format action can still find "what was selected" even after
// focus has moved to a toolbar control. Keyed by node id; cleared on exit.
const savedSelections = new Map();

function getActiveSelectionInNode(nodeId) {
    const div = document.querySelector(`[data-node-text-id="${nodeId}"]`);
    if (!div) return null;

    // Prefer the live selection — covers Bold/Italic/etc. where mousedown
    // was prevented and focus never left the div.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        if (div.contains(range.commonAncestorContainer)) {
            return { div, range, sel, isLive: true };
        }
    }

    // Fall back to the last known selection captured before focus moved to
    // a control that needed its own focus (font size, color picker, etc).
    const saved = savedSelections.get(nodeId);
    if (saved && !saved.collapsed && div.contains(saved.commonAncestorContainer)) {
        return { div, range: saved, sel: window.getSelection(), isLive: false };
    }

    return null;
}

// Call this from toolbar handlers BEFORE falling back to updateNode().
// Returns true if a partial selection was formatted in place (nothing else
// to do — the edit will be persisted on the normal blur/save flow).
// Returns false if there was no usable selection, meaning the caller should
// fall back to updateNode(id, { [prop]: value }) to style the whole node.
export function applyTextStyleToSelection(nodeId, updates) {
    const found = getActiveSelectionInNode(nodeId);
    if (!found) return false;

    const { range, sel } = found;

    const span = document.createElement('span');
    const appliedCssProps = [];

    Object.entries(updates).forEach(([prop, value]) => {
        const cssProp = STYLE_PROP_MAP[prop];
        if (!cssProp) return;
        appliedCssProps.push(cssProp);
        if (cssProp === 'fontSize' || cssProp === 'letterSpacing') {
            span.style[cssProp] = typeof value === 'number' ? `${value}px` : value;
        } else {
            span.style[cssProp] = value;
        }
    });

    try {
        // Works when the selection doesn't straddle element boundaries.
        range.surroundContents(span);
    } catch (e) {
        // Selection spans multiple nodes/elements — extract then wrap.
        const content = range.extractContents();
        span.appendChild(content);
        range.insertNode(span);
    }

    // Remove inner styling overrides for the updated CSS properties so that
    // parent wrapper styles aren't obscured by pre-existing inner element styles.
    const innerChildren = Array.from(span.querySelectorAll('*')).reverse();
    innerChildren.forEach((child) => {
        appliedCssProps.forEach((cssProp) => {
            if (child.style && child.style[cssProp] !== undefined) {
                child.style[cssProp] = '';
            }
        });

        // Remove empty style attribute if no inline styles remain
        if (child.hasAttribute('style') && !child.getAttribute('style')) {
            child.removeAttribute('style');
        }

        // Unwrap redundant <span> elements that no longer have any attributes
        if (child.tagName.toLowerCase() === 'span' && child.attributes.length === 0) {
            while (child.firstChild) {
                child.parentNode.insertBefore(child.firstChild, child);
            }
            child.remove();
        }
    });

    // Keep the formatted text selected (not collapsed to a cursor) so
    // stacking formats — select once, click Bold, click Italic — applies
    // both to the same text, the way Word/Docs behave. Update both the live
    // selection and the saved-selection cache so this keeps working even if
    // the next click also has to steal focus (e.g. font size right after).
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    try {
        sel.removeAllRanges();
        sel.addRange(newRange);
    } catch (e) {
        // Selection may be unavailable if focus is in an unrelated control —
        // harmless, the saved-selection cache below still gets updated.
    }
    savedSelections.set(nodeId, newRange.cloneRange());

    return true;
}

// Reads the *actual* formatting at the current caret/selection inside a
// node's text (falling back to the node-level style when not editing, or
// when the caret sits in plain unstyled text). The toolbar uses this to
// decide highlight state and the next toggle value — reading node.fontWeight
// alone goes stale the moment a partial selection was formatted, since that
// only touches a nested <span>, not the node.
export function getActiveTextFormat(node, isEditingThisNode) {
    const fallback = {
        fontWeight: node.fontWeight || 400,
        fontStyle: node.fontStyle || 'normal',
        textDecoration: node.textDecoration || 'none',
        fontFamily: node.fontFamily || 'Segoe UI',
        fontSize: node.fontSize || 12,
        letterSpacing: node.letterSpacing ?? 0,
        fontColor: node.fontColor || '#000000',
    };

    if (!isEditingThisNode) return fallback;

    const div = document.querySelector(`[data-node-text-id="${node.id}"]`);
    if (!div) return fallback;

    const sel = window.getSelection();
    let refNode = null;

    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (div.contains(range.commonAncestorContainer)) {
            refNode = range.commonAncestorContainer;
        }
    }
    if (!refNode) refNode = savedSelections.get(node.id)?.commonAncestorContainer;
    if (!refNode || !div.contains(refNode)) return fallback;

    const el = refNode.nodeType === 3 ? refNode.parentElement : refNode;
    if (!el) return fallback;

    const computed = window.getComputedStyle(el);
    return {
        fontWeight: parseInt(computed.fontWeight, 10) || fallback.fontWeight,
        fontStyle: computed.fontStyle || fallback.fontStyle,
        textDecoration: computed.textDecorationLine !== 'none' ? 'underline' : 'none',
        fontFamily: (computed.fontFamily || fallback.fontFamily).split(',')[0].replace(/['"]/g, '').trim(),
        fontSize: parseFloat(computed.fontSize) || fallback.fontSize,
        letterSpacing: computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0,
        fontColor: rgbToHexColor(computed.color) || fallback.fontColor,
    };
}

function rgbToHexColor(rgbStr) {
    const m = rgbStr && rgbStr.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return null;
    const [r, g, b] = m.map(Number);
    return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`;
}


export function EditableNodeText({ node, isEditing, onSave, onExit, nodeW, nodeH, flipColorForTheme }) {
    const divRef = useRef(null);
    const editSessionRef = useRef(false);
    const textArea = getShapeTextArea(node.shapeType || 'rectangle', nodeW, nodeH);

    useEffect(() => {
        if (isEditing && divRef.current) {
            if (!editSessionRef.current) {
                divRef.current.innerHTML = node.text;
                editSessionRef.current = true;
                const el = divRef.current;
                el.focus();
                if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } else {
            editSessionRef.current = false;
            if (!isEditing && divRef.current) {
                divRef.current.innerHTML = node.text;
            }
        }
    }, [isEditing, node.text]);

    useEffect(() => {
        const handleGlobalPointerDown = (e) => {
            if (!isEditing || !divRef.current) return;

            if (divRef.current.contains(e.target)) return;

            // Any element that opts out of "click outside" (the formatting
            // sidebar, floating color popovers/dropdowns rendered outside
            // it, etc.) is marked with data-keep-text-editing — walk up
            // from the click target rather than relying on a single fixed
            // container id, so it keeps working regardless of DOM nesting.
            if (e.target.closest && e.target.closest('[data-keep-text-editing]')) return;

            savedSelections.delete(node.id);
            onSave(divRef.current.innerHTML);
        };

        document.addEventListener('pointerdown', handleGlobalPointerDown, true);
        return () => document.removeEventListener('pointerdown', handleGlobalPointerDown, true);
    }, [isEditing, onSave, node.id]);

    // Continuously mirror the last non-collapsed selection made inside this
    // node's text while editing, so toolbar controls that must take real
    // focus (number inputs, color popover) can still apply to the text the
    // user actually selected instead of falling back to "whole node".
    useEffect(() => {
        if (!isEditing) {
            savedSelections.delete(node.id);
            return;
        }
        const handleSelectionChange = () => {
            const el = divRef.current;
            if (!el) return;
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                if (el.contains(range.commonAncestorContainer)) {
                    savedSelections.set(node.id, range.cloneRange());
                }
            }
            document.dispatchEvent(new CustomEvent('node-text-selection-changed', { detail: { nodeId: node.id } }));
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [isEditing, node.id]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onExit();
            e.stopPropagation();
        }
    };

    return (
        <foreignObject x={textArea.x} y={textArea.y} width={textArea.width} height={textArea.height} pointerEvents={isEditing ? 'auto' : 'none'} style={{ overflow: 'visible' }}>
            <div
                style={{
                    width: '100%', height: '100%', boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: node.verticalAlign === 'start' ? 'flex-start' : node.verticalAlign === 'end' ? 'flex-end' : 'center',
                    padding: `${node.textPaddingY ?? 4}px ${node.textPaddingX ?? 10}px`,
                }}>
                <div
                    style={{
                        fontFamily: node.fontFamily || 'system-ui',
                        fontSize: `${node.fontSize || 13}px`,
                        color: flipColorForTheme(node.fontColor || '#000000'),
                        fontWeight: node.fontWeight || 400,
                        fontStyle: node.fontStyle || 'normal',
                        textDecoration: node.textDecoration === 'underline' ? 'underline' : 'none',
                        letterSpacing: `${node.letterSpacing || 0}px`,
                        textAlign: node.textAlign === 'middle' ? 'center' : (node.textAlign || 'center'),
                        outline: 'none',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        cursor: isEditing ? 'text' : 'inherit',
                        userSelect: isEditing ? 'text' : 'none',
                        WebkitUserSelect: isEditing ? 'text' : 'none',
                        width: '100%'
                    }}
                    ref={divRef}
                    data-node-text-id={node.id}
                    contentEditable={isEditing}
                    suppressContentEditableWarning={true}
                    onKeyDown={handleKeyDown}
                    onPointerDown={(e) => {
                        if (isEditing) {
                            e.stopPropagation();
                        }
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                />
            </div>
        </foreignObject>
    );
}

// ─── PORT HANDLES (connection dots on hover) ───────────────────────────────
function PortHandles({ node, edges, hoveredPort, sf, getPortCoord, onPortHoverEnter, onPortHoverLeave, onPortPointerDown }) {
    return (
        <>
            {SHAPE_PORT_IDS.map(port => {
                const pt = getPortCoord(node, port);
                const cx = pt.x - node.x;
                const cy = pt.y - node.y;

                const connectedEdge = edges.find(e =>
                    (e.sourceType !== 'point' && e.source === node.id && e.portS === port) ||
                    (e.targetType === 'node' && e.target === node.id && e.portT === port)
                );
                const isHovered = hoveredPort === `${node.id}-${port}`;

                return (
                    <g
                        key={port}
                        cursor={connectedEdge ? 'grab' : 'crosshair'}
                        onPointerEnter={() => onPortHoverEnter(port)}
                        onPointerLeave={onPortHoverLeave}
                        onPointerDown={(e) => onPortPointerDown(e, port)}
                    >
                        {(connectedEdge || isHovered) && (
                            <circle cx={cx} cy={cy} r={7 * sf} fill={connectedEdge ? '#2563eb' : '#22c55e'} stroke="#fff" strokeWidth={2 * sf} />
                        )}

                        <line x1={cx - 4 * sf} y1={cy - 4 * sf} x2={cx + 4 * sf} y2={cy + 4 * sf}
                            stroke={connectedEdge || isHovered ? '#fff' : '#00000056'} strokeWidth={2 * sf} strokeLinecap="round" />
                        <line x1={cx + 4 * sf} y1={cy - 4 * sf} x2={cx - 4 * sf} y2={cy + 4 * sf}
                            stroke={connectedEdge || isHovered ? '#fff' : '#00000056'} strokeWidth={2 * sf} strokeLinecap="round" />

                        <title>{connectedEdge ? 'Drag to adjust / detach connected line' : 'Drag to connect new line'}</title>
                    </g>
                );
            })}
        </>
    );
}

const RESIZE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export default function ShapeNode({
    node,
    isSelected,
    showPorts,
    showEditingUI,
    mode,
    sf,
    edges,
    hoveredPort,
    isEditingText,
    flipColorForTheme,
    getPortCoord,
    onPointerDown,
    onDoubleClick,
    onHoverEnter,
    onHoverLeave,
    onContextMenu,
    onResizeHandlePointerDown,
    onPortHoverEnter,
    onPortHoverLeave,
    onPortPointerDown,
    onTextSave,
    onTextExit,
}) {
    const nodeW = node.width || 120;
    const nodeH = node.height || 40;
    const isTransparent = node.fillType === 'none' || node.fillColor === 'transparent';
    const nodeOpacity = node.opacity ?? 1;

    const fillType = node.fillType || 'solid';
    const gradId = `grad-${node.id}`;
    const gradAngleRad = ((node.gradientAngle ?? 135) * Math.PI) / 180;
    const gx1 = 0.5 - 0.5 * Math.cos(gradAngleRad), gy1 = 0.5 - 0.5 * Math.sin(gradAngleRad);
    const gx2 = 0.5 + 0.5 * Math.cos(gradAngleRad), gy2 = 0.5 + 0.5 * Math.sin(gradAngleRad);
    const fill = fillType === 'gradient' ? `url(#${gradId})` : (fillType === 'none' ? 'none' : flipColorForTheme(node.fillColor || '#ffffff'));
    const stroke = flipColorForTheme(node.strokeColor || '#000000ff');
    const strokeWidth = node.strokeWidth !== undefined ? node.strokeWidth : 2;
    const strokeDasharray = node.strokeStyle === 'dashed' ? '8,6' : node.strokeStyle === 'dotted' ? '3,4' : undefined;
    const cursor = mode === 'pan' ? 'grab' : 'move';
    const type = node.shapeType || 'rectangle';
    const hasShadow = node.effect === 'shadow';
    const shadowId = `shadow-blur-${node.id}`;
    const margin = 1;

    const shapeProps = {
        fill, stroke, strokeWidth, cursor,
        ...(strokeDasharray ? { strokeDasharray } : {}),
        ...(node.cornerRadius ? { rx: node.cornerRadius, ry: node.cornerRadius } : {}),
        onPointerDown,
        onDoubleClick,
    };

    return (
        <g transform={`translate(${node.x}, ${node.y})`} opacity={nodeOpacity}
            onPointerEnter={onHoverEnter}
            onPointerLeave={onHoverLeave}
            onContextMenu={onContextMenu}
            style={{ pointerEvents: 'all' }}
        >
            <rect
                x={0}
                y={0}
                width={nodeW}
                height={nodeH}
                fill="transparent"
                pointerEvents="all"
            />
            {fillType === 'gradient' && (
                <defs>
                    <linearGradient id={gradId} x1={gx1} y1={gy1} x2={gx2} y2={gy2}>
                        <stop offset="0%" stopColor={flipColorForTheme(node.fillColor || '#93c5fd')} />
                        <stop offset="100%" stopColor={flipColorForTheme(node.gradientColor || '#3b82f6')} />
                    </linearGradient>
                </defs>
            )}

            {hasShadow && (
                <g pointerEvents="none" opacity={node.shadowOpacity ?? 0.35} transform={`translate(${node.shadowOffsetX ?? 3}, ${node.shadowOffsetY ?? 3})`}>
                    <defs>
                        <filter id={shadowId} x="-60%" y="-60%" width="220%" height="220%">
                            <feGaussianBlur stdDeviation={node.shadowBlur ?? 4} />
                        </filter>
                    </defs>
                    <g filter={`url(#${shadowId})`}>
                        {type === 'image'
                            ? <rect width={nodeW} height={nodeH} rx={Math.min(node.imageRadius || 0, Math.min(nodeW, nodeH) / 2)} fill={node.shadowColor || '#000000'} />
                            : getShapeSVG(type, nodeW, nodeH, { fill: node.shadowColor || '#000000', stroke: 'none', strokeWidth: 0 }, node)}
                    </g>
                </g>
            )}

            {type === 'image' ? renderImageNode(node, nodeW, nodeH, shapeProps) : getShapeSVG(type, nodeW, nodeH, shapeProps, node)}

            {isSelected && showEditingUI && (
                <g>
                    <rect x={-2 * sf - margin} y={-2 * sf - margin} width={nodeW + 4 * sf + (2 * margin)} height={nodeH + 4 * sf + (2 * margin)}
                        fill="none" stroke={node.locked ? '#f59e0b' : '#3b82f6'} strokeWidth={1.5 * sf} strokeDasharray={`${4 * sf},${4 * sf}`} pointerEvents="none" />
                    {node.locked && (
                        <text x={nodeW + 4 * sf} y={-4 * sf} fontSize={12 * sf} fill="#f59e0b" pointerEvents="none">🔒</text>
                    )}
                    {!node.locked && RESIZE_DIRS.map(dir => {
                        let hx, hy, csr;
                        const left = -2 * sf - margin;
                        const top = -2 * sf - margin;
                        const right = nodeW + 2 * sf + margin;
                        const bottom = nodeH + 2 * sf + margin;

                        if (dir === 'nw') { hx = left; hy = top; csr = 'nwse-resize'; }
                        if (dir === 'n') { hx = (left + right) / 2; hy = top; csr = 'ns-resize'; }
                        if (dir === 'ne') { hx = right; hy = top; csr = 'nesw-resize'; }
                        if (dir === 'e') { hx = right; hy = (top + bottom) / 2; csr = 'ew-resize'; }
                        if (dir === 'se') { hx = right; hy = bottom; csr = 'nwse-resize'; }
                        if (dir === 's') { hx = (left + right) / 2; hy = bottom; csr = 'ns-resize'; }
                        if (dir === 'sw') { hx = left; hy = bottom; csr = 'nesw-resize'; }
                        if (dir === 'w') { hx = left; hy = (top + bottom) / 2; csr = 'ew-resize'; }
                        return (
                            <circle key={dir} cx={hx} cy={hy} r={4 * sf} fill="#b4aeffff" stroke="#ffffffff" strokeWidth={1 * sf} cursor={csr}
                                onPointerDown={(e) => onResizeHandlePointerDown(e, dir)}
                            />
                        );
                    })}
                </g>
            )}

            <EditableNodeText
                node={node}
                isEditing={isEditingText}
                onSave={onTextSave}
                onExit={onTextExit}
                nodeW={nodeW}
                nodeH={nodeH}
                flipColorForTheme={flipColorForTheme}
            />

            {showPorts && showEditingUI && (
                <PortHandles
                    node={node}
                    edges={edges}
                    hoveredPort={hoveredPort}
                    sf={sf}
                    getPortCoord={getPortCoord}
                    onPortHoverEnter={onPortHoverEnter}
                    onPortHoverLeave={onPortHoverLeave}
                    onPortPointerDown={onPortPointerDown}
                />
            )}
        </g>
    );
}