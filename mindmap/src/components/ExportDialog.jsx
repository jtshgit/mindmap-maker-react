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
            canvasSettings?.orientation === 'landscape'
                ? canvasSettings?.width
                : canvasSettings?.height;
        const pageH =
            canvasSettings?.orientation === 'landscape'
                ? canvasSettings?.height
                : canvasSettings?.width;

        let bounds = { x: 0, y: 0, width: pageW || 800, height: pageH || 600 };

        if (size === 'Diagram') {
            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;

            nodes?.forEach((n) => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + (n.width || 120));
                maxY = Math.max(maxY, n.y + (n.height || 40));
            });

            edges?.forEach((e) => {
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
                : canvasConfig?.backgroundColor || '#ffffff';

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
            svgClone.setAttribute('xmlns', 'http://www.w3.org/1999/svg');

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
            backgroundImage: isAppDark
                ? 'linear-gradient(45deg, #282828 25%, transparent 25%), linear-gradient(-45deg, #282828 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #282828 75%), linear-gradient(-45deg, transparent 75%, #282828 75%)'
                : 'linear-gradient(45deg, #E1DFDD 25%, transparent 25%), linear-gradient(-45deg, #E1DFDD 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E1DFDD 75%), linear-gradient(-45deg, transparent 75%, #E1DFDD 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: isAppDark ? '#1B1A19' : '#F3F2F1'
        }
        : {
            backgroundColor: exportDark
                ? '#000000'
                : canvasConfig?.backgroundColor || '#ffffff'
        };

    // Microsoft Fluent / Clean & Simple design tokens
    const fluentStyles = {
        container: isAppDark
            ? 'bg-[#201F1E] border-[#3B3A39] text-[#F3F2F1]'
            : 'bg-white border-[#E1DFDD] text-[#252423]',
        header: isAppDark
            ? 'border-[#3B3A39] bg-[#292827]'
            : 'border-[#E1DFDD] bg-[#FAF9F8]',
        title: isAppDark ? 'text-white' : 'text-[#252423]',
        subtitle: isAppDark ? 'text-[#A19F9D]' : 'text-[#605E5C]',
        closeBtn: isAppDark
            ? 'text-[#A19F9D] hover:text-white hover:bg-[#323130]'
            : 'text-[#605E5C] hover:text-[#252423] hover:bg-[#EDEBE9]',
        previewContainer: isAppDark
            ? 'bg-[#1B1A19] border-[#3B3A39]'
            : 'bg-[#FAF9F8] border-[#E1DFDD]',
        previewBorder: isAppDark ? 'border-[#323130]' : 'border-[#E1DFDD]',
        previewLoaderBg: isAppDark ? 'bg-[#201F1E]/80 text-[#F3F2F1]' : 'bg-white/80 text-[#252423]',
        sidebar: isAppDark ? 'bg-[#201F1E]' : 'bg-white',
        sectionHeader: isAppDark ? 'text-[#A19F9D]' : 'text-[#605E5C]',
        label: isAppDark ? 'text-[#F3F2F1]' : 'text-[#323130]',
        input: isAppDark
            ? 'bg-[#292827] border-[#3B3A39] text-white focus:border-[#0078D4] focus:ring-[#0078D4]'
            : 'bg-white border-[#8A8886] text-[#252423] focus:border-[#0078D4] focus:ring-[#0078D4]',
        toggleActive: isAppDark
            ? 'bg-[#0078D4] text-white border-[#0078D4]'
            : 'bg-[#0078D4] text-white border-[#0078D4]',
        toggleInactive: isAppDark
            ? 'bg-[#292827] text-[#A19F9D] border-[#3B3A39] hover:bg-[#323130]'
            : 'bg-[#F3F2F1] text-[#605E5C] border-[#E1DFDD] hover:bg-[#EDEBE9]',
        divider: isAppDark ? 'border-[#3B3A39]' : 'border-[#E1DFDD]',
        accordionBtn: isAppDark
            ? 'text-[#A19F9D] hover:text-white'
            : 'text-[#605E5C] hover:text-[#252423]',
        footer: isAppDark
            ? 'border-[#3B3A39] bg-[#292827]'
            : 'border-[#E1DFDD] bg-[#FAF9F8]',
        secondaryBtn: isAppDark
            ? 'bg-[#292827] border-[#3B3A39] text-[#F3F2F1] hover:bg-[#323130]'
            : 'bg-white border-[#8A8886] text-[#252423] hover:bg-[#F3F2F1]',
        primaryBtn: 'bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white'
    };

    return (
        <div
            className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
            onPointerDown={onClose}
        >
            <div
                className={`border rounded-md shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${fluentStyles.container}`}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-5 py-3 border-b flex justify-between items-center ${fluentStyles.header}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-[#0078D4]/10 flex items-center justify-center text-[#0078D4]">
                            <Download className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className={`text-sm font-semibold leading-tight ${fluentStyles.title}`}>
                                Export Diagram
                            </h2>
                            <p className={`text-[11px] font-mono leading-tight uppercase ${fluentStyles.subtitle}`}>
                                Format: {format}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1 rounded transition-colors ${fluentStyles.closeBtn}`}
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Main Body */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                    {/* Left: Preview Panel */}
                    <div className={`md:col-span-7 p-5 flex flex-col justify-between border-b md:border-b-0 md:border-r min-h-[280px] ${fluentStyles.previewContainer}`}>
                        <div className="flex items-center justify-between text-xs text-[#605E5C] dark:text-[#A19F9D] mb-2.5">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Eye className="w-3.5 h-3.5 text-[#0078D4]" /> Preview
                            </span>
                            <span className="text-[11px] font-mono">
                                {exportWidth} × {exportHeight} px
                            </span>
                        </div>

                        {/* Preview Display Container */}
                        <div
                            className={`flex-1 rounded border overflow-hidden flex items-center justify-center relative p-4 transition-colors min-h-[200px] ${fluentStyles.previewBorder}`}
                            style={previewBgStyle}
                        >
                            {isPreviewLoading && (
                                <div className={`absolute inset-0 flex items-center justify-center gap-2 text-xs z-10 ${fluentStyles.previewLoaderBg}`}>
                                    <Loader2 className="w-4 h-4 animate-spin text-[#0078D4]" />
                                    Updating preview...
                                </div>
                            )}

                            {previewSrc ? (
                                <img
                                    src={previewSrc}
                                    alt="Export preview"
                                    className="max-w-full max-h-[270px] object-contain transition-all"
                                />
                            ) : (
                                <span className="text-xs text-[#8A8886] flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Generating preview...
                                </span>
                            )}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#605E5C] dark:text-[#A19F9D]">
                            <span>WYSIWYG Live Render</span>
                            <span>Zoom: {zoom}</span>
                        </div>
                    </div>

                    {/* Right: Options & Controls Panel */}
                    <div className={`md:col-span-5 p-5 overflow-y-auto flex flex-col justify-between gap-5 ${fluentStyles.sidebar}`}>
                        <div className="space-y-4">
                            {/* General Options */}
                            <div className="space-y-3">
                                <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${fluentStyles.sectionHeader}`}>
                                    General Settings
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className={`text-xs font-medium block ${fluentStyles.label}`}>
                                            Scope
                                        </label>
                                        <select
                                            value={size}
                                            onChange={(e) => setSize(e.target.value)}
                                            className={`w-full text-xs rounded px-2.5 py-1.5 outline-none border focus:ring-1 transition-all ${fluentStyles.input}`}
                                        >
                                            <option value="Diagram">Diagram Bounds</option>
                                            <option value="Page">Full Canvas Page</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className={`text-xs font-medium block ${fluentStyles.label}`}>
                                            Scale
                                        </label>
                                        <select
                                            value={zoom}
                                            onChange={(e) => setZoom(e.target.value)}
                                            className={`w-full text-xs rounded px-2.5 py-1.5 outline-none border focus:ring-1 transition-all ${fluentStyles.input}`}
                                        >
                                            <option value="50%">50%</option>
                                            <option value="100%">100%</option>
                                            <option value="200%">200%</option>
                                            <option value="400%">400%</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={`text-xs font-medium block ${fluentStyles.label}`}>
                                        Appearance
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setExportDark(true)}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all ${exportDark ? fluentStyles.toggleActive : fluentStyles.toggleInactive
                                                }`}
                                        >
                                            <Moon className="w-3.5 h-3.5" /> Dark
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExportDark(false)}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all ${!exportDark ? fluentStyles.toggleActive : fluentStyles.toggleInactive
                                                }`}
                                        >
                                            <Sun className="w-3.5 h-3.5" /> Light
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className={`space-y-2 pt-3 border-t ${fluentStyles.divider}`}>
                                <label className={`flex items-center gap-2.5 text-xs cursor-pointer select-none ${fluentStyles.label}`}>
                                    <input
                                        type="checkbox"
                                        checked={transparent}
                                        onChange={(e) => setTransparent(e.target.checked)}
                                        className="rounded border-[#8A8886] text-[#0078D4] focus:ring-[#0078D4]"
                                    />
                                    Transparent Background
                                </label>

                                <label className={`flex items-center gap-2.5 text-xs cursor-pointer select-none ${fluentStyles.label}`}>
                                    <input
                                        type="checkbox"
                                        checked={includeCopy}
                                        onChange={(e) => setIncludeCopy(e.target.checked)}
                                        className="rounded border-[#8A8886] text-[#0078D4] focus:ring-[#0078D4]"
                                    />
                                    Embed editable diagram copy
                                </label>
                            </div>

                            {/* Accordion Advanced Options */}
                            <div className={`pt-2 border-t ${fluentStyles.divider}`}>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className={`w-full flex items-center justify-between py-1 text-xs font-medium transition-colors ${fluentStyles.accordionBtn}`}
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
                                    <div className="mt-2.5 space-y-2.5 animate-in fade-in duration-100">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className={`text-[11px] block ${fluentStyles.sectionHeader}`}>Width (px)</label>
                                                <input
                                                    type="number"
                                                    value={exportWidth}
                                                    onChange={(e) => setExportWidth(e.target.value)}
                                                    className={`w-full text-xs rounded px-2 py-1 outline-none border focus:ring-1 ${fluentStyles.input}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className={`text-[11px] block ${fluentStyles.sectionHeader}`}>Height (px)</label>
                                                <input
                                                    type="number"
                                                    value={exportHeight}
                                                    onChange={(e) => setExportHeight(e.target.value)}
                                                    className={`w-full text-xs rounded px-2 py-1 outline-none border focus:ring-1 ${fluentStyles.input}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className={`text-[11px] block ${fluentStyles.sectionHeader}`}>DPI Density</label>
                                                <select
                                                    value={dpi}
                                                    onChange={(e) => setDpi(e.target.value)}
                                                    className={`w-full text-xs rounded px-2 py-1 outline-none border focus:ring-1 ${fluentStyles.input}`}
                                                >
                                                    <option value="100dpi">100 DPI</option>
                                                    <option value="200dpi">200 DPI</option>
                                                    <option value="300dpi">300 DPI</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className={`text-[11px] block ${fluentStyles.sectionHeader}`}>Border (px)</label>
                                                <input
                                                    type="number"
                                                    value={borderWidth}
                                                    onChange={(e) => setBorderWidth(e.target.value)}
                                                    className={`w-full text-xs rounded px-2 py-1 outline-none border focus:ring-1 ${fluentStyles.input}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-1">
                                            <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${fluentStyles.label}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={shadow}
                                                    onChange={(e) => setShadow(e.target.checked)}
                                                    className="rounded border-[#8A8886] text-[#0078D4] focus:ring-[#0078D4]"
                                                />
                                                Shadow
                                            </label>
                                            <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${fluentStyles.label}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={grid}
                                                    onChange={(e) => setGrid(e.target.checked)}
                                                    className="rounded border-[#8A8886] text-[#0078D4] focus:ring-[#0078D4]"
                                                />
                                                Grid
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className={`px-5 py-3 border-t flex justify-end gap-2.5 ${fluentStyles.footer}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-1.5 rounded text-xs font-medium border transition-colors ${fluentStyles.secondaryBtn}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleExecuteExport}
                        disabled={isExporting}
                        className={`px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${fluentStyles.primaryBtn}`}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileCheck className="w-3.5 h-3.5" />
                                Export
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}