import React, { useState, useCallback, useEffect, useRef } from 'react';
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

/* -------------------------------------------------------------------------- */
/*                            Custom Styled Inputs                            */
/* -------------------------------------------------------------------------- */

function CustomSelect({ value, options, onChange, className = '' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const selectedOption = options.find((o) => (typeof o === 'object' ? o.value : o) === value);
    const displayLabel = selectedOption
        ? typeof selectedOption === 'object'
            ? selectedOption.label
            : selectedOption
        : value;

    return (
        <div ref={ref} className={`relative inline-block text-left ${open ? 'z-50' : 'z-10'} ${className}`}>
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(!open)}
                className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded flex items-center justify-between shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors"
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-1 shrink-0" />
            </button>
            {open && (
                <div className="absolute left-0 right-0 mt-1 z-[1000] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-h-48 overflow-y-auto py-1 text-xs">
                    {options.map((opt) => {
                        const optVal = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        const isSelected = optVal === value;
                        return (
                            <button
                                key={optVal}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onChange(optVal);
                                    setOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center justify-between ${isSelected
                                        ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                        : 'text-neutral-700 dark:text-neutral-300'
                                    }`}
                            >
                                <span className="truncate">{optLabel}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function MSNumberInput({ value, onChange, unit = '', min = -500, max = 5000, step = 1, className = '' }) {
    return (
        <div className={`flex items-center border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 px-1.5 py-0.5 w-full focus-within:border-blue-500 shadow-2xs ${className}`}>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value ?? 0}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-medium text-right pr-1 text-neutral-800 dark:text-neutral-200 bg-transparent focus:outline-none"
            />
            {unit && <span className="text-[10px] text-neutral-400 shrink-0 font-semibold uppercase">{unit}</span>}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                            Helper Functions                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                            Export Dialog Component                         */
/* -------------------------------------------------------------------------- */

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

    // Advanced Options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [exportWidth, setExportWidth] = useState(293);
    const [exportHeight, setExportHeight] = useState(98);
    const [dpi, setDpi] = useState('100dpi');
    const [borderWidth, setBorderWidth] = useState(0);
    const [shadow, setShadow] = useState(false);
    const [grid, setGrid] = useState(false);

    const [exportDark, setExportDark] = useState(isAppDark);
    const [previewSrc, setPreviewSrc] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    useEffect(() => {
        if (isOpen) setExportDark(isAppDark);
    }, [isOpen, isAppDark]);

    useEffect(() => {
        if (format === 'jpeg' || format === 'pdf') {
            setTransparent(false);
        }
    }, [format]);

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
        (finalWidth, finalHeight, zoomFactor, bounds, borderPx = 0) => {
            const effectiveBg = exportDark
                ? '#000000'
                : canvasConfig?.backgroundColor || '#ffffff';

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
        const borderPx = Math.max(0, parseInt(borderWidth, 10) || 0);

        const dpiScale = { '100dpi': 1, '200dpi': 2, '300dpi': 3 }[dpi] || 1;
        const isRaster = format === 'png' || format === 'jpeg' || format === 'pdf';
        const renderScale = isRaster ? dpiScale : 1;

        const { container, svgClone, effectiveBg, outerWidth, outerHeight } = buildExportContainer(
            finalWidth,
            finalHeight,
            zoomFactor,
            bounds,
            borderPx
        );

        await new Promise((r) => setTimeout(r, 200));

        try {
            if (format === 'svg') {
                const svgW = finalWidth + borderPx * 2;
                const svgH = finalHeight + borderPx * 2;
                svgClone.setAttribute('width', String(svgW));
                svgClone.setAttribute('height', String(svgH));
                svgClone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
                svgClone.style.position = '';
                svgClone.style.left = '';
                svgClone.style.top = '';
                svgClone.style.width = '';
                svgClone.style.height = '';

                const contentWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                contentWrapper.setAttribute('transform', `translate(${borderPx}, ${borderPx})`);
                while (svgClone.firstChild) {
                    contentWrapper.appendChild(svgClone.firstChild);
                }

                if (!transparent) {
                    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    bgRect.setAttribute('x', '0');
                    bgRect.setAttribute('y', '0');
                    bgRect.setAttribute('width', String(svgW));
                    bgRect.setAttribute('height', String(svgH));
                    bgRect.setAttribute('fill', effectiveBg);
                    svgClone.appendChild(bgRect);
                }
                svgClone.appendChild(contentWrapper);

                if (borderPx > 0) {
                    const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    borderRect.setAttribute('x', String(borderPx / 2));
                    borderRect.setAttribute('y', String(borderPx / 2));
                    borderRect.setAttribute('width', String(svgW - borderPx));
                    borderRect.setAttribute('height', String(svgH - borderPx));
                    borderRect.setAttribute('fill', 'none');
                    borderRect.setAttribute('stroke', exportDark ? '#ffffff' : '#000000');
                    borderRect.setAttribute('stroke-width', String(borderPx));
                    svgClone.appendChild(borderRect);
                }

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
                    width: outerWidth * renderScale,
                    height: outerHeight * renderScale,
                    style: {
                        transform: `scale(${renderScale})`,
                        transformOrigin: 'top left'
                    }
                });
                const link = document.createElement('a');
                link.download = `mindmap.${format}`;
                link.href = dataUrl;
                link.click();
            } else if (format === 'pdf') {
                const dataUrl = await domtoimage.toPng(container, {
                    bgcolor: transparent ? null : effectiveBg,
                    width: outerWidth * renderScale,
                    height: outerHeight * renderScale,
                    style: {
                        transform: `scale(${renderScale})`,
                        transformOrigin: 'top left'
                    }
                });
                const pdf = new jsPDF({
                    orientation: outerWidth > outerHeight ? 'l' : 'p',
                    unit: 'px',
                    format: [outerWidth, outerHeight]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, outerWidth, outerHeight);
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
                                        <CustomSelect
                                            value={size}
                                            options={[
                                                { label: 'Diagram Bounds', value: 'Diagram' },
                                                { label: 'Full Canvas Page', value: 'Page' }
                                            ]}
                                            onChange={(val) => setSize(val)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={`text-xs font-medium block ${fluentStyles.label}`}>
                                            Scale
                                        </label>
                                        <CustomSelect
                                            value={zoom}
                                            options={['50%', '100%', '200%', '400%']}
                                            onChange={(val) => setZoom(val)}
                                        />
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
                                {(format === 'png' || format === 'svg') && (
                                    <label className={`flex items-center gap-2.5 text-xs cursor-pointer select-none ${fluentStyles.label}`}>
                                        <input
                                            type="checkbox"
                                            checked={transparent}
                                            onChange={(e) => setTransparent(e.target.checked)}
                                            className="rounded border-[#8A8886] text-[#0078D4] focus:ring-[#0078D4]"
                                        />
                                        Transparent Background
                                    </label>
                                )}

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
                                                <MSNumberInput
                                                    value={exportWidth}
                                                    onChange={(val) => setExportWidth(val)}
                                                    unit="px"
                                                    min={1}
                                                    max={10000}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className={`text-[11px] block ${fluentStyles.sectionHeader}`}>Height (px)</label>
                                                <MSNumberInput
                                                    value={exportHeight}
                                                    onChange={(val) => setExportHeight(val)}
                                                    unit="px"
                                                    min={1}
                                                    max={10000}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {format !== 'svg' && (
                                                <div className="space-y-1">
                                                    <label className={`text-[11px] block ${fluentStyles.sectionHeader}`}>DPI Density</label>
                                                    <CustomSelect
                                                        value={dpi}
                                                        options={[
                                                            { label: '100 DPI', value: '100dpi' },
                                                            { label: '200 DPI', value: '200dpi' },
                                                            { label: '300 DPI', value: '300dpi' }
                                                        ]}
                                                        onChange={(val) => setDpi(val)}
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <label className={`text-[11px] block ${fluentStyles.sectionHeader}`}>Border (px)</label>
                                                <MSNumberInput
                                                    value={borderWidth}
                                                    onChange={(val) => setBorderWidth(val)}
                                                    unit="px"
                                                    min={0}
                                                    max={100}
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