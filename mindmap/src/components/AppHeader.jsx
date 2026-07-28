import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
    MousePointer,
    Hand,
    Square,
    Circle,
    Diamond,
    Undo2,
    Redo2,
    Trash2,
    Grid,
    ZoomIn,
    ZoomOut,
    Maximize2,
    FolderOpen,
    Download,
    Pencil,
    Check,
    Layers,
    ChevronRight,
    Palette,
    Sun,
    Moon,
    Monitor,
    Scissors,
    Copy,
    Clipboard,
    Lock,
    Unlock,
    ArrowUp,
    ArrowDown,
    Maximize,
    Minimize,
    Spline,
    Type,
    FileCode,
    FileSpreadsheet,
    Image as ImageIcon,
    FileText,
    ArrowLeftRight,
    Save,
    Search,
    Command,
    MessageSquare,
    ArrowRight,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    Plus,
    Settings,
    Triangle,
    Star,
    Hexagon,
    Database,
    Server,
    Cloud,
    MessageCircle,
    FilePlus,
    HelpCircle,
    Zap,
    Box,
    Workflow,
    Activity
} from 'lucide-react';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { KeyboardShortcutsModal, SupportModal } from './HelpModal';
import DiagramTextImporter from './DiagramTextImporter';
import { SHAPE_CATEGORIES, ShapeIcon } from './shapes/ShapeDefinitions';
import UserProfile from './userProfile';

const ZOOM_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 10];

// Map specific shape IDs to single-key shortcuts
const SHAPE_SHORTCUTS = {
    rectangle: 'R',
    ellipse: 'C',
    diamond: 'D',
    triangle: 'G',
    star: 'S'
};

// Helper icon selection for shape categories
const getCategoryIcon = (catId) => {
    switch (catId) {
        case 'basic': return Square;
        case 'flowchart': return Workflow;
        case 'uml': return Server;
        case 'network': return Cloud;
        default: return Box;
    }
};

export default function AppHeader({
    activePage,
    onRenamePage,
    mode,
    setMode,
    past = [],
    future = [],
    undo,
    redo,
    handleDelete,
    handleAddShape,
    handleAddFreeLine,
    transform,
    setTransform,
    canvasConfig = {},
    setCanvasConfig,
    isFullscreen,
    toggleFullscreen,
    clipboard,
    selectedNode,
    selectedEdge,
    onAction,
    onOpenExport,
    onImport,
    onImportImage,
    pages = [],
    onAddPage,
    onClosePage,
    shapeLibOpen,
    setShapeLibOpen,
    propsSidebarOpen,
    setPropsSidebarOpen,
    onAiGenerate = () => { }
}) {
    const { theme, setTheme } = useTheme();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleText, setTitleText] = useState(activePage?.name || 'Untitled Diagram');
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Dynamic OS / Device Detection
    const [isMac, setIsMac] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userAgent = navigator.userAgent || navigator.platform || '';
            setIsMac(/Mac|iPod|iPhone|iPad/i.test(userAgent));
        }
    }, []);

    const mod = isMac ? '⌘' : 'Ctrl';

    // Search in Help & Highlighting
    const [helpSearchQuery, setHelpSearchQuery] = useState('');
    const [highlightedItemId, setHighlightedItemId] = useState(null);

    // Modals
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const dropdownRef = useRef(null);

    const hasClipboard = (clipboard?.nodes?.length > 0 || clipboard?.edges?.length > 0);
    const isLocked = selectedNode?.locked;
    const hasSelection = !!(selectedNode || selectedEdge);
    const hasNodeSelection = !!selectedNode;
    const hasEdgeSelection = !!selectedEdge;

    useEffect(() => {
        if (activePage?.name) {
            setTitleText(activePage.name);
        }
    }, [activePage?.name]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTitleSubmit = () => {
        setIsEditingTitle(false);
        if (titleText.trim() && activePage?.id) {
            onRenamePage(activePage.id, titleText.trim());
        }
    };

    const currentZoomPercent = Math.round((transform?.scale || 1) * 100);

    const handleZoomIn = () => {
        const idx = ZOOM_PRESETS.findIndex(z => z > (transform?.scale || 1));
        const next = idx >= 0 ? ZOOM_PRESETS[idx] : 10;
        setTransform(p => ({ ...p, scale: next }));
    };

    const handleZoomOut = () => {
        const idx = ZOOM_PRESETS.findIndex(z => z >= (transform?.scale || 1));
        const prev = idx > 0 ? ZOOM_PRESETS[idx - 1] : 0.1;
        setTransform(p => ({ ...p, scale: prev }));
    };

    const handleFitPage = () => {
        setTransform({ x: 50, y: 50, scale: 1 });
        if (onAction) onAction('fitPage');
    };

    const handleFileChange = (e) => {
        if (onImport) onImport(e);
        if (e.target) e.target.value = null;
    };

    const handleImageFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file && onImportImage) {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => onImportImage(reader.result, img.naturalWidth, img.naturalHeight);
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = null;
    };

    const closeDropdowns = () => setActiveDropdown(null);

    const triggerAction = (actionName) => {
        if (onAction) onAction(actionName);
    };

    // ── KEYBOARD SHORTCUTS GLOBAL LISTENER ──
    const actionHandlers = useMemo(
        () => ({
            addPage: () => onAddPage?.(),
            openFile: () => fileInputRef?.current?.click(),
            saveFile: () => onOpenExport?.('drawmap'),
            undo: () => (past?.length ?? 0) > 0 && undo?.(),
            redoShift: () => (future?.length ?? 0) > 0 && redo?.(),
            redo: () => (future?.length ?? 0) > 0 && redo?.(),
            cut: () => hasSelection && !isLocked && triggerAction?.('cut'),
            copy: () => hasSelection && triggerAction?.('copy'),
            paste: () => hasClipboard && triggerAction?.('paste'),
            duplicate: () => hasSelection && !isLocked && triggerAction?.('duplicate'),
            selectAll: () => triggerAction?.('selectAll'),
            reverseDirection: () => hasEdgeSelection && triggerAction?.('reverseDirection'),
            editTitle: () => setIsEditingTitle?.(true),
            insertImage: () => imageInputRef?.current?.click(),
            lock: () => hasNodeSelection && triggerAction?.('lock'),
            toFront: () => hasNodeSelection && triggerAction?.('toFront'),
            toBack: () => hasNodeSelection && triggerAction?.('toBack'),
            shapeLib: () => setShapeLibOpen?.((prev) => !prev),
            propsSidebar: () => setPropsSidebarOpen?.((prev) => !prev),
            toggleGrid: () => setCanvasConfig?.((prev) => ({ ...prev, showGrid: !prev.showGrid })),
            resetViewport: () => setTransform?.({ x: 50, y: 50, scale: 1 }),
            fitPage: () => handleFitPage?.(),
            zoomIn: () => handleZoomIn?.(),
            zoomOut: () => handleZoomOut?.(),
            shortcutsHelp: () => setIsShortcutsOpen(true),
            delete: () => hasSelection && handleDelete?.(),
            editText: () => hasNodeSelection && triggerAction?.('editText'),
            fullscreen: () => toggleFullscreen?.(),
            selectTool: () => setMode?.('select'),
            panTool: () => setMode?.('pan'),
            addText: () => handleAddShape?.('text'),
            addFreeLine: () => handleAddFreeLine?.(),
            addRectangle: () => handleAddShape?.('rectangle'),
            addEllipse: () => handleAddShape?.('ellipse'),
            addDiamond: () => handleAddShape?.('diamond'),
            addTriangle: () => handleAddShape?.('triangle'),
            addStar: () => handleAddShape?.('star'),
        }),
        [
            hasSelection,
            isLocked,
            hasClipboard,
            hasNodeSelection,
            hasEdgeSelection,
            past,
            future,
            undo,
            redo,
            handleDelete,
            handleAddShape,
            handleAddFreeLine,
            setMode,
            setTransform,
            setCanvasConfig,
            setShapeLibOpen,
            setPropsSidebarOpen,
            toggleFullscreen,
            onAddPage,
            onOpenExport,
            triggerAction,
            handleFitPage,
            handleZoomIn,
            handleZoomOut,
            fileInputRef,
            imageInputRef,
            setIsEditingTitle,
        ]
    );

    useKeyboardShortcuts(actionHandlers);

    // ── MASTER MENU CONFIGURATION ──
    const menuConfig = useMemo(() => [
        {
            id: 'file',
            label: 'File',
            items: [
                { id: 'file-new', label: 'New Page', icon: FilePlus, shortcut: `${mod}+N`, onClick: onAddPage },
                {
                    id: 'file-import',
                    label: 'Open Diagram...',
                    icon: FolderOpen,
                    shortcut: `${mod}+O`,
                    iconColor: 'text-[#0078d4]',
                    onClick: () => fileInputRef.current?.click()
                },
                { type: 'divider' },
                {
                    id: 'file-save',
                    label: 'Save Diagram',
                    icon: Save,
                    shortcut: `${mod}+S`,
                    iconColor: 'text-[#0078d4]',
                    onClick: () => onOpenExport('drawmap')
                },
                {
                    id: 'file-save-as',
                    label: 'Save As...',
                    icon: Save,
                    shortcut: `${mod}+Shift+S`,
                    onClick: () => onOpenExport('drawmap')
                },
                {
                    id: 'file-export',
                    label: 'Export As',
                    icon: Download,
                    submenu: [
                        { id: 'export-drawmap', label: 'DrawMap Format (.drawmap)', icon: Save, onClick: () => onOpenExport('drawmap') },
                        { id: 'export-png', label: 'PNG Image (.png)', icon: ImageIcon, onClick: () => onOpenExport('png') },
                        { id: 'export-jpeg', label: 'JPEG Image (.jpeg)', icon: ImageIcon, onClick: () => onOpenExport('jpeg') },
                        { id: 'export-svg', label: 'SVG Vector (.svg)', icon: ImageIcon, onClick: () => onOpenExport('svg') },
                        { id: 'export-pdf', label: 'PDF Document (.pdf)', icon: FileText, onClick: () => onOpenExport('pdf') },
                        { id: 'export-xml', label: 'XML Document (.xml)', icon: FileCode, onClick: () => onOpenExport('xml') },
                        { id: 'export-json', label: 'JSON Data (.json)', icon: FileSpreadsheet, onClick: () => onOpenExport('json') },
                        { id: 'export-html', label: 'HTML Webpage (.html)', icon: FileCode, onClick: () => onOpenExport('html') }
                    ]
                },
                { type: 'divider' },
                { id: 'file-rename', label: 'Rename Page', icon: Pencil, shortcut: `${mod}+R`, onClick: () => setIsEditingTitle(true) },
                { type: 'divider' },
                {
                    id: 'file-delete',
                    label: 'Delete Page',
                    icon: Trash2,
                    danger: true,
                    onClick: () => onClosePage && activePage && onClosePage(activePage.id),
                    disabled: !pages || pages.length <= 1
                }
            ]
        },
        {
            id: 'edit',
            label: 'Edit',
            items: [
                { id: 'edit-undo', label: 'Undo', icon: Undo2, shortcut: `${mod}+Z`, onClick: undo, disabled: past.length === 0 },
                { id: 'edit-redo', label: 'Redo', icon: Redo2, shortcut: `${mod}+Y`, onClick: redo, disabled: future.length === 0 },
                { type: 'divider' },
                { id: 'edit-cut', label: 'Cut', icon: Scissors, shortcut: `${mod}+X`, onClick: () => triggerAction('cut'), disabled: !hasSelection || isLocked },
                { id: 'edit-copy', label: 'Copy', icon: Copy, shortcut: `${mod}+C`, onClick: () => triggerAction('copy'), disabled: !hasSelection },
                { id: 'edit-paste', label: 'Paste', icon: Clipboard, shortcut: `${mod}+V`, onClick: () => triggerAction('paste'), disabled: !hasClipboard },
                { id: 'edit-duplicate', label: 'Duplicate', icon: Layers, shortcut: `${mod}+D`, onClick: () => triggerAction('duplicate'), disabled: !hasSelection || isLocked },
                { type: 'divider' },
                { id: 'edit-select-all', label: 'Select All', icon: Square, shortcut: `${mod}+A`, onClick: () => triggerAction('selectAll') },
                { id: 'edit-text', label: 'Edit Text', icon: Type, shortcut: 'F2', onClick: () => triggerAction('editText'), disabled: !hasNodeSelection },
                { type: 'divider' },
                { id: 'edit-delete', label: 'Delete Selected', icon: Trash2, shortcut: 'Del', onClick: handleDelete, danger: true, disabled: !hasSelection }
            ]
        },
        {
            id: 'insert',
            label: 'Insert',
            items: [
                {
                    id: 'insert-image',
                    label: 'Image',
                    icon: ImageIcon,
                    shortcut: `${mod}+I`,
                    onClick: () => imageInputRef.current?.click()
                },
                {
                    id: 'insert-text',
                    label: 'Text Box',
                    icon: Type,
                    shortcut: 'T',
                    onClick: () => handleAddShape('text')
                },
                { type: 'divider' },
                // Dynamically import shapes categories from ShapeDefinitions
                ...SHAPE_CATEGORIES.map(category => ({
                    id: `insert-cat-${category.id}`,
                    label: category.label,
                    icon: getCategoryIcon(category.id),
                    submenu: category.shapes.map(shape => ({
                        id: `insert-shape-${shape.id}`,
                        label: shape.label,
                        icon: () => (
                            <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                <ShapeIcon type={shape.id} />
                            </div>
                        ),
                        shortcut: SHAPE_SHORTCUTS[shape.id] || undefined,
                        onClick: () => handleAddShape(shape.id)
                    }))
                }))
            ]
        },
        {
            id: 'arrange',
            label: 'Arrange',
            items: [
                {
                    id: 'arrange-lock',
                    label: isLocked ? 'Unlock Element' : 'Lock Element',
                    icon: isLocked ? Unlock : Lock,
                    shortcut: `${mod}+L`,
                    onClick: () => triggerAction('lock'),
                    disabled: !hasNodeSelection
                },
                { type: 'divider' },
                { id: 'arrange-front', label: 'Bring To Front', icon: ArrowUp, shortcut: `${mod}+]`, onClick: () => triggerAction('toFront'), disabled: !hasNodeSelection },
                { id: 'arrange-back', label: 'Send To Back', icon: ArrowDown, shortcut: `${mod}+[`, onClick: () => triggerAction('toBack'), disabled: !hasNodeSelection }
            ]
        },
        {
            id: 'view',
            label: 'View',
            items: [
                {
                    id: 'view-shape-lib',
                    label: 'Shapes Library (Left)',
                    icon: shapeLibOpen ? PanelLeftClose : PanelLeftOpen,
                    shortcut: `${mod}+1`,
                    checked: shapeLibOpen,
                    onClick: () => setShapeLibOpen?.(prev => !prev)
                },
                {
                    id: 'view-props-sidebar',
                    label: 'Properties Panel (Right)',
                    icon: propsSidebarOpen ? PanelRightClose : PanelRightOpen,
                    shortcut: `${mod}+2`,
                    checked: propsSidebarOpen,
                    onClick: () => setPropsSidebarOpen?.(prev => !prev)
                },
                { type: 'divider' },
                {
                    id: 'view-grid',
                    label: 'Toggle Grid',
                    icon: Grid,
                    shortcut: `${mod}+'`,
                    checked: canvasConfig.showGrid !== false,
                    onClick: () => setCanvasConfig(prev => ({ ...prev, showGrid: !prev.showGrid }))
                },
                {
                    id: 'view-fullscreen',
                    label: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
                    icon: Maximize,
                    shortcut: 'F11',
                    onClick: toggleFullscreen
                },
                { type: 'divider' },
                {
                    id: 'view-theme',
                    label: 'Theme Mode',
                    icon: Palette,
                    submenu: [
                        { id: 'theme-system', label: 'System Theme', icon: Monitor, checked: theme === 'system', onClick: () => setTheme('system') },
                        { id: 'theme-light', label: 'Light Mode', icon: Sun, checked: theme === 'light', onClick: () => setTheme('light') },
                        { id: 'theme-dark', label: 'Dark Mode', icon: Moon, checked: theme === 'dark', onClick: () => setTheme('dark') }
                    ]
                },
                { type: 'divider' },
                { id: 'view-fit', label: 'Fit to Page', icon: Maximize2, shortcut: `${mod}+0`, onClick: handleFitPage },
                { id: 'view-reset', label: 'Reset Zoom (100%)', icon: ZoomIn, shortcut: `${mod}+Alt+0`, onClick: () => setTransform({ x: 50, y: 50, scale: 1 }) }
            ]
        }
    ], [activePage, canvasConfig.showGrid, future.length, handleAddFreeLine, handleAddShape, handleDelete, hasClipboard, hasNodeSelection, hasSelection, isFullscreen, isLocked, mod, onAddPage, onClosePage, onOpenExport, pages, past.length, propsSidebarOpen, redo, setCanvasConfig, setPropsSidebarOpen, setShapeLibOpen, setTheme, setTransform, shapeLibOpen, theme, toggleFullscreen, undo]);

    // ── FLATTEN ALL COMMANDS FOR UNIVERSAL HELP SEARCH ──
    const allSearchableCommands = useMemo(() => {
        const flatList = [];
        const extractItems = (items, categoryPath, menuId) => {
            items.forEach(item => {
                if (item.type === 'divider') return;
                if (item.submenu) {
                    extractItems(item.submenu, `${categoryPath} → ${item.label}`, menuId);
                } else {
                    flatList.push({
                        id: item.id,
                        label: item.label,
                        categoryPath,
                        menuId,
                        icon: item.icon,
                        shortcut: item.shortcut,
                        onClick: item.onClick
                    });
                }
            });
        };

        menuConfig.forEach(menu => {
            extractItems(menu.items, menu.label, menu.id);
        });
        return flatList;
    }, [menuConfig]);

    // Filter Search Options
    const loadedSearchOptions = useMemo(() => {
        if (!helpSearchQuery.trim()) {
            return allSearchableCommands.slice(0, 8);
        }
        const q = helpSearchQuery.toLowerCase();
        return allSearchableCommands.filter(cmd =>
            cmd.label.toLowerCase().includes(q) || cmd.categoryPath.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [helpSearchQuery, allSearchableCommands]);

    const handleSelectSearchCommand = (cmd) => {
        if (cmd.onClick) {
            cmd.onClick();
        } else {
            setActiveDropdown(cmd.menuId);
            setHighlightedItemId(cmd.id);
            setTimeout(() => setHighlightedItemId(null), 3500);
        }
        setHelpSearchQuery('');
        closeDropdowns();
    };

    return (
        <header className="w-full bg-white dark:bg-[#1e1e1e] border-b border-neutral-200 dark:border-[#2d2d2d] text-neutral-800 dark:text-neutral-200 font-sans select-none z-50 shadow-xs dark:shadow-md transition-colors">
            <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} isMac={isMac} />
            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

            {/* Hidden File Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json,.drawmap,.xml"
                onChange={handleFileChange}
            />
            <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageFileChange}
            />

            {/* ── TOP BAR: BRAND, TITLE & MENUS ── */}
            <div className="flex items-center justify-between px-3 h-10 border-b border-neutral-200 dark:border-[#2b2b2b] text-xs">
                <div className="flex items-center gap-3" ref={dropdownRef}>
                    <div className="flex items-center gap-2">
                        <img src="./logo/favicon-32x32.png" alt="flow logo" className="w-5 h-5 object-contain" />
                        <span className="font-semibold text-neutral-900 dark:text-white tracking-wide">Flow</span>
                    </div>

                    <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700" />

                    <div className="flex items-center gap-1.5">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={titleText}
                                    onChange={(e) => setTitleText(e.target.value)}
                                    onBlur={handleTitleSubmit}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                                    className="bg-neutral-100 dark:bg-[#2d2d2d] text-neutral-900 dark:text-white px-2 py-0.5 rounded border border-[#0078d4] outline-hidden text-xs font-medium w-48"
                                    autoFocus
                                />
                                <button
                                    onClick={handleTitleSubmit}
                                    className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-green-600 dark:text-green-400"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="group flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-[#2b2b2b] transition-colors text-neutral-900 dark:text-white font-medium"
                                title="Click to rename"
                            >
                                <span>{titleText}</span>
                                <Pencil className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-[#2b2b2b] px-1.5 py-0.5 rounded font-mono">
                            Saved
                        </span>
                    </div>

                    <nav className="flex items-center ml-2 relative">
                        {menuConfig.map((menu) => (
                            <div key={menu.id} className="relative">
                                <button
                                    onClick={() => setActiveDropdown(prev => (prev === menu.id ? null : menu.id))}
                                    onMouseEnter={() => {
                                        if (activeDropdown !== null) {
                                            setActiveDropdown(menu.id);
                                        }
                                    }}
                                    className={`px-2.5 py-1 rounded transition-colors text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2b2b2b] ${activeDropdown === menu.id ? 'bg-neutral-200 dark:bg-[#2b2b2b] text-neutral-900 dark:text-white' : ''
                                        }`}
                                >
                                    {menu.label}
                                </button>

                                {activeDropdown === menu.id && (
                                    <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#252526] border border-neutral-200 dark:border-[#3c3c3c] rounded-md shadow-xl py-1 z-50">
                                        {menu.items.map((item, idx) => (
                                            <MenuItem
                                                key={item.id || idx}
                                                item={item}
                                                onClose={closeDropdowns}
                                                highlightedItemId={highlightedItemId}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* HELP MENU DROPDOWN */}
                        <div className="relative">
                            <button
                                onClick={() => setActiveDropdown(prev => (prev === 'help' ? null : 'help'))}
                                onMouseEnter={() => {
                                    if (activeDropdown !== null) setActiveDropdown('help');
                                }}
                                className={`px-2.5 py-1 rounded transition-colors text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2b2b2b] ${activeDropdown === 'help' ? 'bg-neutral-200 dark:bg-[#2b2b2b] text-neutral-900 dark:text-white' : ''
                                    }`}
                            >
                                Help
                            </button>

                            {activeDropdown === 'help' && (
                                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-[#252526] border border-neutral-200 dark:border-[#3c3c3c] rounded-lg shadow-xl p-1.5 z-50">
                                    <div className="relative mb-1.5 p-1">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        <input
                                            type="text"
                                            placeholder="Search commands & shapes (e.g. png, circle, save)..."
                                            value={helpSearchQuery}
                                            onChange={(e) => setHelpSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-2.5 py-1 text-xs rounded border border-neutral-200 dark:border-[#3c3c3c] bg-neutral-50 dark:bg-[#1e1e1e] text-neutral-900 dark:text-white focus:outline-hidden focus:border-[#0078d4]"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                            {helpSearchQuery ? 'Search Results' : 'Quick Actions'}
                                        </div>
                                        {loadedSearchOptions.length > 0 ? (
                                            loadedSearchOptions.map((cmd) => {
                                                const Icon = cmd.icon || HelpCircle;
                                                return (
                                                    <button
                                                        key={cmd.id}
                                                        onClick={() => handleSelectSearchCommand(cmd)}
                                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-[#04395e] flex items-center justify-between text-xs text-neutral-800 dark:text-neutral-200 group transition-colors"
                                                    >
                                                        <span className="flex items-center gap-2 truncate">
                                                            <Icon className="w-3.5 h-3.5 text-[#0078d4] shrink-0" />
                                                            <span className="truncate">{cmd.label}</span>
                                                        </span>
                                                        <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1 shrink-0 ml-2">
                                                            {cmd.shortcut ? (
                                                                <span className="bg-neutral-100 dark:bg-[#333] px-1 py-0.5 rounded text-[9px]">{cmd.shortcut}</span>
                                                            ) : (
                                                                <span>{cmd.categoryPath}</span>
                                                            )}
                                                            <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="px-2 py-2 text-center text-neutral-400 text-xs">
                                                No matching commands found
                                            </div>
                                        )}
                                    </div>

                                    <div className="my-1.5 border-t border-neutral-200 dark:border-[#3c3c3c]" />

                                    <button
                                        onClick={() => {
                                            closeDropdowns();
                                            setIsShortcutsOpen(true);
                                        }}
                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-[#04395e] flex items-center justify-between text-xs text-neutral-800 dark:text-neutral-200"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Command className="w-3.5 h-3.5 text-neutral-500" />
                                            <span>Keyboard Shortcuts</span>
                                        </span>
                                        <span className="text-[10px] text-neutral-400 font-mono">{mod}/</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            closeDropdowns();
                                            setIsSupportOpen(true);
                                        }}
                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-[#04395e] flex items-center justify-between text-xs text-neutral-800 dark:text-neutral-200"
                                    >
                                        <span className="flex items-center gap-2">
                                            <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                                            <span>Get Support & Feedback</span>
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onOpenExport('drawmap')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium rounded shadow-xs transition-colors text-xs active:scale-[0.98]"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save (.drawmap)</span>
                    </button>

                    <UserProfile />
                </div>
            </div>

            {/* ── BOTTOM RIBBON TOOLBAR ── */}
            <div className="flex items-center justify-between px-3 py-1 bg-neutral-100 dark:bg-[#252526] text-xs">
                <div className="flex items-center gap-1">
                    {/* LEFT SIDEBAR TOGGLE BUTTON */}
                    <button
                        onClick={() => setShapeLibOpen?.(prev => !prev)}
                        className={`p-1.5 rounded transition-colors ${shapeLibOpen
                            ? 'bg-neutral-200 dark:bg-[#333333] text-[#0078d4]'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-[#333333] hover:text-neutral-900 dark:hover:text-white'
                            }`}
                        title={shapeLibOpen ? `Hide Shapes Library (${mod}+1)` : `Show Shapes Library (${mod}+1)`}
                    >
                        {shapeLibOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                    </button>

                    <div className="h-5 w-[1px] bg-neutral-300 dark:bg-[#383838] mx-1" />

                    {/* INTERACTION TOOLS */}
                    <div className="flex items-center bg-white dark:bg-[#1e1e1e] p-0.5 rounded border border-neutral-200 dark:border-[#333333]">
                        <button
                            onClick={() => setMode('select')}
                            className={`p-1.5 rounded transition-all flex items-center gap-1 ${mode === 'select'
                                ? 'bg-[#0078d4] text-white shadow-xs'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#2d2d2d]'
                                }`}
                            title="Select Tool (V)"
                        >
                            <MousePointer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setMode('pan')}
                            className={`p-1.5 rounded transition-all flex items-center gap-1 ${mode === 'pan'
                                ? 'bg-[#0078d4] text-white shadow-xs'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#2d2d2d]'
                                }`}
                            title="Pan / Hand Tool (H)"
                        >
                            <Hand className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-5 w-[1px] bg-neutral-300 dark:bg-[#383838] mx-1" />

                    {/* HISTORY CONTROLS */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={undo}
                            disabled={past.length === 0}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Undo (${mod}+Z)`}
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={redo}
                            disabled={future.length === 0}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Redo (${mod}+Y)`}
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-5 w-[1px] bg-neutral-300 dark:bg-[#383838] mx-1" />

                    {/* EDIT & CLIPBOARD TOOLS */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => triggerAction('cut')}
                            disabled={!hasSelection || isLocked}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Cut (${mod}+X)`}
                        >
                            <Scissors className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => triggerAction('copy')}
                            disabled={!hasSelection}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Copy (${mod}+C)`}
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => triggerAction('paste')}
                            disabled={!hasClipboard}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Paste (${mod}+V)`}
                        >
                            <Clipboard className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => triggerAction('duplicate')}
                            disabled={!hasSelection || isLocked}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Duplicate (${mod}+D)`}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={!hasSelection}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Delete Selected (Del)"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-5 w-[1px] bg-neutral-300 dark:bg-[#383838] mx-1" />

                    {/* ARRANGEMENT TOOLS */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => triggerAction('toFront')}
                            disabled={!hasNodeSelection}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Bring To Front (${mod}+])`}
                        >
                            <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => triggerAction('toBack')}
                            disabled={!hasNodeSelection}
                            className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={`Send To Back (${mod}+[)`}
                        >
                            <ArrowDown className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-5 w-[1px] bg-neutral-300 dark:bg-[#383838] mx-1" />
                    <DiagramTextImporter onGenerate={onAiGenerate} />
                </div>

                {/* RIGHT CONTROLS */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-[#333333] hover:text-neutral-900 dark:hover:text-white transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
                    >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={() => setCanvasConfig(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                        className={`p-1.5 rounded transition-colors ${canvasConfig.showGrid !== false
                            ? 'bg-neutral-200 dark:bg-[#333333] text-[#0078d4]'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-[#333333] hover:text-neutral-900 dark:hover:text-white'
                            }`}
                        title={`Toggle Grid (${mod}+')`}
                    >
                        <Grid className="w-4 h-4" />
                    </button>

                    <div className="h-5 w-[1px] bg-neutral-300 dark:bg-[#383838] mx-1" />

                    <div className="flex items-center bg-white dark:bg-[#1e1e1e] rounded border border-neutral-200 dark:border-[#333333] px-1 py-0.5">
                        <button
                            onClick={handleZoomOut}
                            className="p-1 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#333333] transition-colors"
                            title={`Zoom Out (${mod}+-)`}
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={handleFitPage}
                            className="px-2 text-[11px] font-mono text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            title={`Fit Page (${mod}+0)`}
                        >
                            {currentZoomPercent}%
                        </button>

                        <button
                            onClick={handleZoomIn}
                            className="p-1 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#333333] transition-colors"
                            title={`Zoom In (${mod}+=)`}
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="h-5 w-[1px] bg-neutral-300 dark:bg-[#383838] mx-1" />

                    {/* RIGHT SIDEBAR TOGGLE BUTTON */}
                    <button
                        onClick={() => setPropsSidebarOpen?.(prev => !prev)}
                        className={`p-1.5 rounded transition-colors ${propsSidebarOpen
                            ? 'bg-neutral-200 dark:bg-[#333333] text-[#0078d4]'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-[#333333] hover:text-neutral-900 dark:hover:text-white'
                            }`}
                        title={propsSidebarOpen ? `Hide Properties Panel (${mod}+2)` : `Show Properties Panel (${mod}+2)`}
                    >
                        {propsSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </header>
    );
}

// ── REUSABLE MENU ITEM SUPPORTING AUTOMATIC SUBMENU EXPANSION & SEARCH LOCATOR BLINKING ──
function MenuItem({ item, onClose, highlightedItemId }) {
    if (item.type === 'divider') {
        return <div className="my-1 border-t border-neutral-200 dark:border-[#3c3c3c]" />;
    }

    const Icon = item.icon;
    const isSelfHighlighted = highlightedItemId === item.id;
    const hasHighlightedChild = item.submenu?.some(sub => sub.id === highlightedItemId);

    if (item.submenu) {
        return (
            <div className="relative group">
                <button
                    className={`relative w-full text-left pl-3.5 pr-2.5 py-1.5 flex items-center justify-between text-xs rounded-md transition-all duration-150 select-none ${hasHighlightedChild
                        ? 'bg-amber-100/90 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 font-medium ring-1 ring-inset ring-amber-500/60 dark:ring-amber-500/50'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                        }`}
                >
                    {hasHighlightedChild && (
                        <span className="absolute left-1 top-1.5 bottom-1.5 w-1 bg-amber-500 rounded-full" />
                    )}

                    <span className="flex items-center gap-2 min-w-0 truncate">
                        {Icon && (
                            <Icon
                                className={`w-4 h-4 shrink-0 transition-colors ${hasHighlightedChild
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : item.iconColor || 'text-neutral-500 dark:text-neutral-400'
                                    }`}
                            />
                        )}
                        <span className="truncate">{item.label}</span>
                    </span>

                    <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-colors ml-2 ${hasHighlightedChild
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-neutral-400 dark:text-neutral-500'
                            }`}
                    />
                </button>

                <div
                    className={`absolute top-0 left-full ml-0 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-1 z-50 ${hasHighlightedChild ? 'block' : 'hidden group-hover:block'
                        }`}
                >
                    {item.submenu.map((sub, sIdx) => (
                        <MenuItem
                            key={sub.id || sIdx}
                            item={sub}
                            onClose={onClose}
                            highlightedItemId={highlightedItemId}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <button
            disabled={item.disabled}
            onClick={() => {
                if (item.onClick) item.onClick();
                onClose();
            }}
            className={`relative w-full text-left pl-3.5 pr-2.5 py-1.5 flex items-center justify-between text-xs rounded-md transition-all duration-150 select-none ${isSelfHighlighted
                ? 'bg-amber-100/90 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 font-medium ring-1 ring-inset ring-amber-500/60 dark:ring-amber-500/50'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                } ${item.danger ? '!text-red-600 dark:!text-red-400' : ''} disabled:opacity-40 disabled:pointer-events-none`}
        >
            {isSelfHighlighted && (
                <span className="absolute left-1 top-1.5 bottom-1.5 w-1 bg-amber-500 rounded-full animate-pulse" />
            )}

            <span className="flex items-center gap-2 min-w-0 truncate">
                {Icon && (
                    <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${isSelfHighlighted
                            ? 'text-amber-600 dark:text-amber-400'
                            : item.iconColor || 'text-neutral-500 dark:text-neutral-400'
                            }`}
                    />
                )}
                <span className="truncate">{item.label}</span>
            </span>

            <div className="flex items-center gap-2 shrink-0 ml-2">
                {item.shortcut && (
                    <span
                        className={`text-[10px] font-mono tracking-wider px-1 py-0.2 rounded bg-neutral-100 dark:bg-[#333] ${isSelfHighlighted
                            ? 'text-amber-800/80 dark:text-amber-300/80'
                            : 'text-neutral-400 dark:text-neutral-400'
                            }`}
                    >
                        {item.shortcut}
                    </span>
                )}
                {item.checked && (
                    <Check
                        className={`w-3.5 h-3.5 ${isSelfHighlighted ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                    />
                )}
            </div>
        </button>
    );
}