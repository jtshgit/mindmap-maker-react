import React from 'react';

/**
 * One connection line, fully rendered. This component does no geometry —
 * `frozenPts` (and `shadowPts`, while a drag is live) are already-resolved
 * canvas-space points from useConnectionMath (getFullLine / getStartCoord /
 * getEndCoord). ConnectionLine only turns those points + the edge's style
 * fields into SVG.
 */
export default function ConnectionLine({
    edge,
    frozenPts,
    shadowPts,
    isSelected,
    isDraftingThis,
    showEditingUI,
    mode,
    sf,
    flipColorForTheme,
    onSelect,
    onContextMenu,
    onSegmentPointerDown,
    onCornerPointerDown,
}) {
    const frozenPath = `M ${frozenPts.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    const startPt = frozenPts[0];
    const endPt = frozenPts[frozenPts.length - 1];

    const strokeColor = flipColorForTheme(edge.strokeColor || '#000000ff');
    const strokeWidth = edge.strokeWidth || 1;
    const strokeDasharray = edge.strokeStyle === 'dashed' ? '8,6' : edge.strokeStyle === 'dotted' ? '3,4' : 'none';

    const startMarkerUrl = edge.markerStart && edge.markerStart !== 'none' ? `url(#marker-start-${edge.id})` : undefined;
    const endStyleResolved = edge.markerEnd !== undefined ? edge.markerEnd : (edge.targetType === 'edgeAnchor' ? 'dot' : 'arrow');
    const endMarkerUrl = endStyleResolved !== 'none' ? `url(#marker-end-${edge.id})` : undefined;
    const lineCap = edge.lineCap === 'round' ? 'round' : 'butt';
    const hasEdgeShadow = edge.effect === 'shadow';
    const edgeShadowFilterId = `edge-shadow-${edge.id}`;

    return (
        <g opacity={edge.opacity ?? 1}>
            {isSelected && showEditingUI && !isDraftingThis && (
                <path d={frozenPath} fill="none" stroke="#3b82f6" strokeWidth={1.5 * sf} strokeDasharray={`${4 * sf},${4 * sf}`}
                    strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
            )}
            {hasEdgeShadow && (
                <g pointerEvents="none" opacity="0.4" transform="translate(2, 2)">
                    <defs>
                        <filter id={edgeShadowFilterId} x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur stdDeviation="2.5" />
                        </filter>
                    </defs>
                    <path d={frozenPath} fill="none" stroke="#000000" strokeWidth={strokeWidth} strokeLinecap={lineCap} filter={`url(#${edgeShadowFilterId})`} />
                </g>
            )}
            <path
                d={frozenPath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeLinecap={lineCap}
                markerStart={startMarkerUrl}
                markerEnd={endMarkerUrl}
                onPointerDown={onSelect}
                onContextMenu={onContextMenu}
            />
            {shadowPts && (
                <path
                    d={`M ${shadowPts.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={edge.strokeStyle === 'dotted' ? '3,4' : '6,6'}
                    opacity="0.65"
                    markerStart={startMarkerUrl}
                    markerEnd={endMarkerUrl}
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {/* Free end markers (shown only when no custom marker head is selected) */}
            {edge.sourceType === 'point' && (!edge.markerStart || edge.markerStart === 'none') && (
                <circle cx={startPt.x} cy={startPt.y} r={4.5 * sf} fill="#059669" stroke="#fff" strokeWidth={1.5 * sf} style={{ pointerEvents: 'none' }} />
            )}
            {edge.targetType === 'point' && edge.markerEnd === 'none' && (
                <circle cx={endPt.x} cy={endPt.y} r={4.5 * sf} fill="#059669" stroke="#fff" strokeWidth={1.5 * sf} style={{ pointerEvents: 'none' }} />
            )}

            {!isDraftingThis && frozenPts.map((pt, i) => {
                if (i >= frozenPts.length - 1) return null;
                const next = frozenPts[i + 1];
                return (
                    <line key={`seg-${i}`} x1={pt.x} y1={pt.y} x2={next.x} y2={next.y} stroke="transparent" strokeWidth={15 * sf}
                        style={{ cursor: mode === 'select' ? (pt.y === next.y ? 'ns-resize' : 'ew-resize') : 'inherit' }}
                        onPointerDown={(e) => onSegmentPointerDown(e, i)}
                    />
                );
            })}

            {isSelected && showEditingUI && !isDraftingThis && edge.waypoints.map((wp, i) => (
                <circle key={`corner-${i}`} cx={wp.x} cy={wp.y} r={5 * sf} fill="#fff" stroke="#000000ff" strokeWidth={2 * sf}
                    style={{ cursor: mode === 'select' ? 'move' : 'inherit' }}
                    onPointerDown={(e) => onCornerPointerDown(e, i)} />
            ))}
        </g>
    );
}