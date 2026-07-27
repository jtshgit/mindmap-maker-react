import { useState, useRef, useEffect, useCallback } from "react";
import {
    Plus,
    Menu,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Check
} from "lucide-react";

// Custom GitHub SVG component supporting dark/light mode
const GithubIcon = ({ className = "w-4 h-4" }) => (
    <svg
        className={className}
        viewBox="0 0 20 20"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M94,7399 C99.523,7399 104,7403.59 104,7409.253 C104,7413.782 101.138,7417.624 97.167,7418.981 C96.66,7418.082 96.48,7418.762 96.48,7418.489 C96.48,7418.151 96.492,7417.047 96.492,7415.675 C96.492,7414.719 96.172,7414.095 95.813,7413.777 C98.04,7413.523 100.38,7412.656 100.38,7408.718 C100.38,7407.598 99.992,7406.684 99.35,7405.966 C99.454,7405.707 99.797,7404.664 99.252,7403.252 C99.252,7403.252 98.414,7402.977 96.505,7404.303 C95.706,7404.076 94.85,7403.962 94,7403.958 C93.15,7403.962 92.295,7404.076 91.497,7404.303 C89.586,7402.977 88.746,7403.252 88.746,7403.252 C88.203,7404.664 88.546,7405.707 88.649,7405.966 C88.01,7406.684 87.619,7407.598 87.619,7408.718 C87.619,7412.646 89.954,7413.526 92.175,7413.785 C91.889,7414.041 91.63,7414.493 91.54,7415.156 C90.97,7415.418 89.522,7415.871 88.63,7414.304 C88.63,7414.304 88.101,7413.319 87.097,7413.247 C87.097,7413.247 86.122,7413.234 87.029,7413.87 C87.029,7413.87 87.684,7414.185 88.139,7415.37 C88.139,7415.37 88.726,7417.2 91.508,7416.58 C91.513,7417.437 91.522,7418.245 91.522,7418.489 C91.522,7418.76 91.338,7419.077 90.839,7418.982 C86.865,7417.627 84,7413.783 84,7409.253 C84,7403.59 88.478,7399 94,7399" transform="translate(-140.000000, -7559.000000) translate(56.000000, 160.000000)" />
    </svg>
);

export default function PageTabBar({
    pages = [],
    activePageId,
    onSwitchPage,
    onAddPage,
    onClosePage,
    onRenamePage,
    onDuplicatePage,
    onReorderPages,
    onOpenInNewWindow,
    githubUrl = "https://github.com"
}) {
    // Menu visibility states
    const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
    const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);

    // Fixed Positioning States
    const [mainMenuPos, setMainMenuPos] = useState({ left: 0, bottom: 0 });
    const [pageMenuPos, setPageMenuPos] = useState({ left: 0, bottom: 0 });
    const [contextMenu, setContextMenu] = useState({ visible: false, left: 0, bottom: 0, page: null });

    // Flyout Submenu State
    const [flyoutMenu, setFlyoutMenu] = useState({ visible: false, left: 0, top: 0, page: null });
    const [moveSubMenuOpen, setMoveSubMenuOpen] = useState(false);

    // Drag & Drop States & Refs
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dropPosition, setDropPosition] = useState('before'); // 'before' | 'after'

    const draggedIndexRef = useRef(null);
    const dragOverInfoRef = useRef({ index: null, position: null });

    // Overflow & Scroll States
    const [showScrollBtns, setShowScrollBtns] = useState(false);

    // Renaming state
    const [editingTabId, setEditingTabId] = useState(null);
    const [editingName, setEditingName] = useState('');

    // Refs
    const barRef = useRef(null);
    const hamburgerBtnRef = useRef(null);
    const activeBtnRef = useRef(null);
    const mainMenuRef = useRef(null);
    const editInputRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const activePageRef = useRef(null);

    const activePage = pages.find(p => p.id === activePageId) || pages[0];

    // Check overflow for scroll arrows
    const checkOverflow = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowScrollBtns(scrollWidth > clientWidth + 2);
        }
    }, []);

    useEffect(() => {
        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [pages, checkOverflow]);

    // Auto-scroll active page tab into view
    useEffect(() => {
        if (activePageRef.current) {
            activePageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
        checkOverflow();
    }, [activePageId, pages.length, checkOverflow]);

    // Focus rename input
    useEffect(() => {
        if (editingTabId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingTabId]);

    // Close all menus
    const closeAllMenus = useCallback(() => {
        setIsMainMenuOpen(false);
        setIsPageMenuOpen(false);
        setFlyoutMenu({ visible: false, left: 0, top: 0, page: null });
        setMoveSubMenuOpen(false);
        setContextMenu({ visible: false, left: 0, bottom: 0, page: null });
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (barRef.current && !barRef.current.contains(e.target)) {
                const isInsidePopup = e.target.closest('.fixed-page-popup');
                if (!isInsidePopup) {
                    closeAllMenus();
                }
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeAllMenus();
        };

        window.addEventListener('pointerdown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', closeAllMenus);
        return () => {
            window.removeEventListener('pointerdown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', closeAllMenus);
        };
    }, [closeAllMenus]);

    // Toggle Main Hamburger Menu
    const toggleMainMenu = () => {
        if (isMainMenuOpen) {
            closeAllMenus();
        } else {
            if (hamburgerBtnRef.current) {
                const rect = hamburgerBtnRef.current.getBoundingClientRect();
                setMainMenuPos({
                    left: Math.max(8, rect.left),
                    bottom: window.innerHeight - rect.top + 8
                });
            }
            setIsMainMenuOpen(true);
            setIsPageMenuOpen(false);
            setContextMenu({ visible: false, left: 0, bottom: 0, page: null });
        }
    };

    // Toggle Active Page Pill Menu
    const togglePageMenu = () => {
        if (isPageMenuOpen) {
            closeAllMenus();
        } else {
            if (activeBtnRef.current) {
                const rect = activeBtnRef.current.getBoundingClientRect();
                setPageMenuPos({
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 200)),
                    bottom: window.innerHeight - rect.top + 8
                });
            }
            setIsPageMenuOpen(true);
            setIsMainMenuOpen(false);
            setContextMenu({ visible: false, left: 0, bottom: 0, page: null });
        }
    };

    // Right-Click Context Menu
    const handleContextMenu = (e, page) => {
        e.preventDefault();
        e.stopPropagation();

        const menuWidth = 192;
        let left = e.clientX;
        if (left + menuWidth > window.innerWidth) {
            left = window.innerWidth - menuWidth - 10;
        }

        const bottom = window.innerHeight - e.clientY + 4;

        setContextMenu({
            visible: true,
            left,
            bottom,
            page
        });
        setIsMainMenuOpen(false);
        setIsPageMenuOpen(false);
        setFlyoutMenu({ visible: false, left: 0, top: 0, page: null });
    };

    // Flyout Submenu in Main Menu
    const handlePageItemFlyout = (e, page) => {
        e.stopPropagation();
        const rowRect = e.currentTarget.getBoundingClientRect();

        let left = rowRect.right + 2;
        if (left + 192 > window.innerWidth) {
            left = rowRect.left - 194;
        }

        let top = rowRect.top;
        if (top + 180 > window.innerHeight) {
            top = window.innerHeight - 190;
        }

        setFlyoutMenu({
            visible: true,
            left,
            top,
            page
        });
        setMoveSubMenuOpen(false);
    };

    // Move Page Left / Right
    const handleMovePage = (pageId, direction) => {
        const index = pages.findIndex(p => p.id === pageId);
        if (index === -1) return;

        const newIndex = direction === 'left' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= pages.length) return;

        const updatedPages = [...pages];
        const [movedPage] = updatedPages.splice(index, 1);
        updatedPages.splice(newIndex, 0, movedPage);

        if (onReorderPages) {
            onReorderPages(updatedPages);
        }
    };

    /* ── HIGH-PERFORMANCE DRAG & DROP HANDLERS ── */
    const handleDragStart = (e, index) => {
        draggedIndexRef.current = index;
        setDraggedIndex(index);
        closeAllMenus();
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        if (draggedIndexRef.current === null) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const position = e.clientX < midpoint ? 'before' : 'after';

        if (
            dragOverInfoRef.current.index !== index ||
            dragOverInfoRef.current.position !== position
        ) {
            dragOverInfoRef.current = { index, position };
            setDragOverIndex(index);
            setDropPosition(position);
        }
    };

    const handleDrop = (e, targetIndex, forcePosition) => {
        e.preventDefault();
        e.stopPropagation();

        const fromIndex = draggedIndexRef.current;
        if (fromIndex === null || fromIndex === undefined) {
            handleDragEnd();
            return;
        }

        const position = forcePosition || dragOverInfoRef.current.position || 'before';

        // Compute destination insertion slot (0 to pages.length)
        let targetSlot = targetIndex;
        if (position === 'after') {
            targetSlot = targetIndex + 1;
        }

        let toIndex = targetSlot;
        if (fromIndex < targetSlot) {
            toIndex = targetSlot - 1;
        }

        if (fromIndex !== toIndex && typeof onReorderPages === 'function') {
            const updatedPages = [...pages];
            const [movedPage] = updatedPages.splice(fromIndex, 1);
            updatedPages.splice(toIndex, 0, movedPage);
            onReorderPages(updatedPages);
        }

        handleDragEnd();
    };

    const handleDragEnd = () => {
        draggedIndexRef.current = null;
        dragOverInfoRef.current = { index: null, position: null };
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Scroll handlers
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -160, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 160, behavior: 'smooth' });
        }
    };

    const startRename = (page) => {
        setEditingTabId(page.id);
        setEditingName(page.name);
        closeAllMenus();
    };

    const commitRename = () => {
        if (editingTabId && editingName.trim()) {
            onRenamePage(editingTabId, editingName.trim());
        }
        setEditingTabId(null);
    };

    return (
        <div
            ref={barRef}
            className="flex items-center justify-between h-9 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-3 select-none text-xs font-sans text-neutral-800 dark:text-neutral-200 relative shrink-0 transition-colors"
        >
            {/* ── LEFT SECTION: + | ≡ | INLINE DRAGGABLE PAGES LIST ── */}
            <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-2">

                {/* 1. Add Page Button (+) */}
                <button
                    onClick={onAddPage}
                    className="p-1.5 rounded hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors shrink-0"
                    title="Insert Page"
                >
                    <Plus className="w-4 h-4" />
                </button>

                {/* 2. Hamburger Menu Button (≡) */}
                <button
                    ref={hamburgerBtnRef}
                    onClick={toggleMainMenu}
                    className={`p-1.5 rounded hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors shrink-0 ${isMainMenuOpen ? 'bg-neutral-200 dark:bg-neutral-800' : ''
                        }`}
                    title="Page Menu"
                >
                    <Menu className="w-4 h-4" />
                </button>

                {/* 3. INLINE DRAGGABLE PAGES TAB CONTAINER */}
                <div
                    ref={scrollContainerRef}
                    onScroll={() => {
                        checkOverflow();
                        closeAllMenus();
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (draggedIndexRef.current === null) return;

                        // Target last position if dragging over empty container space
                        if (e.target === scrollContainerRef.current && pages.length > 0) {
                            const lastIndex = pages.length - 1;
                            if (dragOverInfoRef.current.index !== lastIndex || dragOverInfoRef.current.position !== 'after') {
                                dragOverInfoRef.current = { index: lastIndex, position: 'after' };
                                setDragOverIndex(lastIndex);
                                setDropPosition('after');
                            }
                        }
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (e.target === scrollContainerRef.current && pages.length > 0) {
                            handleDrop(e, pages.length - 1, 'after');
                        }
                    }}
                    className="flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth h-full py-1 relative flex-1 min-w-0"
                >
                    {pages.map((page, index) => {
                        const isActive = page.id === activePageId;
                        const isBeingDragged = draggedIndex === index;
                        const isHoveredForDrop = dragOverIndex === index && draggedIndex !== index;

                        return (
                            <div
                                key={page.id}
                                ref={isActive ? activePageRef : null}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => {
                                    e.stopPropagation();
                                    handleDragOver(e, index);
                                }}
                                onDrop={(e) => {
                                    e.stopPropagation();
                                    handleDrop(e, index);
                                }}
                                onDragEnd={handleDragEnd}
                                onContextMenu={(e) => handleContextMenu(e, page)}
                                className={`relative flex items-center shrink-0 transition-all duration-100 ${isBeingDragged ? 'opacity-30 border border-dashed border-blue-500 rounded' : 'opacity-100'
                                    }`}
                            >
                                {/* ── VISUAL DROP INDICATOR (BEFORE) ── */}
                                {isHoveredForDrop && dropPosition === 'before' && (
                                    <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full z-30 pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.9)] flex flex-col justify-between items-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 -mt-0.5" />
                                        <div className="w-2 h-2 rounded-full bg-blue-500 -mb-0.5" />
                                    </div>
                                )}

                                {/* ── ACTIVE TAB BUTTON / INPUT ── */}
                                {isActive ? (
                                    editingTabId === page.id ? (
                                        <input
                                            ref={editInputRef}
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onBlur={commitRename}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitRename();
                                                if (e.key === 'Escape') setEditingTabId(null);
                                            }}
                                            className="bg-white dark:bg-neutral-950 border border-blue-500 rounded px-2 py-0.5 text-xs text-neutral-900 dark:text-white outline-none w-28 font-medium"
                                        />
                                    ) : (
                                        <button
                                            ref={activeBtnRef}
                                            onClick={togglePageMenu}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-200/80 dark:hover:bg-blue-900/80 transition-colors whitespace-nowrap cursor-grab active:cursor-grabbing shadow-sm"
                                        >
                                            <span>{page.name}</span>
                                            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                        </button>
                                    )
                                ) : (
                                    /* ── INACTIVE TAB BUTTON ── */
                                    <button
                                        onClick={() => onSwitchPage(page.id)}
                                        className="px-3 py-1.5 rounded hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors whitespace-nowrap font-normal cursor-grab active:cursor-grabbing"
                                    >
                                        {page.name}
                                    </button>
                                )}

                                {/* ── VISUAL DROP INDICATOR (AFTER) ── */}
                                {isHoveredForDrop && dropPosition === 'after' && (
                                    <div className="absolute -right-1 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full z-30 pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.9)] flex flex-col justify-between items-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 -mt-0.5" />
                                        <div className="w-2 h-2 rounded-full bg-blue-500 -mb-0.5" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 4. SCROLL BUTTONS (< and >) WHEN OVERFLOWING */}
                {showScrollBtns && (
                    <div className="flex items-center gap-0.5 shrink-0 ml-1 bg-neutral-100 dark:bg-neutral-900 shadow-sm z-10 pl-1 border-l border-neutral-200 dark:border-neutral-800">
                        <button
                            onClick={scrollLeft}
                            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            title="Scroll Left"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={scrollRight}
                            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            title="Scroll Right"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* ── RIGHT SECTION: GITHUB LINK ── */}
            <div className="flex items-center gap-2 shrink-0">
                <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded hover:bg-neutral-200/70 dark:hover:bg-neutral-800 flex items-center justify-center"
                    title="View GitHub Repository"
                >
                    <GithubIcon className="w-4 h-4" />
                </a>
            </div>

            {/* ── 1. MAIN MENU POPUP (≡) ── */}
            {isMainMenuOpen && (
                <div
                    ref={mainMenuRef}
                    style={{
                        left: `${mainMenuPos.left}px`,
                        bottom: `${mainMenuPos.bottom}px`
                    }}
                    className="fixed-page-popup fixed w-48 max-h-[60vh] flex flex-col bg-neutral-100 dark:bg-[#252526] border border-neutral-300 dark:border-[#3c3c3c] rounded-lg shadow-2xl py-1 z-[9999] text-xs text-neutral-800 dark:text-neutral-200"
                >
                    <button
                        onClick={() => {
                            onAddPage();
                            closeAllMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors shrink-0 font-medium"
                    >
                        Insert Page
                    </button>

                    <div className="my-1 border-t border-neutral-200 dark:border-neutral-700 shrink-0" />

                    {/* Page List */}
                    <div className="overflow-y-auto flex-1 min-h-0 py-0.5 scrollbar-thin">
                        {pages.map((page) => (
                            <div
                                key={page.id}
                                onMouseEnter={(e) => handlePageItemFlyout(e, page)}
                                onClick={(e) => {
                                    onSwitchPage(page.id);
                                    handlePageItemFlyout(e, page);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors cursor-pointer ${page.id === activePageId ? 'font-medium bg-blue-50/60 dark:bg-blue-950/40' : ''
                                    } ${flyoutMenu.page?.id === page.id ? 'bg-neutral-200 dark:bg-[#04395e]' : ''}`}
                            >
                                <span className="flex items-center gap-2 truncate flex-1">
                                    <span className="w-3 flex justify-center shrink-0">
                                        {page.id === activePageId && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                    </span>
                                    <span className="truncate">{page.name}</span>
                                </span>

                                <span className="p-0.5 text-neutral-600 dark:text-neutral-400 shrink-0">
                                    <ChevronRight className="w-3 h-3" />
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="my-1 border-t border-neutral-200 dark:border-neutral-700 shrink-0" />

                    <button
                        disabled
                        className="w-full px-3 py-1.5 text-left text-neutral-400 dark:text-neutral-500 cursor-default shrink-0"
                    >
                        Sort Pages
                    </button>
                </div>
            )}

            {/* ── 2. FLYOUT SUBMENU FOR PAGE ACTIONS ── */}
            {isMainMenuOpen && flyoutMenu.visible && flyoutMenu.page && (
                <div
                    style={{
                        left: `${flyoutMenu.left}px`,
                        top: `${flyoutMenu.top}px`
                    }}
                    className="fixed-page-popup fixed w-48 bg-neutral-100 dark:bg-[#252526] border border-neutral-300 dark:border-[#3c3c3c] rounded-lg shadow-2xl py-1 z-[10000] text-xs text-neutral-800 dark:text-neutral-200"
                >
                    <button
                        onClick={() => startRename(flyoutMenu.page)}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                    >
                        Rename Page...
                    </button>
                    <button
                        disabled={pages.length <= 1}
                        onClick={() => {
                            onClosePage(flyoutMenu.page.id);
                            closeAllMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        Remove Page
                    </button>

                    {/* Move Suboption */}
                    <div className="relative">
                        <button
                            onClick={() => setMoveSubMenuOpen(!moveSubMenuOpen)}
                            onMouseEnter={() => setMoveSubMenuOpen(true)}
                            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                        >
                            <span>Move</span>
                            <ChevronRight className="w-3 h-3 text-neutral-500" />
                        </button>

                        {moveSubMenuOpen && (
                            <div className="absolute left-full top-0 ml-1 w-32 bg-neutral-100 dark:bg-[#252526] border border-neutral-300 dark:border-[#3c3c3c] rounded-lg shadow-xl py-1 z-[10001]">
                                <button
                                    onClick={() => {
                                        handleMovePage(flyoutMenu.page.id, 'left');
                                        closeAllMenus();
                                    }}
                                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                                >
                                    Move Left
                                </button>
                                <button
                                    onClick={() => {
                                        handleMovePage(flyoutMenu.page.id, 'right');
                                        closeAllMenus();
                                    }}
                                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                                >
                                    Move Right
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

                    <button
                        onClick={() => {
                            onDuplicatePage(flyoutMenu.page.id);
                            closeAllMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                    >
                        Duplicate Page
                    </button>
                    {onOpenInNewWindow && (
                        <button
                            onClick={() => {
                                onOpenInNewWindow(flyoutMenu.page.id);
                                closeAllMenus();
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                        >
                            Open in New Window
                        </button>
                    )}
                </div>
            )}

            {/* ── 3. ACTIVE PAGE PILL DROPDOWN MENU ── */}
            {isPageMenuOpen && (
                <div
                    style={{
                        left: `${pageMenuPos.left}px`,
                        bottom: `${pageMenuPos.bottom}px`
                    }}
                    className="fixed-page-popup fixed w-48 bg-neutral-100 dark:bg-[#252526] border border-neutral-300 dark:border-[#3c3c3c] rounded-lg shadow-2xl py-1 z-[9999] text-xs text-neutral-800 dark:text-neutral-200"
                >
                    {onOpenInNewWindow && (
                        <button
                            onClick={() => {
                                onOpenInNewWindow(activePage.id);
                                closeAllMenus();
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                        >
                            Open in New Window
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onDuplicatePage(activePage.id);
                            closeAllMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                    >
                        Duplicate Page
                    </button>

                    <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

                    <button
                        disabled={pages.length <= 1}
                        onClick={() => {
                            onClosePage(activePage.id);
                            closeAllMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        Remove Page
                    </button>
                    <button
                        onClick={() => startRename(activePage)}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                    >
                        Rename Page...
                    </button>
                </div>
            )}

            {/* ── 4. RIGHT-CLICK CONTEXT MENU ── */}
            {contextMenu.visible && contextMenu.page && (
                <div
                    style={{
                        left: `${contextMenu.left}px`,
                        bottom: `${contextMenu.bottom}px`
                    }}
                    className="fixed-page-popup fixed w-48 bg-neutral-100 dark:bg-[#252526] border border-neutral-300 dark:border-[#3c3c3c] rounded-lg shadow-2xl py-1 z-[9999] text-xs text-neutral-800 dark:text-neutral-200"
                >
                    <div className="px-3 py-1 font-semibold text-[11px] text-neutral-400 dark:text-neutral-500 truncate border-b border-neutral-200 dark:border-neutral-700 mb-1">
                        {contextMenu.page.name}
                    </div>
                    <button
                        onClick={() => startRename(contextMenu.page)}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                    >
                        Rename Page...
                    </button>
                    <button
                        disabled={pages.length <= 1}
                        onClick={() => {
                            onClosePage(contextMenu.page.id);
                            closeAllMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        Remove Page
                    </button>

                    <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

                    <button
                        onClick={() => {
                            onDuplicatePage(contextMenu.page.id);
                            closeAllMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                    >
                        Duplicate Page
                    </button>
                    {onOpenInNewWindow && (
                        <button
                            onClick={() => {
                                onOpenInNewWindow(contextMenu.page.id);
                                closeAllMenus();
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-neutral-200 dark:hover:bg-[#04395e] transition-colors"
                        >
                            Open in New Window
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}