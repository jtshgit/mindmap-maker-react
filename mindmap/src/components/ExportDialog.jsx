import React, { useState, useCallback, useEffect } from 'react';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import {
    X,
    ChevronDown,
    ChevronRight,
    Download,
    Loader2,
    Settings2,
    Eye,
    Sun,
    Moon,
    FileCheck
} from 'lucide-react';

const isBlackColor = (c) =>
    c === '#000' ||
    c === '#000000' ||
    c === '#000000ff' ||
    c === 'black' ||
    c === 'rgb(0, 0, 0)' ||
    c === 'rgba(0, 0, 0, 1)';

const isWhiteColor = (c) =>
    c === '#fff' ||
    c === '#ffffff' ||
    c === '#ffffffff' ||
    c === 'white' ||
    c === 'rgb(255, 255, 255)' ||
    c === 'rgba(255, 255, 255, 1)';

export default function ExportDialog({
    isOpen,
    format = 'png',
    onClose,
    nodes,
    edges,
    svgRef,
    canvasSettings,
    canvasConfig,
    downloadFile,
    theme = 'light'
}) {
    const isAppDark = theme === 'dark';

    const [size, setSize] = useState('Diagram'); // 'Diagram' or 'Page'
    const [transparent, setTransparent] = useState(false);
    const [includeCopy, setIncludeCopy] = useState(true);
    const [zoom, setZoom] = useState('100%');
    const [isExporting, setIsExporting] = useState(false);

    // Advanced Options (Collapsed by default)
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [exportWidth, setExportWidth] = useState(293);
    const [exportHeight, setExportHeight] = useState(98);
    const [dpi, setDpi] = useState('100dpi');
    const [borderWidth, setBorderWidth] = useState('0');
    const [shadow, setShadow] = useState(false);
    const [grid, setGrid] = useState(false);

    const [exportDark, setExportDark] = useState(isAppDark);
    const [previewSrc, setPreviewSrc] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    useEffect(() => {
        if (isOpen) setExportDark(isAppDark);
    }, [isOpen, isAppDark]);

    const getBounds = useCallback(() => {
        const pageW =
            canvasSettings.orientation === 'landscape'
                ? canvasSettings.width
                : canvasSettings.height;
        const pageH =
            canvasSettings.orientation === 'landscape'
                ? canvasSettings.height
                : canvasSettings.width;

        let bounds = { x: 0, y: 0, width: pageW, height: pageH };

        if (size === 'Diagram') {
            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;

            nodes.forEach((n) => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + (n.width || 120));
                maxY = Math.max(maxY, n.y + (n.height || 40));
            });

            edges.forEach((e) => {
                e.waypoints?.forEach((wp) => {
                    minX = Math.min(minX, wp.x);
                    minY = Math.min(minY, wp.y);
                    maxX = Math.max(maxX, wp.x);
                    maxY = Math.max(maxY, wp.y);
                });
            });

            if (minX === Infinity) {
                minX = 0;
                minY = 0;
                maxX = 800;
                maxY = 600;
            }

            const padding = 40;
            bounds = {
                x: minX - padding,
                y: minY - padding,
                width: maxX - minX + padding * 2,
                height: maxY - minY + padding * 2
            };
        }
        return bounds;
    }, [size, nodes, edges, canvasSettings]);

    useEffect(() => {
        if (!isOpen) return;
        const b = getBounds();
        const zf = parseInt(zoom, 10) / 100;
        setExportWidth(Math.round(b.width * zf));
        setExportHeight(Math.round(b.height * zf));
    }, [isOpen, getBounds, zoom]);

    const buildExportContainer = useCallback(
        (finalWidth, finalHeight, zoomFactor, bounds) => {
            const effectiveBg = exportDark
                ? '#000000'
                : canvasConfig.backgroundColor || '#ffffff';

            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '0px';
            container.style.top = '-99999px';
            container.style.zIndex = '-9999';
            container.style.width = `${finalWidth}px`;
            container.style.height = `${finalHeight}px`;
            container.style.background = transparent ? 'transparent' : effectiveBg;
            document.body.appendChild(container);

            const svgClone = svgRef.current.cloneNode(true);
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

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

                if (isAppDark && !exportDark) {
                    const shapesGroup =
                        svgClone.querySelector('#mindmap-bounds') || rootG;
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
                }
            }

            svgClone.style.width = '100%';
            svgClone.style.height = '100%';
            svgClone.setAttribute('viewBox', `0 0 ${finalWidth} ${finalHeight}`);
            container.appendChild(svgClone);

            return { container, svgClone, effectiveBg };
        },
        [canvasConfig, transparent, shadow, grid, size, exportDark, isAppDark, svgRef]
    );

    // Live preview generation
    useEffect(() => {
        if (!isOpen || !svgRef.current) return;
        let cancelled = false;
        setIsPreviewLoading(true);

        const timer = setTimeout(async () => {
            try {
                const bounds = getBounds();
                const zoomFactor = parseInt(zoom, 10) / 100;
                const rawW = Math.max(1, Math.round(bounds.width * zoomFactor));
                const rawH = Math.max(1, Math.round(bounds.height * zoomFactor));
                const maxDim = 450;
                const scaleDown = Math.min(1, maxDim / Math.max(rawW, rawH));
                const pw = Math.max(1, Math.round(rawW * scaleDown));
                const ph = Math.max(1, Math.round(rawH * scaleDown));

                const { container, effectiveBg } = buildExportContainer(
                    pw,
                    ph,
                    zoomFactor * scaleDown,
                    bounds
                );

                await new Promise((r) => setTimeout(r, 60));
                const dataUrl = await domtoimage.toPng(container, {
                    quality: 1,
                    bgcolor: transparent ? null : effectiveBg,
                    width: pw,
                    height: ph
                });

                document.body.removeChild(container);
                if (!cancelled) {
                    setPreviewSrc(dataUrl);
                    setIsPreviewLoading(false);
                }
            } catch (e) {
                if (!cancelled) {
                    setPreviewSrc(null);
                    setIsPreviewLoading(false);
                }
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        isOpen,
        zoom,
        size,
        transparent,
        grid,
        shadow,
        exportDark,
        canvasConfig,
        nodes,
        edges,
        getBounds,
        buildExportContainer,
        svgRef
    ]);

    if (!isOpen) return null;

    const handleExecuteExport = async () => {
        setIsExporting(true);
        const bounds = getBounds();
        const zoomFactor = parseInt(zoom, 10) / 100;
        const finalWidth =
            parseInt(exportWidth, 10) || Math.round(bounds.width * zoomFactor);
        const finalHeight =
            parseInt(exportHeight, 10) || Math.round(bounds.height * zoomFactor);

        const { container, svgClone, effectiveBg } = buildExportContainer(
            finalWidth,
            finalHeight,
            zoomFactor,
            bounds
        );

        await new Promise((r) => setTimeout(r, 200));

        try {
            if (format === 'svg') {
                const serializer = new XMLSerializer();
                const source = serializer.serializeToString(svgClone);
                const xmlData =
                    '<?xml version="1.0" standalone="no"?>\r\n' + source;
                downloadFile(xmlData, 'mindmap.svg', 'image/svg+xml;charset=utf-8');
            } else if (format === 'png' || format === 'jpeg') {
                const method = format === 'png' ? domtoimage.toPng : domtoimage.toJpeg;
                const dataUrl = await method(container, {
                    quality: 1,
                    bgcolor: transparent ? null : effectiveBg,
                    width: finalWidth,
                    height: finalHeight
                });
                const link = document.createElement('a');
                link.download = `mindmap.${format}`;
                link.href = dataUrl;
                link.click();
            } else if (format === 'pdf') {
                const dataUrl = await domtoimage.toPng(container, {
                    bgcolor: transparent ? null : effectiveBg,
                    width: finalWidth,
                    height: finalHeight
                });
                const pdf = new jsPDF({
                    orientation: finalWidth > finalHeight ? 'l' : 'p',
                    unit: 'px',
                    format: [finalWidth, finalHeight]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, finalWidth, finalHeight);
                pdf.save('mindmap.pdf');
            }
        } catch (e) {
            alert('Export failed: ' + e.message);
        } finally {
            document.body.removeChild(container);
            setIsExporting(false);
            onClose();
        }
    };

    const previewBgStyle = transparent
        ? {
            backgroundImage:
                'linear-gradient(45deg, #1e1e1e 25%, transparent 25%), linear-gradient(-45deg, #1e1e1e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e1e1e 75%), linear-gradient(-45deg, transparent 75%, #1e1e1e 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#121212'
        }
        : {
            backgroundColor: exportDark
                ? '#000000'
                : canvasConfig.backgroundColor || '#ffffff'
        };

    return (
        <div
            className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
            onPointerDown={onClose}
        >
            <div
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Download className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white tracking-wide">
                                Export Diagram
                            </h2>
                            <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-mono">
                                Format: {format.toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Main Landscape Body */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                    {/* Left Side: Live Preview Panel */}
                    <div className="md:col-span-7 bg-neutral-950 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-800 relative min-h-[280px]">
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Eye className="w-3.5 h-3.5 text-neutral-500" /> Preview
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono">
                                {exportWidth} × {exportHeight} px
                            </span>
                        </div>

                        {/* Preview Display Container */}
                        <div
                            className="flex-1 rounded-xl border border-neutral-800/80 overflow-hidden flex items-center justify-center relative p-4 transition-colors min-h-[200px]"
                            style={previewBgStyle}
                        >
                            {isPreviewLoading && (
                                <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-neutral-300 z-10">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                    Updating preview...
                                </div>
                            )}

                            {previewSrc ? (
                                <img
                                    src={previewSrc}
                                    alt="Export preview"
                                    className="max-w-full max-h-[280px] object-contain drop-shadow-md transition-all"
                                />
                            ) : (
                                <span className="text-xs text-neutral-500 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Generating preview...
                                </span>
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
                            <span>WYSIWYG Live Render</span>
                            <span>Zoom: {zoom}</span>
                        </div>
                    </div>

                    {/* Right Side: Options & Settings Panel */}
                    <div className="md:col-span-5 p-6 overflow-y-auto flex flex-col justify-between gap-6 bg-neutral-900/50">
                        <div className="space-y-4">
                            {/* Option Group 1: Output Config */}
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                                    General Settings
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-neutral-300">
                                            Export Scope
                                        </label>
                                        <select
                                            value={size}
                                            onChange={(e) => setSize(e.target.value)}
                                            className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="Diagram">Diagram Bounds</option>
                                            <option value="Page">Full Canvas Page</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-neutral-300">
                                            Scale Zoom
                                        </label>
                                        <select
                                            value={zoom}
                                            onChange={(e) => setZoom(e.target.value)}
                                            className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="50%">50%</option>
                                            <option value="100%">100%</option>
                                            <option value="200%">200%</option>
                                            <option value="400%">400%</option>
                                        </select>
                                    </div>
                                </div>

                                {isAppDark && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-neutral-300">
                                            Theme Appearance
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setExportDark(true)}
                                                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${exportDark
                                                        ? 'bg-neutral-800 text-white border-blue-500/50 shadow-sm'
                                                        : 'bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                                                    }`}
                                            >
                                                <Moon className="w-3.5 h-3.5 text-blue-400" /> Dark
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setExportDark(false)}
                                                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${!exportDark
                                                        ? 'bg-neutral-800 text-white border-blue-500/50 shadow-sm'
                                                        : 'bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                                                    }`}
                                            >
                                                <Sun className="w-3.5 h-3.5 text-amber-400" /> Light
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Option Group 2: Toggles */}
                            <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                                <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer select-none py-1">
                                    <input
                                        type="checkbox"
                                        checked={transparent}
                                        onChange={(e) => setTransparent(e.target.checked)}
                                        className="rounded bg-neutral-800 border-neutral-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                                    />
                                    Transparent Background
                                </label>

                                <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer select-none py-1">
                                    <input
                                        type="checkbox"
                                        checked={includeCopy}
                                        onChange={(e) => setIncludeCopy(e.target.checked)}
                                        className="rounded bg-neutral-800 border-neutral-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                                    />
                                    Embed editable diagram copy
                                </label>
                            </div>

                            {/* Collapsible Advanced Accordion */}
                            <div className="pt-2 border-t border-neutral-800/80">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Settings2 className="w-3.5 h-3.5" /> Advanced Options
                                    </span>
                                    {showAdvanced ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                </button>

                                {showAdvanced && (
                                    <div className="mt-3 space-y-3 pl-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-neutral-400">Width (px)</label>
                                                <input
                                                    type="number"
                                                    value={exportWidth}
                                                    onChange={(e) => setExportWidth(e.target.value)}
                                                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-neutral-400">Height (px)</label>
                                                <input
                                                    type="number"
                                                    value={exportHeight}
                                                    onChange={(e) => setExportHeight(e.target.value)}
                                                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-neutral-400">DPI Density</label>
                                                <select
                                                    value={dpi}
                                                    onChange={(e) => setDpi(e.target.value)}
                                                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="100dpi">100 DPI</option>
                                                    <option value="200dpi">200 DPI</option>
                                                    <option value="300dpi">300 DPI</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-neutral-400">Border Width</label>
                                                <input
                                                    type="number"
                                                    value={borderWidth}
                                                    onChange={(e) => setBorderWidth(e.target.value)}
                                                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-1">
                                            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={shadow}
                                                    onChange={(e) => setShadow(e.target.checked)}
                                                    className="rounded bg-neutral-800 border-neutral-700 text-blue-600 focus:ring-0"
                                                />
                                                Include Shadow
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={grid}
                                                    onChange={(e) => setGrid(e.target.checked)}
                                                    className="rounded bg-neutral-800 border-neutral-700 text-blue-600 focus:ring-0"
                                                />
                                                Include Grid
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/90 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700/60 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleExecuteExport}
                        disabled={isExporting}
                        className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileCheck className="w-3.5 h-3.5" />
                                Download File
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}