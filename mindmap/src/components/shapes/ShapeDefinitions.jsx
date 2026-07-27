import React from 'react';

// ─── SHAPE GEOMETRY HELPERS ─────────────────────────────────────────────────
const arrToPointsAttr = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ');

const polarXY = (cx, cy, rx, ry, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + rx * Math.cos(rad), cy + ry * Math.sin(rad)];
};

const regularPolygonPointList = (w, h, sides) => {
    const cx = w / 2, cy = h / 2;
    const rx = w / 2, ry = h / 2;
    const pts = [];
    for (let i = 0; i < sides; i++) {
        pts.push(polarXY(cx, cy, rx, ry, (360 / sides) * i));
    }
    return pts;
};

// Variable star generator (4-point, 5-point, 6-point, badges)
const starNPointList = (w, h, points = 5, innerRatio = 0.382) => {
    const cx = w / 2, cy = h / 2;
    const outerRx = w / 2, outerRy = h / 2;
    const innerRx = outerRx * innerRatio, innerRy = outerRy * innerRatio;
    const pts = [];
    const totalPoints = points * 2;
    const angleStep = 360 / totalPoints;
    for (let i = 0; i < totalPoints; i++) {
        const angle = i * angleStep;
        pts.push(i % 2 === 0
            ? polarXY(cx, cy, outerRx, outerRy, angle)
            : polarXY(cx, cy, innerRx, innerRy, angle));
    }
    return pts;
};

// Polygon Point Lists
const octagonPointList = (w, h) => {
    const cut = Math.min(w, h) * 0.293;
    return [
        [cut, 0], [w - cut, 0], [w, cut], [w, h - cut],
        [w - cut, h], [cut, h], [0, h - cut], [0, cut]
    ];
};

const crossPointList = (w, h) => {
    const tx = w / 3, ty = h / 3;
    return [
        [tx, 0], [2 * tx, 0], [2 * tx, ty], [w, ty],
        [w, 2 * ty], [2 * tx, 2 * ty], [2 * tx, h], [tx, h],
        [tx, 2 * ty], [0, 2 * ty], [0, ty], [tx, ty]
    ];
};

const arrowRightPointList = (w, h) => [
    [0, h * 0.25], [w * 0.6, h * 0.25], [w * 0.6, 0], [w, h * 0.5],
    [w * 0.6, h], [w * 0.6, h * 0.75], [0, h * 0.75]
];

const arrowLeftPointList = (w, h) => [
    [w, h * 0.25], [w * 0.4, h * 0.25], [w * 0.4, 0], [0, h * 0.5],
    [w * 0.4, h], [w * 0.4, h * 0.75], [w, h * 0.75]
];

const arrowUpPointList = (w, h) => [
    [w * 0.25, h], [w * 0.25, h * 0.4], [0, h * 0.4], [w * 0.5, 0],
    [w, h * 0.4], [w * 0.75, h * 0.4], [w * 0.75, h]
];

const arrowDownPointList = (w, h) => [
    [w * 0.25, 0], [w * 0.75, 0], [w * 0.75, h * 0.6], [w, h * 0.6],
    [w * 0.5, h], [0, h * 0.6], [w * 0.25, h * 0.6]
];

const doubleArrowPointList = (w, h) => [
    [0, h * 0.5], [w * 0.2, 0], [w * 0.2, h * 0.25], [w * 0.8, h * 0.25],
    [w * 0.8, 0], [w, h * 0.5], [w * 0.8, h], [w * 0.8, h * 0.75],
    [w * 0.2, h * 0.75], [w * 0.2, h]
];

const chevronRightPointList = (w, h) => [
    [0, 0], [w * 0.6, 0], [w, h * 0.5], [w * 0.6, h], [0, h], [w * 0.4, h * 0.5]
];

const arrowPentagonPointList = (w, h) => [
    [0, 0], [w * 0.7, 0], [w, h * 0.5], [w * 0.7, h], [0, h]
];

const diamondPointList = (w, h) => [
    [w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]
];

const parallelogramPointList = (w, h) => {
    const skew = Math.min(20, w / 4);
    return [[skew, 0], [w, 0], [w - skew, h], [0, h]];
};

const trapezoidPointList = (w, h) => [
    [w * 0.2, 0], [w * 0.8, 0], [w, h], [0, h]
];

const hexagonPointList = (w, h) => {
    const hex = Math.min(20, w / 4);
    return [[hex, 0], [w - hex, 0], [w, h / 2], [w - hex, h], [hex, h], [0, h / 2]];
};

const trianglePointList = (w, h) => [
    [w / 2, 0], [w, h], [0, h]
];

const rightTrianglePointList = (w, h) => [
    [0, 0], [w, h], [0, h]
];

const rectPointList = (w, h) => [
    [0, 0], [w, 0], [w, h], [0, h]
];

const tagPointList = (w, h) => [
    [0, 0], [w * 0.75, 0], [w, h * 0.5], [w * 0.75, h], [0, h]
];

const manualInputPointList = (w, h) => [
    [0, h * 0.25], [w, 0], [w, h], [0, h]
];

const manualOperationPointList = (w, h) => [
    [0, 0], [w, 0], [w * 0.8, h], [w * 0.2, h]
];

const preparationPointList = (w, h) => [
    [w * 0.2, 0], [w * 0.8, 0], [w, h * 0.5], [w * 0.8, h], [w * 0.2, h], [0, h * 0.5]
];

const delayPointList = (w, h) => [
    [0, 0], [w * 0.6, 0], [w, h * 0.25], [w, h * 0.75], [w * 0.6, h], [0, h]
];

const displayPointList = (w, h) => [
    [w * 0.2, 0], [w * 0.7, 0], [w, h * 0.5], [w * 0.7, h], [w * 0.2, h], [0, h * 0.5]
];

const lightningPointList = (w, h) => [
    [w * 0.5, 0], [w * 0.1, h * 0.55], [w * 0.45, h * 0.55], [w * 0.2, h],
    [w * 0.9, h * 0.4], [w * 0.55, h * 0.4]
];

const heartPointList = (w, h) => [
    [w * 0.5, h * 0.3], [w * 0.8, 0], [w, h * 0.35], [w * 0.5, h], [0, h * 0.35], [w * 0.2, 0]
];

const calloutPath = (w, h) => {
    const r = Math.max(2, Math.min(10, w / 8, h / 6));
    const bodyH = h * 0.75;
    return `M ${r},0
    L ${w - r},0 Q ${w},0 ${w},${r}
    L ${w},${bodyH - r} Q ${w},${bodyH} ${w - r},${bodyH}
    L ${w * 0.35},${bodyH} L ${w * 0.2},${h} L ${w * 0.28},${bodyH}
    L ${r},${bodyH} Q 0,${bodyH} 0,${bodyH - r}
    L 0,${r} Q 0,0 ${r},0 Z`;
};

const documentPath = (w, h) => {
    const waveH = h * 0.85;
    return `M 0,0 L ${w},0 L ${w},${waveH} Q ${w * 0.75},${h * 0.7} ${w * 0.5},${waveH} T 0,${waveH} Z`;
};

// ─── SHAPE RENDERING ────────────────────────────────────────────────────────
export const getShapeSVG = (type, nodeW, nodeH, props, node) => {
    switch (type) {
        case 'image': {
            const { cursor, onPointerDown, onDoubleClick, stroke, strokeWidth } = props;
            const radius = Math.max(0, Math.min(node?.imageRadius || 0, Math.min(nodeW, nodeH) / 2));
            const fit = node?.imageFit || 'stretch';
            const natW = node?.imageNaturalWidth || nodeW;
            const natH = node?.imageNaturalHeight || nodeH;

            let cropX = 0, cropY = 0, cropW = natW, cropH = natH;

            // Prioritize imageCropRect { x, y, width, height }
            if (node?.imageCropRect) {
                const { x = 0, y = 0, width = 1, height = 1 } = node.imageCropRect;
                cropX = natW * Math.max(0, Math.min(1, x));
                cropY = natH * Math.max(0, Math.min(1, y));
                cropW = Math.max(1, natW * Math.max(0.01, Math.min(1 - x, width)));
                cropH = Math.max(1, natH * Math.max(0.01, Math.min(1 - y, height)));
            } else if (node?.imageCrop) {
                const crop = node.imageCrop;
                const left = Math.max(0, Math.min(0.99, crop.left || 0));
                const top = Math.max(0, Math.min(0.99, crop.top || 0));
                const right = Math.max(0, Math.min(0.99 - left, crop.right || 0));
                const bottom = Math.max(0, Math.min(0.99 - top, crop.bottom || 0));
                cropX = natW * left;
                cropY = natH * top;
                cropW = Math.max(1, natW * (1 - left - right));
                cropH = Math.max(1, natH * (1 - top - bottom));
            }

            const clipId = `img-clip-${node?.id || 'preview'}`;
            const hasBorder = strokeWidth > 0;
            return (
                <g cursor={cursor} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
                    <defs>
                        <clipPath id={clipId}>
                            <rect width={nodeW} height={nodeH} rx={radius} />
                        </clipPath>
                    </defs>
                    {node?.imageSrc ? (
                        <svg x="0" y="0" width={nodeW} height={nodeH}
                            viewBox={`${cropX} ${cropY} ${cropW} ${cropH}`}
                            preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'none'}
                            clipPath={`url(#${clipId})`}>
                            <image href={node.imageSrc} x="0" y="0" width={natW} height={natH} preserveAspectRatio="none" />
                        </svg>
                    ) : (
                        <rect width={nodeW} height={nodeH} rx={radius} fill="#e2e8f0" stroke="#94a3b8" strokeDasharray="4,3" />
                    )}
                    {hasBorder && (
                        <rect width={nodeW} height={nodeH} rx={radius} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
                    )}
                </g>
            );
        }

        // ── BASIC SHAPES ──
        case 'rounded-rectangle':
            return <rect width={nodeW} height={nodeH} rx="12" {...props} />;
        case 'ellipse':
        case 'circle':
            return <ellipse cx={nodeW / 2} cy={nodeH / 2} rx={nodeW / 2} ry={nodeH / 2} {...props} />;
        case 'semicircle':
            return <path d={`M 0,${nodeH} A ${nodeW / 2} ${nodeH} 0 0 1 ${nodeW} ${nodeH} Z`} {...props} />;
        case 'diamond':
            return <polygon points={arrToPointsAttr(diamondPointList(nodeW, nodeH))} {...props} />;
        case 'parallelogram':
            return <polygon points={arrToPointsAttr(parallelogramPointList(nodeW, nodeH))} {...props} />;
        case 'trapezoid':
            return <polygon points={arrToPointsAttr(trapezoidPointList(nodeW, nodeH))} {...props} />;
        case 'hexagon':
            return <polygon points={arrToPointsAttr(hexagonPointList(nodeW, nodeH))} {...props} />;
        case 'pentagon':
            return <polygon points={arrToPointsAttr(regularPolygonPointList(nodeW, nodeH, 5))} {...props} />;
        case 'heptagon':
            return <polygon points={arrToPointsAttr(regularPolygonPointList(nodeW, nodeH, 7))} {...props} />;
        case 'octagon':
            return <polygon points={arrToPointsAttr(octagonPointList(nodeW, nodeH))} {...props} />;
        case 'triangle':
            return <polygon points={arrToPointsAttr(trianglePointList(nodeW, nodeH))} {...props} />;
        case 'right-triangle':
            return <polygon points={arrToPointsAttr(rightTrianglePointList(nodeW, nodeH))} {...props} />;
        case 'star':
            return <polygon points={arrToPointsAttr(starNPointList(nodeW, nodeH, 5, 0.382))} {...props} />;
        case 'star-4':
            return <polygon points={arrToPointsAttr(starNPointList(nodeW, nodeH, 4, 0.35))} {...props} />;
        case 'star-6':
            return <polygon points={arrToPointsAttr(starNPointList(nodeW, nodeH, 6, 0.45))} {...props} />;
        case 'badge':
            return <polygon points={arrToPointsAttr(starNPointList(nodeW, nodeH, 12, 0.82))} {...props} />;
        case 'cross':
            return <polygon points={arrToPointsAttr(crossPointList(nodeW, nodeH))} {...props} />;
        case 'heart':
            return (
                <path d={`M ${nodeW * 0.5},${nodeH * 0.8} 
                 C ${nodeW * 0.1},${nodeH * 0.5} 0,${nodeH * 0.25} ${nodeW * 0.25},${nodeH * 0.1} 
                 C ${nodeW * 0.4},${nodeH * 0.1} ${nodeW * 0.5},${nodeH * 0.25} ${nodeW * 0.5},${nodeH * 0.25} 
                 C ${nodeW * 0.5},${nodeH * 0.25} ${nodeW * 0.6},${nodeH * 0.1} ${nodeW * 0.75},${nodeH * 0.1} 
                 C ${nodeW},${nodeH * 0.25} ${nodeW * 0.9},${nodeH * 0.5} ${nodeW * 0.5},${nodeH * 0.8} Z`}
                    {...props} />
            );

        // ── FLOWCHART SHAPES ──
        case 'document':
            return <path d={documentPath(nodeW, nodeH)} {...props} />;
        case 'multidocument': {
            const path1 = documentPath(nodeW * 0.88, nodeH * 0.88);
            return (
                <g {...props}>
                    <path d={path1} transform={`translate(${nodeW * 0.12}, ${nodeH * 0.12})`} opacity="0.6" />
                    <path d={path1} transform={`translate(${nodeW * 0.06}, ${nodeH * 0.06})`} opacity="0.8" />
                    <path d={path1} />
                </g>
            );
        }
        case 'predefined-process':
            return (
                <g {...props}>
                    <rect width={nodeW} height={nodeH} />
                    <line x1={nodeW * 0.15} y1={0} x2={nodeW * 0.15} y2={nodeH} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                    <line x1={nodeW * 0.85} y1={0} x2={nodeW * 0.85} y2={nodeH} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                </g>
            );
        case 'internal-storage':
            return (
                <g {...props}>
                    <rect width={nodeW} height={nodeH} />
                    <line x1={nodeW * 0.18} y1={0} x2={nodeW * 0.18} y2={nodeH} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                    <line x1={0} y1={nodeH * 0.2} x2={nodeW} y2={nodeH * 0.2} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                </g>
            );
        case 'database': {
            const r = Math.min(12, nodeH / 5);
            return (
                <g {...props}>
                    <path d={`M 0,${r} C 0,0 ${nodeW},0 ${nodeW},${r} L ${nodeW},${nodeH - r} C ${nodeW},${nodeH} 0,${nodeH} 0,${nodeH - r} Z`} />
                    <ellipse cx={nodeW / 2} cy={r} rx={nodeW / 2} ry={r} fill="none" stroke={props.stroke} strokeWidth={props.strokeWidth} />
                    <path d={`M 0,${nodeH * 0.38} C 0,${nodeH * 0.38 + r} ${nodeW},${nodeH * 0.38 + r} ${nodeW},${nodeH * 0.38}`} fill="none" stroke={props.stroke} strokeWidth={props.strokeWidth} />
                    <path d={`M 0,${nodeH * 0.66} C 0,${nodeH * 0.66 + r} ${nodeW},${nodeH * 0.66 + r} ${nodeW},${nodeH * 0.66}`} fill="none" stroke={props.stroke} strokeWidth={props.strokeWidth} />
                </g>
            );
        }
        case 'delay':
            return (
                <path d={`M 0,0 L ${nodeW * 0.6},0 C ${nodeW * 1.05},0 ${nodeW * 1.05},${nodeH} ${nodeW * 0.6},${nodeH} L 0,${nodeH} Z`} {...props} />
            );
        case 'display':
            return <polygon points={arrToPointsAttr(displayPointList(nodeW, nodeH))} {...props} />;
        case 'manual-input':
            return <polygon points={arrToPointsAttr(manualInputPointList(nodeW, nodeH))} {...props} />;
        case 'manual-operation':
            return <polygon points={arrToPointsAttr(manualOperationPointList(nodeW, nodeH))} {...props} />;
        case 'preparation':
            return <polygon points={arrToPointsAttr(preparationPointList(nodeW, nodeH))} {...props} />;
        case 'summing-junction':
            return (
                <g {...props}>
                    <ellipse cx={nodeW / 2} cy={nodeH / 2} rx={nodeW / 2} ry={nodeH / 2} />
                    <line x1={nodeW * 0.2} y1={nodeH * 0.2} x2={nodeW * 0.8} y2={nodeH * 0.8} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                    <line x1={nodeW * 0.8} y1={nodeH * 0.2} x2={nodeW * 0.2} y2={nodeH * 0.8} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                </g>
            );
        case 'or-node':
            return (
                <g {...props}>
                    <ellipse cx={nodeW / 2} cy={nodeH / 2} rx={nodeW / 2} ry={nodeH / 2} />
                    <line x1={nodeW / 2} y1={0} x2={nodeW / 2} y2={nodeH} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                    <line x1={0} y1={nodeH / 2} x2={nodeW} y2={nodeH / 2} stroke={props.stroke} strokeWidth={props.strokeWidth} />
                </g>
            );

        // ── ARROWS & CHEVRONS ──
        case 'arrow-right':
            return <polygon points={arrToPointsAttr(arrowRightPointList(nodeW, nodeH))} {...props} />;
        case 'arrow-left':
            return <polygon points={arrToPointsAttr(arrowLeftPointList(nodeW, nodeH))} {...props} />;
        case 'arrow-up':
            return <polygon points={arrToPointsAttr(arrowUpPointList(nodeW, nodeH))} {...props} />;
        case 'arrow-down':
            return <polygon points={arrToPointsAttr(arrowDownPointList(nodeW, nodeH))} {...props} />;
        case 'double-arrow':
            return <polygon points={arrToPointsAttr(doubleArrowPointList(nodeW, nodeH))} {...props} />;
        case 'chevron-right':
            return <polygon points={arrToPointsAttr(chevronRightPointList(nodeW, nodeH))} {...props} />;
        case 'arrow-pentagon':
            return <polygon points={arrToPointsAttr(arrowPentagonPointList(nodeW, nodeH))} {...props} />;

        // ── 3D & DIAGRAMS ──
        case 'cylinder': {
            const r = Math.min(10, nodeH / 4);
            return (
                <g {...props}>
                    <path d={`M 0,${r} C 0,0 ${nodeW},0 ${nodeW},${r} L ${nodeW},${nodeH - r} C ${nodeW},${nodeH} 0,${nodeH} 0,${nodeH - r} Z`} />
                    <ellipse cx={nodeW / 2} cy={r} rx={nodeW / 2} ry={r} fill="none" stroke={props.stroke} strokeWidth={props.strokeWidth} />
                </g>
            );
        }
        case 'cube': {
            const depth = Math.min(nodeW, nodeH) * 0.25;
            return (
                <g {...props}>
                    <path d={`M0,${depth} L${depth},0 L${nodeW},0 L${nodeW - depth},${depth} Z`} opacity="0.9" />
                    <path d={`M${nodeW - depth},${depth} L${nodeW},0 L${nodeW},${nodeH - depth} L${nodeW - depth},${nodeH} Z`} opacity="0.75" />
                    <rect x="0" y={depth} width={nodeW - depth} height={nodeH - depth} />
                </g>
            );
        }
        case 'cloud':
            return (
                <path d={`M ${nodeW * 0.3},${nodeH * 0.7} 
                 C ${nodeW * 0.1},${nodeH * 0.7} 0,${nodeH * 0.5} ${nodeW * 0.15},${nodeH * 0.3} 
                 C ${nodeW * 0.2},${nodeH * 0.1} ${nodeW * 0.5},${nodeH * 0.1} ${nodeW * 0.6},${nodeH * 0.2} 
                 C ${nodeW * 0.8},${nodeH * 0.1} ${nodeW},${nodeH * 0.3} ${nodeW * 0.9},${nodeH * 0.5} 
                 C ${nodeW},${nodeH * 0.7} ${nodeW * 0.8},${nodeH} ${nodeW * 0.6},${nodeH * 0.8}
                 C ${nodeW * 0.5},${nodeH * 0.95} ${nodeW * 0.3},${nodeH * 0.95} ${nodeW * 0.3},${nodeH * 0.7} Z`}
                    {...props} />
            );

        // ── ANNOTATIONS & SYMBOLS ──
        case 'callout':
            return <path d={calloutPath(nodeW, nodeH)} {...props} />;
        case 'sticky-note': {
            const fold = Math.min(16, nodeW * 0.2, nodeH * 0.2);
            return (
                <g {...props}>
                    <path d={`M 0,0 L ${nodeW - fold},0 L ${nodeW},${fold} L ${nodeW},${nodeH} L 0,${nodeH} Z`} />
                    <path d={`M ${nodeW - fold},0 L ${nodeW - fold},${fold} L ${nodeW},${fold}`} fill="none" stroke={props.stroke} strokeWidth={props.strokeWidth} opacity="0.6" />
                </g>
            );
        }
        case 'tag':
            return <polygon points={arrToPointsAttr(tagPointList(nodeW, nodeH))} {...props} />;
        case 'lightning':
            return <polygon points={arrToPointsAttr(lightningPointList(nodeW, nodeH))} {...props} />;
        case 'actor': {
            const headR = Math.min(nodeW, nodeH) * 0.18;
            const cx = nodeW / 2;
            const bodyY1 = headR * 2;
            const bodyY2 = nodeH * 0.65;
            const armY = nodeH * 0.35;
            return (
                <g {...props} fill="none" stroke={props.stroke} strokeWidth={props.strokeWidth || 1.5}>
                    <circle cx={cx} cy={headR} r={headR} fill={props.fill} />
                    <line x1={cx} y1={bodyY1} x2={cx} y2={bodyY2} />
                    <line x1={nodeW * 0.1} y1={armY} x2={nodeW * 0.9} y2={armY} />
                    <line x1={cx} y1={bodyY2} x2={nodeW * 0.15} y2={nodeH} />
                    <line x1={cx} y1={bodyY2} x2={nodeW * 0.85} y2={nodeH} />
                </g>
            );
        }
        case 'text': {
            const { fill, stroke, strokeWidth, ...interactionProps } = props;
            return <rect width={nodeW} height={nodeH} fill="transparent" stroke="none" {...interactionProps} />;
        }
        case 'rectangle':
        default:
            return <rect width={nodeW} height={nodeH} rx="0" {...props} />;
    }
};

// ─── DEFAULT SIZES ──────────────────────────────────────────────────────────
export const SHAPE_DEFAULT_SIZE = {
    ellipse: { w: 80, h: 80 },
    circle: { w: 80, h: 80 },
    semicircle: { w: 90, h: 50 },
    diamond: { w: 80, h: 80 },
    hexagon: { w: 80, h: 80 },
    pentagon: { w: 80, h: 80 },
    heptagon: { w: 80, h: 80 },
    octagon: { w: 80, h: 80 },
    triangle: { w: 80, h: 80 },
    'right-triangle': { w: 80, h: 80 },
    star: { w: 90, h: 90 },
    'star-4': { w: 85, h: 85 },
    'star-6': { w: 90, h: 90 },
    badge: { w: 90, h: 90 },
    heart: { w: 80, h: 80 },
    cross: { w: 80, h: 80 },
    cylinder: { w: 80, h: 80 },
    database: { w: 80, h: 90 },
    cube: { w: 90, h: 90 },
    cloud: { w: 100, h: 70 },
    callout: { w: 140, h: 100 },
    trapezoid: { w: 120, h: 70 },
    'arrow-right': { w: 110, h: 60 },
    'arrow-left': { w: 110, h: 60 },
    'arrow-up': { w: 60, h: 110 },
    'arrow-down': { w: 60, h: 110 },
    'double-arrow': { w: 110, h: 60 },
    'chevron-right': { w: 110, h: 60 },
    'arrow-pentagon': { w: 110, h: 60 },
    document: { w: 100, h: 80 },
    multidocument: { w: 105, h: 85 },
    delay: { w: 110, h: 60 },
    display: { w: 110, h: 60 },
    'manual-input': { w: 110, h: 60 },
    'manual-operation': { w: 110, h: 60 },
    preparation: { w: 110, h: 60 },
    'sticky-note': { w: 90, h: 90 },
    tag: { w: 100, h: 50 },
    lightning: { w: 60, h: 100 },
    actor: { w: 60, h: 100 },
    text: { w: 140, h: 40 },
    image: { w: 160, h: 120 },
};

export function getShapeDefaultSize(shapeType, fallbackW, fallbackH) {
    const preset = SHAPE_DEFAULT_SIZE[shapeType];
    return preset ? preset : { w: fallbackW, h: fallbackH };
}

// ─── PRIMARY TEXT AREA ──────────────────────────────────────────────────────
export function getShapeTextArea(type, nodeW, nodeH) {
    switch (type) {
        case 'ellipse':
        case 'circle':
        case 'semicircle':
            return { x: nodeW * 0.15, y: nodeH * 0.2, width: nodeW * 0.7, height: nodeH * 0.6 };
        case 'diamond':
            return { x: nodeW * 0.25, y: nodeH * 0.25, width: nodeW * 0.5, height: nodeH * 0.5 };
        case 'parallelogram': {
            const skew = Math.min(20, nodeW / 4);
            return { x: skew, y: 0, width: nodeW - 2 * skew, height: nodeH };
        }
        case 'trapezoid':
            return { x: nodeW * 0.2, y: 0, width: nodeW * 0.6, height: nodeH };
        case 'hexagon': {
            const hex = Math.min(20, nodeW / 4);
            return { x: hex, y: 0, width: nodeW - 2 * hex, height: nodeH };
        }
        case 'pentagon':
            return { x: nodeW * 0.15, y: nodeH * 0.35, width: nodeW * 0.7, height: nodeH * 0.55 };
        case 'heptagon':
        case 'octagon': {
            const cut = Math.min(nodeW, nodeH) * 0.2;
            return { x: cut, y: cut, width: nodeW - 2 * cut, height: nodeH - 2 * cut };
        }
        case 'triangle':
        case 'right-triangle':
            return { x: nodeW * 0.2, y: nodeH * 0.45, width: nodeW * 0.6, height: nodeH * 0.5 };
        case 'star':
        case 'star-4':
        case 'star-6':
        case 'badge':
            return { x: nodeW * 0.3, y: nodeH * 0.3, width: nodeW * 0.4, height: nodeH * 0.4 };
        case 'cross':
            return { x: nodeW / 3, y: nodeH / 3, width: nodeW / 3, height: nodeH / 3 };
        case 'cylinder':
        case 'database': {
            const r = Math.min(10, nodeH / 4);
            return { x: nodeW * 0.1, y: r * 1.6, width: nodeW * 0.8, height: Math.max(0, nodeH - r * 1.9) };
        }
        case 'cube': {
            const depth = Math.min(nodeW, nodeH) * 0.25;
            return { x: 0, y: depth, width: nodeW - depth, height: nodeH - depth };
        }
        case 'cloud':
            return { x: nodeW * 0.25, y: nodeH * 0.3, width: nodeW * 0.5, height: nodeH * 0.4 };
        case 'callout': {
            const bodyH = nodeH * 0.75;
            return { x: 0, y: 0, width: nodeW, height: bodyH };
        }
        case 'arrow-right':
        case 'chevron-right':
            return { x: 0, y: nodeH * 0.25, width: nodeW * 0.55, height: nodeH * 0.5 };
        case 'arrow-left':
            return { x: nodeW * 0.45, y: nodeH * 0.25, width: nodeW * 0.55, height: nodeH * 0.5 };
        case 'arrow-up':
            return { x: nodeW * 0.25, y: nodeH * 0.4, width: nodeW * 0.5, height: nodeH * 0.55 };
        case 'arrow-down':
            return { x: nodeW * 0.25, y: 0, width: nodeW * 0.5, height: nodeH * 0.55 };
        case 'double-arrow':
            return { x: nodeW * 0.2, y: nodeH * 0.25, width: nodeW * 0.6, height: nodeH * 0.5 };
        case 'document':
            return { x: 0, y: 0, width: nodeW, height: nodeH * 0.75 };
        case 'sticky-note':
            return { x: nodeW * 0.05, y: nodeH * 0.05, width: nodeW * 0.8, height: nodeH * 0.85 };
        case 'tag':
            return { x: 0, y: 0, width: nodeW * 0.75, height: nodeH };
        case 'actor':
            return { x: 0, y: nodeH * 0.65, width: nodeW, height: nodeH * 0.35 };
        case 'rectangle':
        case 'rounded-rectangle':
        case 'text':
        default:
            return { x: 0, y: 0, width: nodeW, height: nodeH };
    }
}

// ─── CONNECTION POINTS / PORTS ──────────────────────────────────────────────
export const SHAPE_PORT_IDS = ['T1', 'T', 'T3', 'B1', 'B', 'B3', 'L1', 'L', 'L3', 'R1', 'R', 'R3'];

const PORT_TARGET_FRAC = {
    T1: { x: 0.25, y: 0 }, T: { x: 0.5, y: 0 }, T3: { x: 0.75, y: 0 },
    B1: { x: 0.25, y: 1 }, B: { x: 0.5, y: 1 }, B3: { x: 0.75, y: 1 },
    L1: { x: 0, y: 0.25 }, L: { x: 0, y: 0.5 }, L3: { x: 0, y: 0.75 },
    R1: { x: 1, y: 0.25 }, R: { x: 1, y: 0.5 }, R3: { x: 1, y: 0.75 },
};

function raySegmentIntersect(cx, cy, dx, dy, x1, y1, x2, y2) {
    const ex = x2 - x1, ey = y2 - y1;
    const denom = ex * dy - ey * dx;
    if (Math.abs(denom) < 1e-9) return null;
    const t = (ex * (y1 - cy) - ey * (x1 - cx)) / denom;
    const s = (dx * (y1 - cy) - dy * (x1 - cx)) / denom;
    if (t < 0 || s < -1e-6 || s > 1 + 1e-6) return null;
    return { x: cx + t * dx, y: cy + t * dy, t };
}

function rayPolygonIntersect(points, cx, cy, dx, dy) {
    let best = null;
    for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        const hit = raySegmentIntersect(cx, cy, dx, dy, x1, y1, x2, y2);
        if (hit && hit.t > 1e-6 && (!best || hit.t < best.t)) best = hit;
    }
    return best ? { x: best.x, y: best.y } : { x: cx, y: cy };
}

const PORT_POLYGON_GETTERS = {
    rectangle: rectPointList,
    'rounded-rectangle': rectPointList,
    text: rectPointList,
    diamond: diamondPointList,
    parallelogram: parallelogramPointList,
    trapezoid: trapezoidPointList,
    hexagon: hexagonPointList,
    pentagon: (w, h) => regularPolygonPointList(w, h, 5),
    heptagon: (w, h) => regularPolygonPointList(w, h, 7),
    octagon: octagonPointList,
    triangle: trianglePointList,
    'right-triangle': rightTrianglePointList,
    star: (w, h) => starNPointList(w, h, 5, 0.382),
    'star-4': (w, h) => starNPointList(w, h, 4, 0.35),
    'star-6': (w, h) => starNPointList(w, h, 6, 0.45),
    badge: (w, h) => starNPointList(w, h, 12, 0.82),
    cross: crossPointList,
    'arrow-right': arrowRightPointList,
    'arrow-left': arrowLeftPointList,
    'arrow-up': arrowUpPointList,
    'arrow-down': arrowDownPointList,
    'double-arrow': doubleArrowPointList,
    'chevron-right': chevronRightPointList,
    'arrow-pentagon': arrowPentagonPointList,
    tag: tagPointList,
    'manual-input': manualInputPointList,
    'manual-operation': manualOperationPointList,
    preparation: preparationPointList,
    delay: delayPointList,
    display: displayPointList,
    lightning: lightningPointList,
    heart: heartPointList,
};

function portsForPolygon(getPoints, w, h) {
    const cx = w / 2, cy = h / 2;
    const poly = getPoints(w, h);
    const result = {};
    SHAPE_PORT_IDS.forEach(id => {
        const { x: fx, y: fy } = PORT_TARGET_FRAC[id];
        const dx = fx * w - cx, dy = fy * h - cy;
        result[id] = (dx === 0 && dy === 0) ? { x: cx, y: cy } : rayPolygonIntersect(poly, cx, cy, dx, dy);
    });
    return result;
}

function portsForEllipse(w, h) {
    const rx = w / 2, ry = h / 2, cx = rx, cy = ry;
    const result = {};
    SHAPE_PORT_IDS.forEach(id => {
        const { x: fx, y: fy } = PORT_TARGET_FRAC[id];
        const dx = fx * w - cx, dy = fy * h - cy;
        if (dx === 0 && dy === 0) { result[id] = { x: cx, y: cy }; return; }
        const t = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
        result[id] = { x: cx + t * dx, y: cy + t * dy };
    });
    return result;
}

function portsForCylinder(w, h) {
    const r = Math.min(10, h / 4);
    const result = {};
    SHAPE_PORT_IDS.forEach(id => {
        const { x: fx, y: fy } = PORT_TARGET_FRAC[id];
        if (fy === 0) {
            const nx = 2 * fx - 1;
            const y = r - r * Math.sqrt(Math.max(0, 1 - nx * nx));
            result[id] = { x: fx * w, y };
        } else if (fy === 1) {
            result[id] = { x: fx * w, y: h };
        } else {
            result[id] = { x: fx * w, y: r + fy * (h - 2 * r) };
        }
    });
    return result;
}

export function getShapeConnectionPoints(type, nodeW, nodeH) {
    if (type === 'ellipse' || type === 'circle' || type === 'semicircle' || type === 'summing-junction' || type === 'or-node') {
        return portsForEllipse(nodeW, nodeH);
    }
    if (type === 'cylinder' || type === 'database') return portsForCylinder(nodeW, nodeH);

    const polyGetter = PORT_POLYGON_GETTERS[type] || PORT_POLYGON_GETTERS.rectangle;
    return portsForPolygon(polyGetter, nodeW, nodeH);
}

// ─── SHAPE CATEGORIES & TYPES ───────────────────────────────────────────────
export const SHAPE_CATEGORIES = [
    {
        id: 'basic',
        label: 'Basic Shapes',
        shapes: [
            { id: 'rectangle', label: 'Rectangle' },
            { id: 'rounded-rectangle', label: 'Rounded Rectangle' },
            { id: 'ellipse', label: 'Ellipse' },
            { id: 'circle', label: 'Circle' },
            { id: 'semicircle', label: 'Semicircle' },
            { id: 'triangle', label: 'Triangle' },
            { id: 'right-triangle', label: 'Right Triangle' },
            { id: 'diamond', label: 'Diamond' },
            { id: 'parallelogram', label: 'Parallelogram' },
            { id: 'trapezoid', label: 'Trapezoid' },
            { id: 'pentagon', label: 'Pentagon' },
            { id: 'hexagon', label: 'Hexagon' },
            { id: 'heptagon', label: 'Heptagon' },
            { id: 'octagon', label: 'Octagon' },
            { id: 'cross', label: 'Cross / Plus' },
            { id: 'heart', label: 'Heart' },
            { id: 'star', label: '5-Point Star' },
            { id: 'star-4', label: '4-Point Star' },
            { id: 'star-6', label: '6-Point Star' },
            { id: 'badge', label: 'Badge / Burst' },
        ]
    },
    {
        id: 'flowchart',
        label: 'Flowchart Symbols',
        shapes: [
            { id: 'document', label: 'Document' },
            { id: 'multidocument', label: 'Multi-Document' },
            { id: 'predefined-process', label: 'Predefined Process' },
            { id: 'internal-storage', label: 'Internal Storage' },
            { id: 'database', label: 'Database / Disk' },
            { id: 'delay', label: 'Delay' },
            { id: 'display', label: 'Display' },
            { id: 'manual-input', label: 'Manual Input' },
            { id: 'manual-operation', label: 'Manual Operation' },
            { id: 'preparation', label: 'Preparation' },
            { id: 'summing-junction', label: 'Summing Junction' },
            { id: 'or-node', label: 'OR Node' },
        ]
    },
    {
        id: 'arrows',
        label: 'Block Arrows',
        shapes: [
            { id: 'arrow-right', label: 'Arrow Right' },
            { id: 'arrow-left', label: 'Arrow Left' },
            { id: 'arrow-up', label: 'Arrow Up' },
            { id: 'arrow-down', label: 'Arrow Down' },
            { id: 'double-arrow', label: 'Double Arrow' },
            { id: 'chevron-right', label: 'Chevron' },
            { id: 'arrow-pentagon', label: 'Pentagon Arrow' },
        ]
    },
    {
        id: 'diagrams',
        label: '3D & Diagramming',
        shapes: [
            { id: 'cylinder', label: 'Cylinder' },
            { id: 'cube', label: 'Cube (3D Box)' },
            { id: 'cloud', label: 'Cloud' },
            { id: 'callout', label: 'Callout' },
            { id: 'sticky-note', label: 'Sticky Note' },
            { id: 'tag', label: 'Tag' },
            { id: 'lightning', label: 'Lightning' },
            { id: 'actor', label: 'UML Actor' },
        ]
    }
];

// Flat export of all shapes for backwards compatibility & quick searches
export const SHAPE_TYPES = SHAPE_CATEGORIES.flatMap(cat => cat.shapes);

// ─── SHAPE ICON ─────────────────────────────────────────────────────────────
export function ShapeIcon({ type, boxSize = 22 }) {
    const { w: defW, h: defH } = getShapeDefaultSize(type, 120, 40);
    const scale = boxSize / Math.max(defW, defH);
    const iw = defW * scale;
    const ih = defH * scale;
    const ox = (24 - iw) / 2;
    const oy = (24 - ih) / 2;
    return (
        <svg width="24" height="24" viewBox="0 0 24 24">
            <g transform={`translate(${ox}, ${oy})`}>
                {getShapeSVG(type, iw, ih, { fill: 'none', stroke: 'currentColor', strokeWidth: 1 })}
            </g>
        </svg>
    );
}