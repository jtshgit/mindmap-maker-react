import React from 'react';
import { Eye, Loader2, Download, AlertCircle } from 'lucide-react';

/**
 * DiagramPreviewBox
 * Microsoft Fluent UI-inspired diagram rasterized preview viewer.
 * Provides consistent, high-fidelity WYSIWYG diagram visualization
 * across ExportDialog, DiagramManagerModal, and App resume modal.
 */
export default function DiagramPreviewBox({
    previewSrc,
    loading = false,
    error = null,
    width,
    height,
    zoom = '100%',
    isDark = false,
    transparent = false,
    canvasBg = '#ffffff',
    showInfoBar = true,
    showFooterBar = true,
    title = 'Preview',
    subtitle = 'WYSIWYG Live Render',
    onDownload = null,
    downloadFileName = 'diagram-preview.png',
    minHeight = 220,
    maxHeight = 360,
    className = '',
    style = {}
}) {
    const previewBgStyle = transparent
        ? {
            backgroundImage: isDark
                ? 'linear-gradient(45deg, #282828 25%, transparent 25%), linear-gradient(-45deg, #282828 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #282828 75%), linear-gradient(-45deg, transparent 75%, #282828 75%)'
                : 'linear-gradient(45deg, #E1DFDD 25%, transparent 25%), linear-gradient(-45deg, #E1DFDD 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E1DFDD 75%), linear-gradient(-45deg, transparent 75%, #E1DFDD 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: isDark ? '#1B1A19' : '#F3F2F1'
        }
        : {
            backgroundColor: isDark ? '#000000' : canvasBg || '#ffffff'
        };

    const fluentStyles = {
        wrapper: isDark
            ? 'bg-[#1B1A19] border-[#3B3A39] text-[#F3F2F1]'
            : 'bg-[#FAF9F8] border-[#E1DFDD] text-[#252423]',
        boxBorder: isDark ? 'border-[#323130]' : 'border-[#E1DFDD]',
        loaderBg: isDark ? 'bg-[#201F1E]/85 text-[#F3F2F1]' : 'bg-white/85 text-[#252423]',
        textMuted: isDark ? 'text-[#A19F9D]' : 'text-[#605E5C]',
        badge: isDark ? 'bg-[#2D2D2D] text-[#D2D0CE]' : 'bg-[#EDEBE9] text-[#323130]',
        actionBtn: isDark
            ? 'bg-[#292827]/90 hover:bg-[#323130] text-white border-[#3B3A39]'
            : 'bg-white/90 hover:bg-[#F3F2F1] text-[#201F1E] border-[#E1DFDD]'
    };

    const handleDownload = () => {
        if (onDownload) {
            onDownload();
            return;
        }
        if (previewSrc) {
            const link = document.createElement('a');
            link.href = previewSrc;
            link.download = downloadFileName;
            link.click();
        }
    };

    return (
        <div className={`flex flex-col justify-between w-full font-['Segoe_UI',system-ui,sans-serif] ${className}`} style={style}>
            {/* Top Info Bar */}
            {showInfoBar && (
                <div className={`flex items-center justify-between text-xs mb-2 ${fluentStyles.textMuted}`}>
                    <span className="flex items-center gap-1.5 font-medium">
                        <Eye className="w-3.5 h-3.5 text-[#0078D4]" /> {title}
                    </span>
                    <div className="flex items-center gap-2">
                        {width && height && (
                            <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${fluentStyles.badge}`}>
                                {Math.round(width)} × {Math.round(height)} px
                            </span>
                        )}
                        {(onDownload || previewSrc) && (
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={!previewSrc || loading}
                                title="Download snapshot image"
                                className={`p-1 rounded border shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${fluentStyles.actionBtn}`}
                            >
                                <Download className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Main Preview Container */}
            <div
                className={`flex-1 rounded-md border overflow-hidden flex items-center justify-center relative p-3 sm:p-4 transition-colors ${fluentStyles.boxBorder}`}
                style={{
                    ...previewBgStyle,
                    minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
                    maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
                }}
            >
                {/* Loader State */}
                {loading && (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs z-10 backdrop-blur-2xs transition-all ${fluentStyles.loaderBg}`}>
                        <Loader2 className="w-5 h-5 animate-spin text-[#0078D4]" />
                        <span className="font-medium">Updating preview...</span>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium max-w-xs">{error}</span>
                    </div>
                )}

                {/* Image Preview */}
                {!loading && !error && previewSrc && (
                    <img
                        src={previewSrc}
                        alt="Diagram Preview"
                        className="max-w-full max-h-full object-contain transition-all rounded shadow-2xs select-none"
                        style={{
                            maxHeight: typeof maxHeight === 'number' ? `${maxHeight - 24}px` : undefined
                        }}
                    />
                )}

                {/* Empty / Initial State */}
                {!loading && !error && !previewSrc && (
                    <span className={`text-xs flex items-center gap-2 ${fluentStyles.textMuted}`}>
                        <Loader2 className="w-4 h-4 animate-spin text-[#0078D4]" /> Generating preview...
                    </span>
                )}
            </div>

            {/* Bottom Footer Details */}
            {showFooterBar && (
                <div className={`mt-2 flex items-center justify-between text-[11px] ${fluentStyles.textMuted}`}>
                    <span>{subtitle}</span>
                    {zoom && <span>Zoom: {zoom}</span>}
                </div>
            )}
        </div>
    );
}
