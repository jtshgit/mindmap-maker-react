import React from 'react';

// Renders the little shape used inside a marker (arrow, dot, diamond, bar...).
function renderMarkerShape(style, color) {
    switch (style) {
        case 'arrow':
            return <polygon points="1 2, 9 5, 1 8" fill={color} />;
        case 'open-arrow':
            return <polyline points="2 2, 8 5, 2 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />;
        case 'stealth':
            return <polygon points="1 1, 9 5, 1 9, 3 5" fill={color} />;
        case 'dot':
            return <circle cx="5" cy="5" r="3.5" fill={color} />;
        case 'diamond':
            return <polygon points="5 1, 9 5, 5 9, 1 5" fill={color} />;
        case 'diamond-open':
            return <polygon points="5 1, 9 5, 5 9, 1 5" fill="none" stroke={color} strokeWidth="1.5" />;
        case 'bar':
            return <line x1="8" y1="1" x2="8" y2="9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />;
        case 'half-arrow':
            return <polygon points="1 1, 9 5, 1 5" fill={color} />;
        default:
            return null;
    }
}

const getRefX = (style) => (style === 'dot' || style === 'diamond' || style === 'diamond-open' ? 5 : 8);

/**
 * Renders one <marker> pair (start + end) per edge that needs a custom
 * head/tail. Meant to be dropped inside the canvas's <defs>, alongside the
 * few static markers (#arrow, #arrow-selected, #arrow-shadow) that App.js
 * keeps for its own draft-line / drag-preview rendering.
 */
export default function EdgeMarkerDefs({ edges, flipColorForTheme }) {
    return (
        <>
            {edges.map(edge => {
                const color = flipColorForTheme(edge.strokeColor || '#000000');

                const startStyle = edge.markerStart || 'none';
                const endStyle = edge.markerEnd !== undefined ? edge.markerEnd : (edge.targetType === 'edgeAnchor' ? 'dot' : 'arrow');

                const startSize = edge.markerStartSize || 10;
                const endSize = edge.markerEndSize || 10;

                return (
                    <React.Fragment key={`markers-${edge.id}`}>
                        {startStyle !== 'none' && (
                            <marker
                                id={`marker-start-${edge.id}`}
                                viewBox="0 0 10 10"
                                markerWidth={startSize}
                                markerHeight={startSize}
                                refX={getRefX(startStyle)}
                                refY="5"
                                orient="auto-start-reverse"
                                markerUnits="userSpaceOnUse"
                                overflow="visible"
                            >
                                {renderMarkerShape(startStyle, color)}
                            </marker>
                        )}
                        {endStyle !== 'none' && (
                            <marker
                                id={`marker-end-${edge.id}`}
                                viewBox="0 0 10 10"
                                markerWidth={endSize}
                                markerHeight={endSize}
                                refX={getRefX(endStyle)}
                                refY="5"
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                                overflow="visible"
                            >
                                {renderMarkerShape(endStyle, color)}
                            </marker>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
}