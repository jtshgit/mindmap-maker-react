import React, { useRef, useState, useMemo } from 'react';
import { SHAPE_CATEGORIES, ShapeIcon } from './shapes/ShapeDefinitions';
import { LINE_TYPES } from './shapes/LineDefinitions.jsx';

// Reads a File into a data URL and resolves its natural pixel dimensions
function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => {
            const dataUrl = reader.result;
            const img = new Image();
            img.onerror = () => reject(new Error('Could not read image'));
            img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    });
}

// Common Tailwind styles for sidebar tiles
const tileClassName =
    "w-9 h-9 flex items-center justify-center border border-neutral-200 dark:border-neutral-800 " +
    "rounded-md cursor-grab active:cursor-grabbing text-neutral-600 dark:text-neutral-400 " +
    "hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-neutral-950 " +
    "hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-400 dark:hover:border-blue-500/60 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " +
    "transition-all duration-150 shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 shrink-0";

export default function ShapeLibrarySidebar({
    onPointerDownShape,
    onClickShape,
    onPointerDownLine,
    onClickLine,
    onImportImage
}) {
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragOverImage, setIsDragOverImage] = useState(false);

    // Ref to track drag movement and separate drag gestures from click gestures
    const dragTrackerRef = useRef({
        startX: 0,
        startY: 0,
        hasDragged: false,
        activeId: null,
        activeType: null, // 'shape' | 'line'
        downEvent: null
    });

    // Collapsible sections state initialized for image, lines, and dynamic shape categories
    const [openSections, setOpenSections] = useState(() => {
        const initial = { image: true, lines: true };
        SHAPE_CATEGORIES.forEach(cat => {
            initial[cat.id] = true;
        });
        return initial;
    });

    const toggleSection = (sectionKey) => {
        setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    };

    // --- Shape Gesture Handlers ---
    const handleShapePointerDown = (e, shapeId) => {
        if (e.button !== undefined && e.button !== 0) return; // Only handle primary click

        dragTrackerRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            hasDragged: false,
            activeId: shapeId,
            activeType: 'shape',
            downEvent: e
        };

        const handlePointerMove = (moveEvent) => {
            const tracker = dragTrackerRef.current;
            if (!tracker.activeId || tracker.hasDragged) return;

            const dx = Math.abs(moveEvent.clientX - tracker.startX);
            const dy = Math.abs(moveEvent.clientY - tracker.startY);

            // Trigger drag feature only if cursor moves beyond 4px
            if (dx > 4 || dy > 4) {
                tracker.hasDragged = true;
                if (onPointerDownShape) {
                    onPointerDownShape(tracker.downEvent, shapeId);
                }
            }
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handleShapeClick = (e, shapeId) => {
        const tracker = dragTrackerRef.current;

        // If the gesture was a drag, suppress the click handler
        if (tracker.hasDragged && tracker.activeId === shapeId && tracker.activeType === 'shape') {
            e.preventDefault();
            e.stopPropagation();
            tracker.hasDragged = false;
            return;
        }

        // Trigger the dedicated click feature for pure clicks
        if (onClickShape) {
            onClickShape(e, shapeId);
        }
    };

    // --- Line Gesture Handlers ---
    const handleLinePointerDown = (e, lineId) => {
        if (e.button !== undefined && e.button !== 0) return;

        dragTrackerRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            hasDragged: false,
            activeId: lineId,
            activeType: 'line',
            downEvent: e
        };

        const handlePointerMove = (moveEvent) => {
            const tracker = dragTrackerRef.current;
            if (!tracker.activeId || tracker.hasDragged) return;

            const dx = Math.abs(moveEvent.clientX - tracker.startX);
            const dy = Math.abs(moveEvent.clientY - tracker.startY);

            if (dx > 4 || dy > 4) {
                tracker.hasDragged = true;
                if (onPointerDownLine) {
                    onPointerDownLine(tracker.downEvent, lineId);
                }
            }
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handleLineClick = (e, lineId) => {
        const tracker = dragTrackerRef.current;

        if (tracker.hasDragged && tracker.activeId === lineId && tracker.activeType === 'line') {
            e.preventDefault();
            e.stopPropagation();
            tracker.hasDragged = false;
            return;
        }

        if (onClickLine) {
            onClickLine(e, lineId);
        }
    };

    // Handle image file selection/drop
    const processImageFile = async (file) => {
        if (!file || !onImportImage) return;
        try {
            const { dataUrl, width, height } = await readImageFile(file);
            onImportImage(dataUrl, width, height);
        } catch (err) {
            console.error('Image import failed:', err);
        }
    };

    const handleFileChosen = (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        processImageFile(file);
    };

    // Drag and drop handlers for image files
    const handleImageDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverImage(true);
    };

    const handleImageDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverImage(false);
    };

    const handleImageDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverImage(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0 && files[0].type.startsWith('image/')) {
            processImageFile(files[0]);
        }
    };

    // Search filters across shape categories
    const filteredShapeCategories = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return SHAPE_CATEGORIES;

        return SHAPE_CATEGORIES.map(category => ({
            ...category,
            shapes: category.shapes.filter(s =>
                s.label.toLowerCase().includes(query) || s.id.toLowerCase().includes(query)
            )
        })).filter(category => category.shapes.length > 0);
    }, [searchTerm]);

    const filteredLines = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return LINE_TYPES;
        return LINE_TYPES.filter(l => l.label.toLowerCase().includes(query) || l.id.toLowerCase().includes(query));
    }, [searchTerm]);

    const showImageSection = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;
        return 'image'.includes(query) || 'picture'.includes(query) || 'upload'.includes(query);
    }, [searchTerm]);

    // Check if total search results are completely empty
    const isSearchEmpty = useMemo(() => {
        return !!searchTerm.trim() &&
            !showImageSection &&
            filteredLines.length === 0 &&
            filteredShapeCategories.length === 0;
    }, [searchTerm, showImageSection, filteredLines, filteredShapeCategories]);

    return (
        <aside className="w-56 h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col select-none text-xs font-sans text-neutral-800 dark:text-neutral-200 z-20 shrink-0 transition-colors duration-200">

            {/* ── SEARCH BAR (Fixed Header) ── */}
            <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-20">
                <div className="relative flex items-center">
                    <svg className="w-3.5 h-3.5 absolute left-2.5 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search elements..."
                        className="w-full pl-8 pr-7 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-md text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded-full"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ── SCROLLABLE SECTIONS CONTAINER ── */}
            <div className="flex-1 overflow-y-auto">

                {/* 1. IMAGE SECTION */}
                {showImageSection && (
                    <div className="border-b border-neutral-200/80 dark:border-neutral-800/80">
                        <button
                            type="button"
                            onClick={() => toggleSection('image')}
                            className="w-full px-3.5 py-2 flex items-center justify-between font-semibold text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider bg-neutral-50/90 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 sticky top-0 z-10 backdrop-blur-xs select-none transition-colors"
                        >
                            <span>Image</span>
                            <svg
                                className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${openSections.image || searchTerm ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {(openSections.image || searchTerm) && (
                            <div className="p-2.5">
                                <div
                                    onDragOver={handleImageDragOver}
                                    onDragLeave={handleImageDragLeave}
                                    onDrop={handleImageDrop}
                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                    className={`w-full p-3 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 ${isDragOverImage
                                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 scale-[0.99]'
                                        : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-500/60 bg-neutral-50/50 dark:bg-neutral-950/40 text-neutral-600 dark:text-neutral-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/30'
                                        }`}
                                >
                                    <svg className="w-5 h-5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
                                        <rect x="3" y="4" width="18" height="16" rx="2" />
                                        <circle cx="8.5" cy="9.5" r="1.5" />
                                        <path d="M21 16l-5.5-5.5a1.5 1.5 0 00-2.12 0L3 20" />
                                    </svg>
                                    <span className="text-[11px] font-medium text-center">
                                        {isDragOverImage ? "Drop image here" : "Click or drag image here"}
                                    </span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChosen}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 2. CATEGORIZED SHAPES SECTIONS */}
                {filteredShapeCategories.map(category => {
                    const isOpen = openSections[category.id] || !!searchTerm;
                    return (
                        <div key={category.id} className="border-b border-neutral-200/80 dark:border-neutral-800/80">
                            <button
                                type="button"
                                onClick={() => toggleSection(category.id)}
                                className="w-full px-3.5 py-2 flex items-center justify-between font-semibold text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider bg-neutral-50/90 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 sticky top-0 z-10 backdrop-blur-xs select-none transition-colors"
                            >
                                <span>{category.label} ({category.shapes.length})</span>
                                <svg
                                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isOpen && (
                                <div className="p-2.5 grid grid-cols-4 gap-1.5 justify-items-center">
                                    {category.shapes.map(shape => (
                                        <button
                                            key={shape.id}
                                            type="button"
                                            title={shape.label}
                                            className={tileClassName}
                                            onPointerDown={(e) => handleShapePointerDown(e, shape.id)}
                                            onClick={(e) => handleShapeClick(e, shape.id)}
                                        >
                                            <ShapeIcon type={shape.id} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* 3. LINES SECTION */}
                {filteredLines.length > 0 && (
                    <div className="border-b border-neutral-200/80 dark:border-neutral-800/80">
                        <button
                            type="button"
                            onClick={() => toggleSection('lines')}
                            className="w-full px-3.5 py-2 flex items-center justify-between font-semibold text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider bg-neutral-50/90 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 sticky top-0 z-10 backdrop-blur-xs select-none transition-colors"
                        >
                            <span>Lines ({filteredLines.length})</span>
                            <svg
                                className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${openSections.lines || searchTerm ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {(openSections.lines || searchTerm) && (
                            <div className="p-2.5 grid grid-cols-4 gap-1.5 justify-items-center">
                                {filteredLines.map(line => (
                                    <button
                                        key={line.id}
                                        type="button"
                                        title={line.label}
                                        className={tileClassName}
                                        onPointerDown={(e) => handleLinePointerDown(e, line.id)}
                                        onClick={(e) => handleLineClick(e, line.id)}
                                    >
                                        {line.icon}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State when Search returns no results */}
                {isSearchEmpty && (
                    <div className="p-8 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                        No elements found for "{searchTerm}"
                    </div>
                )}

            </div>
        </aside>
    );
}