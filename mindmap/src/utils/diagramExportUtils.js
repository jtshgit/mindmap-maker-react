import React, { useCallback } from 'react';
import domtoimage from 'dom-to-image-more';
import EdgeMarkerDefs from '../components/shapes/EdgeMarkerDefs';
import ConnectionLine from '../components/shapes/ConnectionLine';
import ShapeNode from '../components/shapes/ShapeNode';
import { useConnectionMath } from './connectionMath';

/* -------------------------------------------------------------------------- */
/*                            Color & Style Helpers                           */
/* -------------------------------------------------------------------------- */

export const isBlackColor = (c) => {
    if (!c) return false;
    const str = c.toString().trim().toLowerCase();
    return (
        str === '#000' ||
        str === '#000000' ||
        str === '#000000ff' ||
        str === 'black' ||
        str === 'rgb(0, 0, 0)' ||
        str === 'rgba(0, 0, 0, 1)'
    );
};

export const isWhiteColor = (c) => {
    if (!c) return false;
    const str = c.toString().trim().toLowerCase();
    return (
        str === '#fff' ||
        str === '#ffffff' ||
        str === '#ffffffff' ||
        str === 'white' ||
        str === 'rgb(255, 255, 255)' ||
        str === 'rgba(255, 255, 255, 1)'
    );
};

/* -------------------------------------------------------------------------- */
/*                            Bounds Calculator                               */
/* -------------------------------------------------------------------------- */

export function getDiagramBounds(nodes = [], edges = [], options = {}) {
    const {
        padding = 40,
        defaultWidth = 800,
        defaultHeight = 600,
        defaultNodeW = 120,
        defaultNodeH = 40
    } = options;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    (nodes || []).forEach((n) => {
        const nw = n.width || defaultNodeW;
        const nh = n.height || defaultNodeH;
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + nw);
        maxY = Math.max(maxY, n.y + nh);
    });

    (edges || []).forEach((e) => {
        (e.waypoints || []).forEach((wp) => {
            minX = Math.min(minX, wp.x);
            minY = Math.min(minY, wp.y);
            maxX = Math.max(maxX, wp.x);
            maxY = Math.max(maxY, wp.y);
        });
        if (e.sourcePoint) {
            minX = Math.min(minX, e.sourcePoint.x);
            minY = Math.min(minY, e.sourcePoint.y);
            maxX = Math.max(maxX, e.sourcePoint.x);
            maxY = Math.max(maxY, e.sourcePoint.y);
        }
        if (e.targetPoint) {
            minX = Math.min(minX, e.targetPoint.x);
            minY = Math.min(minY, e.targetPoint.y);
            maxX = Math.max(maxX, e.targetPoint.x);
            maxY = Math.max(maxY, e.targetPoint.y);
        }
    });

    if (minX === Infinity) {
        minX = 0;
        minY = 0;
        maxX = defaultWidth;
        maxY = defaultHeight;
    }

    return {
        x: minX - padding,
        y: minY - padding,
        width: Math.max(10, maxX - minX + padding * 2),
        height: Math.max(10, maxY - minY + padding * 2)
    };
}

/* -------------------------------------------------------------------------- */
/*                        DOM Export Container Builder                        */
/* -------------------------------------------------------------------------- */

export function buildExportContainer({
    svgElement,
    finalWidth,
    finalHeight,
    zoomFactor = 1,
    bounds,
    borderPx = 0,
    exportDark = false,
    isAppDark = false,
    canvasConfig = {},
    transparent = false,
    shadow = false,
    grid = false,
    size = 'Diagram'
}) {
    if (!svgElement) {
        throw new Error('SVG element is required to build export container');
    }

    const effectiveBg = exportDark
        ? '#000000'
        : (canvasConfig && canvasConfig.backgroundColor) || '#ffffff';

    const outerWidth = finalWidth + borderPx * 2;
    const outerHeight = finalHeight + borderPx * 2;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0px';
    container.style.top = '-99999px';
    container.style.zIndex = '-9999';
    container.style.boxSizing = 'border-box';
    container.style.width = `${outerWidth}px`;
    container.style.height = `${outerHeight}px`;
    container.style.background = transparent ? 'transparent' : effectiveBg;
    if (borderPx > 0) {
        container.style.border = `${borderPx}px solid ${exportDark ? '#ffffff' : '#000000'}`;
    }
    document.body.appendChild(container);

    const svgClone = svgElement.cloneNode(true);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/1999/svg');

    // Ensure all HTML elements inside <foreignObject> have explicit xmlns for dom-to-image
    svgClone.querySelectorAll('foreignObject').forEach((fo) => {
        Array.from(fo.children).forEach((child) => {
            if (!child.hasAttribute('xmlns')) {
                child.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            }
        });
    });

    const rootG = svgClone.querySelector('g');
    if (rootG) {
        rootG.setAttribute(
            'transform',
            `scale(${zoomFactor}) translate(${-bounds.x}, ${-bounds.y})`
        );

        const shadowEl = svgClone.querySelector('[data-role="canvas-shadow"]');
        const bgEl = svgClone.querySelector('[data-role="canvas-bg"]');
        const gridEl = svgClone.querySelector('[data-role="canvas-grid"]');

        if (bgEl) bgEl.setAttribute('fill', effectiveBg);
        if (!shadow && shadowEl) shadowEl.style.display = 'none';
        if (!grid && gridEl) gridEl.style.display = 'none';

        if (size === 'Diagram') {
            if (shadowEl) shadowEl.style.display = 'none';
            if (bgEl) bgEl.style.display = 'none';
            if (gridEl) gridEl.style.display = 'none';
        }

        // Color inversion between app theme and export theme
        if (isAppDark && !exportDark) {
            const shapesGroup = svgClone.querySelector('#mindmap-bounds') || rootG;
            shapesGroup.querySelectorAll('[stroke]').forEach((el) => {
                const c = (el.getAttribute('stroke') || '').trim().toLowerCase();
                if (isWhiteColor(c)) {
                    el.setAttribute('stroke', '#000000');
                }
            });
            shapesGroup.querySelectorAll('[fill]').forEach((el) => {
                const c = (el.getAttribute('fill') || '').trim().toLowerCase();
                if (isBlackColor(c)) {
                    el.setAttribute('fill', '#ffffff');
                }
            });
            shapesGroup.querySelectorAll('[style]').forEach((el) => {
                const c = (el.style.color || '').trim().toLowerCase();
                if (isWhiteColor(c)) {
                    el.style.color = '#000000';
                }
            });
        } else if (!isAppDark && exportDark) {
            const shapesGroup = svgClone.querySelector('#mindmap-bounds') || rootG;
            shapesGroup.querySelectorAll('[stroke]').forEach((el) => {
                const c = (el.getAttribute('stroke') || '').trim().toLowerCase();
                if (isBlackColor(c)) {
                    el.setAttribute('stroke', '#ffffff');
                }
            });
            shapesGroup.querySelectorAll('[fill]').forEach((el) => {
                const c = (el.getAttribute('fill') || '').trim().toLowerCase();
                if (isWhiteColor(c)) {
                    el.setAttribute('fill', '#000000');
                }
            });
            shapesGroup.querySelectorAll('[style]').forEach((el) => {
                const c = (el.style.color || '').trim().toLowerCase();
                if (isBlackColor(c)) {
                    el.style.color = '#ffffff';
                }
            });
        }
    }

    svgClone.setAttribute('width', String(finalWidth));
    svgClone.setAttribute('height', String(finalHeight));
    svgClone.setAttribute('viewBox', `0 0 ${finalWidth} ${finalHeight}`);
    svgClone.style.position = 'absolute';
    svgClone.style.left = `${borderPx}px`;
    svgClone.style.top = `${borderPx}px`;
    svgClone.style.width = `${finalWidth}px`;
    svgClone.style.height = `${finalHeight}px`;
    container.appendChild(svgClone);

    return { container, svgClone, effectiveBg, outerWidth, outerHeight };
}

/* -------------------------------------------------------------------------- */
/*                       Standard Diagram Preview Generator                    */
/* -------------------------------------------------------------------------- */

export async function generateDiagramPreview({
    svgElement,
    nodes = [],
    edges = [],
    canvasConfig = {},
    isAppDark = false,
    exportDark = false,
    transparent = false,
    maxDimension = 480,
    bounds: customBounds = null
}) {
    if (!svgElement) {
        throw new Error('SVG element is required to generate preview');
    }

    const bounds = customBounds || getDiagramBounds(nodes, edges);
    const rawW = Math.max(1, Math.round(bounds.width));
    const rawH = Math.max(1, Math.round(bounds.height));
    const scaleDown = Math.min(1, maxDimension / Math.max(rawW, rawH, 1));
    const pw = Math.max(1, Math.round(rawW * scaleDown));
    const ph = Math.max(1, Math.round(rawH * scaleDown));

    const { container, svgClone, effectiveBg } = buildExportContainer({
        svgElement,
        finalWidth: pw,
        finalHeight: ph,
        zoomFactor: scaleDown,
        bounds,
        borderPx: 0,
        exportDark,
        isAppDark,
        canvasConfig,
        transparent,
        shadow: false,
        grid: false,
        size: 'Diagram'
    });

    try {
        await new Promise((r) => setTimeout(r, 60));
        const dataUrl = await domtoimage.toPng(container, {
            quality: 1,
            bgcolor: transparent ? null : effectiveBg,
            width: pw,
            height: ph
        });
        return dataUrl;
    } catch (err) {
        // Fallback to SVG data URL if DOM rasterization fails
        try {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgClone);
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        } catch {
            throw err;
        }
    } finally {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
}

/* -------------------------------------------------------------------------- */
/*                 Static Diagram SVG Offscreen React Component                */
/* -------------------------------------------------------------------------- */

export const DiagramStaticSvg = React.forwardRef(function DiagramStaticSvg(
    {
        nodes = [],
        edges = [],
        canvasConfig = {},
        bounds,
        scale = 1,
        width,
        height,
        isDark = false
    },
    ref
) {
    const { getFullLine, getPortCoord } = useConnectionMath({ nodes, edges });

    const flipColorForTheme = useCallback(
        (color) => {
            if (!isDark) return color;
            const c = (color || '').toString().trim().toLowerCase();
            if (c === '#000' || c === '#000000' || c === '#000000ff' || c === 'black') return '#ffffff';
            if (c === '#fff' || c === '#ffffff' || c === '#ffffffff' || c === 'white') return '#000000';
            return color;
        },
        [isDark]
    );

    const effectiveBounds = bounds || getDiagramBounds(nodes, edges);
    const svgW = width || Math.max(1, Math.round(effectiveBounds.width * scale));
    const svgH = height || Math.max(1, Math.round(effectiveBounds.height * scale));
    const effectiveBg = isDark
        ? '#000000'
        : (canvasConfig && canvasConfig.backgroundColor) || '#ffffff';

    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{
                width: `${svgW}px`,
                height: `${svgH}px`,
                backgroundColor: effectiveBg,
                display: 'block'
            }}
        >
            <defs>
                <EdgeMarkerDefs edges={edges} flipColorForTheme={flipColorForTheme} />
            </defs>
            <g
                id="mindmap-bounds"
                transform={`scale(${scale}) translate(${-effectiveBounds.x}, ${-effectiveBounds.y})`}
            >
                {edges.map((edge) => {
                    const frozenPts =
                        edge.waypoints && edge.waypoints.length >= 2
                            ? edge.waypoints
                            : getFullLine(edge);
                    if (!frozenPts || frozenPts.length < 2) return null;
                    return (
                        <ConnectionLine
                            key={edge.id}
                            edge={edge}
                            frozenPts={frozenPts}
                            isSelected={false}
                            isDraftingThis={false}
                            showEditingUI={false}
                            mode="select"
                            sf={1}
                            flipColorForTheme={flipColorForTheme}
                        />
                    );
                })}

                {nodes.map((node) => (
                    <ShapeNode
                        key={node.id}
                        node={node}
                        isSelected={false}
                        showPorts={false}
                        showEditingUI={false}
                        mode="select"
                        sf={1}
                        edges={edges}
                        isEditingText={false}
                        flipColorForTheme={flipColorForTheme}
                        getPortCoord={getPortCoord}
                    />
                ))}
            </g>
        </svg>
    );
});
