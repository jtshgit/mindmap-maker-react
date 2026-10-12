import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
    Type,
    FileCode,
    FileSpreadsheet,
    ImageIcon,
    FileText,
    Save,
    Search,
    Command,
    MessageSquare,
    ArrowRight,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    FilePlus,
    HelpCircle,
    Box,
    Workflow,
    Server,
    Cloud,
    Clock,
    List,
    Loader2,
    X,
    Plus,
    ExternalLink,
    FolderUp,
    LogIn
} from 'lucide-react';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { KeyboardShortcutsModal, SupportModal } from './HelpModal';
import DiagramTextImporter from './DiagramTextImporter';
import { SHAPE_CATEGORIES, ShapeIcon } from './shapes/ShapeDefinitions';
import UserProfile from './userProfile';
import DiagramManagerModal from './DiagramManagerModal';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3010';
const ACCOUNT_APP_URL = process.env.REACT_APP_ACCOUNT_URL || 'http://localhost:3001';
const ZOOM_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 10];

const SHAPE_SHORTCUTS = {
    rectangle: 'R',
    ellipse: 'C',
    diamond: 'D',
    triangle: 'G',
    star: 'S'
};

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
    onAiGenerate = () => { },
    getCurrentDiagramData = () => ({}),
    onLoadFile = () => { },
    onNewProject,
    svgRef
}) {
    // Theme
    const { theme, setTheme } = useTheme();

    // User Authentication State
    const [currentUser, setCurrentUser] = useState(null);
    const [userLoading, setUserLoading] = useState(true);
    const [loginRequiredModalOpen, setLoginRequiredModalOpen] = useState(false);
    const [loginPromptReason, setLoginPromptReason] = useState('save');

    // Fetch user profile status
    useEffect(() => {
        axios
            .get(`${API_BASE}/api/me`, { withCredentials: true })
            .then((res) => {
                setCurrentUser(res.data);
            })
            .catch(() => {
                setCurrentUser({ success: false });
            })
            .finally(() => {
                setUserLoading(false);
            });
    }, []);

    const isLoggedIn = !!(currentUser?.success && currentUser?.user);

    const requireLogin = useCallback((reason = 'save') => {
        if (!isLoggedIn) {
            setLoginPromptReason(reason);
            setLoginRequiredModalOpen(true);
            return false;
        }
        return true;
    }, [isLoggedIn]);

    // Save & File Management State
    const [currentFileId, setCurrentFileId] = useState(null);
    const [currentFileName, setCurrentFileName] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [justSaved, setJustSaved] = useState(false);
    const [recentFiles, setRecentFiles] = useState([]);
    const [allFiles, setAllFiles] = useState([]);

    // Project Name is distinct from Active Page Name
    const [projectName, setProjectName] = useState('Untitled Diagram');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleText, setTitleText] = useState('Untitled Diagram');
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Modals State
    const [nameModalOpen, setNameModalOpen] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [managerModalOpen, setManagerModalOpen] = useState(false);
    const [confirmNewModalOpen, setConfirmNewModalOpen] = useState(false);
    const pendingNewProjectAfterSaveRef = useRef(false);

    // OS Detection
    const [isMac, setIsMac] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userAgent = navigator.userAgent || navigator.platform || '';
            setIsMac(/Mac|iPod|iPhone|iPad/i.test(userAgent));
        }
    }, []);

    const mod = isMac ? '⌘' : 'Ctrl';

    const [helpSearchQuery, setHelpSearchQuery] = useState('');
    const [highlightedItemId, setHighlightedItemId] = useState(null);
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

    // Keep project name in sync with currentFileName
    useEffect(() => {
        if (currentFileName) {
            setProjectName(currentFileName);
            setTitleText(currentFileName);
        }
    }, [currentFileName]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── API HANDLERS ──
    const fetchFiles = useCallback(async (tab = 'recent') => {
        if (!isLoggedIn) {
            setRecentFiles([]);
            setAllFiles([]);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/files?filter=${tab}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load saved files');
            const data = await res.json();
            if (tab === 'recent') setRecentFiles(data);
            else setAllFiles(data);
        } catch (err) {
            setSaveError(err.message);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn) {
            fetchFiles('recent');
        } else {
            setRecentFiles([]);
            setAllFiles([]);
        }
    }, [isLoggedIn, fetchFiles]);

    useEffect(() => {
        if (isLoggedIn && (activeDropdown === 'file' || managerModalOpen)) {
            fetchFiles('recent');
        }
    }, [isLoggedIn, activeDropdown, managerModalOpen, fetchFiles]);

    const doSave = useCallback(async (name, fileIdOverride) => {
        if (!requireLogin('save')) return;
        setSaving(true);
        setSaveError(null);
        try {
            const data = getCurrentDiagramData ? getCurrentDiagramData() : {};
            const targetId = fileIdOverride !== undefined ? fileIdOverride : currentFileId;
            const res = await fetch(`${API_BASE}/api/files/save`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: targetId,
                    name,
                    data,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Save failed');
            }
            const saved = await res.json();
            setCurrentFileId(saved.file_id);
            setCurrentFileName(saved.name);
            setProjectName(saved.name);
            setTitleText(saved.name);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2000);
            fetchFiles('recent');
            return saved;
        } catch (err) {
            setSaveError(err.message);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [getCurrentDiagramData, currentFileId, fetchFiles, requireLogin]);

    const executeNewProject = useCallback(() => {
        if (onNewProject) {
            onNewProject();
        } else if (onAddPage) {
            onAddPage();
        }
        setCurrentFileId(null);
        setCurrentFileName(null);
        setProjectName('Untitled Diagram');
        setTitleText('Untitled Diagram');
        setConfirmNewModalOpen(false);
    }, [onNewProject, onAddPage]);

    const handleNewProjectRequest = useCallback(() => {
        const data = getCurrentDiagramData ? getCurrentDiagramData() : {};
        const hasContent = data?.pages?.some(p => (p.nodes && p.nodes.length > 0) || (p.edges && p.edges.length > 0));
        if (hasContent && !justSaved) {
            setConfirmNewModalOpen(true);
        } else {
            executeNewProject();
        }
    }, [getCurrentDiagramData, justSaved, executeNewProject]);

    const handleSaveAndNewProject = useCallback(async () => {
        setConfirmNewModalOpen(false);
        if (!requireLogin('save')) return;
        if (currentFileId) {
            try {
                await doSave(currentFileName || projectName);
                executeNewProject();
            } catch (err) {
                // error handled in doSave
            }
        } else {
            pendingNewProjectAfterSaveRef.current = true;
            setNameInput(projectName || 'Untitled Diagram');
            setNameModalOpen(true);
        }
    }, [currentFileId, currentFileName, projectName, doSave, executeNewProject, requireLogin]);

    const handleSaveClick = useCallback(() => {
        if (!requireLogin('save')) return;
        if (currentFileId) {
            doSave(currentFileName || projectName);
        } else {
            setNameInput(projectName || 'Untitled Diagram');
            setNameModalOpen(true);
        }
    }, [currentFileId, currentFileName, projectName, doSave, requireLogin]);

    const handleSaveAsNew = useCallback(() => {
        if (!requireLogin('save')) return;
        setNameInput(currentFileName ? `${currentFileName} (Copy)` : `${projectName} (Copy)`);
        setNameModalOpen(true);
    }, [currentFileName, projectName, requireLogin]);

    const confirmNameAndSave = () => {
        const name = nameInput.trim() || 'Untitled Diagram';
        setNameModalOpen(false);
        doSave(name, null).then(() => {
            if (pendingNewProjectAfterSaveRef.current) {
                pendingNewProjectAfterSaveRef.current = false;
                executeNewProject();
            }
        }).catch(() => { });
    };

    const handleLoadClick = async (file) => {
        try {
            const res = await fetch(`${API_BASE}/api/files/${file.file_id}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load file');
            const content = await res.json();
            onLoadFile(content.data);
            setCurrentFileId(content.file_id);
            setCurrentFileName(content.name);
            setProjectName(content.name);
            setTitleText(content.name);
            setManagerModalOpen(false);
            setActiveDropdown(null);
        } catch (err) {
            setSaveError(err.message);
        }
    };

    const handleTitleSubmit = () => {
        setIsEditingTitle(false);
        const trimmed = titleText.trim();
        if (trimmed) {
            setProjectName(trimmed);
            if (currentFileId) {
                setCurrentFileName(trimmed);
            }
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

    const closeDropdowns = () => setActiveDropdown(null);
    const triggerAction = (actionName) => { if (onAction) onAction(actionName); };

    // ── KEYBOARD SHORTCUTS ──
    const actionHandlers = useMemo(
        () => ({
            addPage: () => onAddPage?.(),
            newProject: handleNewProjectRequest,
            openFile: () => setManagerModalOpen(true),
            saveFile: handleSaveClick,
            undo: () => (past?.length ?? 0) > 0 && undo?.(),
            redoShift: () => (future?.length ?? 0) > 0 && redo?.(),
            redo: () => (future?.length ?? 0) > 0 && redo?.(),
            cut: () => hasSelection && !isLocked && triggerAction?.('cut'),
            copy: () => hasSelection && triggerAction?.('copy'),
            paste: () => hasClipboard && triggerAction?.('paste'),
            duplicate: () => hasSelection && !isLocked && triggerAction?.('duplicate'),
            selectAll: () => triggerAction?.('selectAll'),
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
            hasSelection, isLocked, hasClipboard, hasNodeSelection, past, future,
            undo, redo, handleDelete, handleAddShape, handleAddFreeLine, setMode,
            setTransform, setCanvasConfig, setShapeLibOpen, setPropsSidebarOpen,
            toggleFullscreen, onAddPage, handleNewProjectRequest, handleSaveClick, triggerAction,
            handleFitPage, handleZoomIn, handleZoomOut, imageInputRef
        ]
    );

    useKeyboardShortcuts(actionHandlers);

    // ── MASTER MENU CONFIGURATION ──
    const menuConfig = useMemo(() => [
        {
            id: 'file',
            label: 'File',
            items: [
                { id: 'file-new', label: 'New Page', icon: FilePlus, onClick: onAddPage },
                { id: 'file-new-project', label: 'New Entire Project', icon: Plus, onClick: handleNewProjectRequest },
                { id: 'file-new-window', label: 'New in New Tab', icon: ExternalLink, onClick: () => window.open(window.location.origin, '_blank') },
                { type: 'divider' },
                {
                    id: 'file-import',
                    label: 'Open Diagrams / Projects...',
                    icon: FolderOpen,
                    shortcut: `${mod}+O`,
                    iconColor: 'text-[#0078d4]',
                    onClick: () => setManagerModalOpen(true)
                },
                {
                    id: 'file-import-local',
                    label: 'Import from Computer...',
                    icon: FolderUp,
                    onClick: () => fileInputRef.current?.click()
                },
                { type: 'divider' },
                {
                    id: 'file-save',
                    label: saving ? 'Saving...' : 'Save Diagram',
                    icon: Save,
                    shortcut: `${mod}+S`,
                    iconColor: 'text-[#0078d4]',
                    onClick: handleSaveClick
                },
                {
                    id: 'file-save-as',
                    label: 'Save As...',
                    icon: Save,
                    shortcut: `${mod}+Shift+S`,
                    onClick: handleSaveAsNew
                },
                {
                    id: 'file-recent',
                    label: 'Recent Diagrams',
                    icon: Clock,
                    submenu: !isLoggedIn ? [
                        {
                            id: 'recent-signin',
                            label: 'Sign in to see recent diagrams',
                            icon: Lock,
                            iconColor: 'text-[#0078D4]',
                            onClick: () => {
                                window.location.href = `${ACCOUNT_APP_URL}/a/login?re=${encodeURIComponent(window.location.href)}`;
                            }
                        }
                    ] : [
                        ...(recentFiles.slice(0, 5).map(file => ({
                            id: `recent-${file.file_id}`,
                            label: file.name,
                            icon: Clock,
                            onClick: () => handleLoadClick(file)
                        }))),
                        ...(recentFiles.length > 0 ? [{ type: 'divider' }] : []),
                        ...(recentFiles.length === 0 ? [{
                            id: 'recent-empty',
                            label: 'No recent diagrams',
                            icon: Clock,
                            disabled: true
                        }, { type: 'divider' }] : []),
                        {
                            id: 'recent-see-all',
                            label: 'See All Diagrams...',
                            icon: List,
                            onClick: () => {
                                setManagerModalOpen(true);
                            }
                        }
                    ]
                },
                { type: 'divider' },
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
                { id: 'file-rename', label: 'Rename Project', icon: Pencil, shortcut: `${mod}+R`, onClick: () => setIsEditingTitle(true) },
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
    ], [activePage, canvasConfig.showGrid, future.length, handleAddShape, handleDelete, handleSaveAsNew, handleSaveClick, hasClipboard, hasNodeSelection, hasSelection, isFullscreen, isLocked, mod, onAddPage, onClosePage, onOpenExport, pages, past.length, propsSidebarOpen, recentFiles, redo, saving, setCanvasConfig, setPropsSidebarOpen, setShapeLibOpen, setTheme, setTransform, shapeLibOpen, theme, toggleFullscreen, undo]);

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
                onChange={(e) => { onImport?.(e); if (e.target) e.target.value = null; }}
            />
            <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
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
                }}
            />

            {/* ── CENTERED SAVE NAME MODAL ── */}
            {nameModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-sm bg-white dark:bg-[#252526] border border-neutral-200 dark:border-[#3c3c3c] rounded-xl shadow-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#333] pb-3">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                <Save className="w-4 h-4 text-[#0078d4]" />
                                Save Diagram
                            </h3>
                            <button
                                onClick={() => setNameModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                                Diagram Title
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmNameAndSave();
                                    if (e.key === 'Escape') setNameModalOpen(false);
                                }}
                                placeholder="e.g. System Architecture Diagram"
                                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-[#3c3c3c] bg-neutral-50 dark:bg-[#1e1e1e] text-neutral-900 dark:text-white focus:outline-hidden focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
                            />
                        </div>
                        {saveError && (
                            <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg">
                                {saveError}
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setNameModalOpen(false)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-[#3c3c3c] hover:bg-neutral-100 dark:hover:bg-[#333] text-neutral-700 dark:text-neutral-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmNameAndSave}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0078d4] hover:bg-[#106ebe] text-white transition-colors shadow-xs"
                            >
                                Save Diagram
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODULAR MICROSOFT THEMED DIAGRAM MANAGER MODAL ── */}
            <DiagramManagerModal
                isOpen={managerModalOpen}
                onClose={() => setManagerModalOpen(false)}
                apiBase={API_BASE}
                accountAppUrl={ACCOUNT_APP_URL}
                isLoggedIn={isLoggedIn}
                userLoading={userLoading}
                currentFileId={currentFileId}
                onLoadFile={onLoadFile}
                onImportLocal={() => fileInputRef.current?.click()}
                onNewProject={handleNewProjectRequest}
                onNewWindow={() => window.open(window.location.origin, '_blank')}
                svgRef={svgRef}
                theme={theme}
                onFileLoadedSuccess={(fileId, name) => {
                    setCurrentFileId(fileId);
                    setCurrentFileName(name);
                    setTitleText(name);
                }}
            />

            {/* ── MICROSOFT FLUENT "SAVE BEFORE NEW PROJECT" PROMPT MODAL ── */}
            {confirmNewModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Segoe_UI',system-ui,sans-serif]">
                    <div className="w-full max-w-md bg-white dark:bg-[#201F1E] border border-[#EDEBE9] dark:border-[#383838] rounded-lg shadow-2xl p-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0078D4]/10 dark:bg-[#0078D4]/20 flex items-center justify-center text-[#0078D4] shrink-0 mt-0.5">
                                <Save className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-[#201F1E] dark:text-[#F3F2F1]">
                                    Save changes before creating a new project?
                                </h3>
                                <p className="text-xs text-[#605E5C] dark:text-[#A19F9D] mt-1">
                                    Your diagram "{titleText || 'Untitled Diagram'}" has modifications. Would you like to save it first?
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EDEBE9] dark:border-[#2D2D2D]">
                            <button
                                onClick={() => setConfirmNewModalOpen(false)}
                                className="px-3 py-1.5 text-xs font-medium rounded border border-[#EDEBE9] dark:border-[#383838] bg-white dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] dark:hover:bg-[#333] text-[#201F1E] dark:text-[#F3F2F1] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeNewProject}
                                className="px-3 py-1.5 text-xs font-medium rounded border border-[#EDEBE9] dark:border-[#383838] bg-[#FAF9F8] dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] text-red-600 dark:text-red-400 transition-colors"
                            >
                                Don't Save
                            </button>
                            <button
                                onClick={handleSaveAndNewProject}
                                className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white transition-colors shadow-xs"
                            >
                                Save & Create New
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LOGIN REQUIRED PROMPT MODAL ── */}
            {loginRequiredModalOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Segoe_UI',system-ui,sans-serif]">
                    <div className="w-full max-w-sm bg-white dark:bg-[#201F1E] border border-[#EDEBE9] dark:border-[#383838] rounded-xl shadow-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#EDEBE9] dark:border-[#333] pb-3">
                            <h3 className="text-sm font-semibold text-[#201F1E] dark:text-white flex items-center gap-2">
                                <Lock className="w-4 h-4 text-[#0078D4]" />
                                Sign in Required
                            </h3>
                            <button
                                onClick={() => setLoginRequiredModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-[#605E5C] dark:text-[#A19F9D] leading-relaxed">
                            You must be signed in to {loginPromptReason === 'save' ? 'save your diagram to the cloud' : 'access your saved projects and diagrams'}.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EDEBE9] dark:border-[#333]">
                            <button
                                onClick={() => setLoginRequiredModalOpen(false)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EDEBE9] dark:border-[#383838] hover:bg-[#F3F2F1] dark:hover:bg-[#333] text-[#201F1E] dark:text-[#F3F2F1] transition-colors"
                            >
                                Cancel
                            </button>
                            <a
                                href={`${ACCOUNT_APP_URL}/a/login?re=${encodeURIComponent(window.location.href)}`}
                                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white transition-colors shadow-xs"
                            >
                                Sign in now
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOP BAR: BRAND, TITLE & MENUS ── */}
            <div className="flex items-center justify-between px-3 h-10 border-b border-neutral-200 dark:border-[#2b2b2b] text-xs">
                <div className="flex items-center gap-3" ref={dropdownRef}>
                    <div className="flex items-center gap-2">
                        <img src="./logo/favicon-32x32.png" alt="flow logo" className="w-5 h-5 object-contain" />
                        <span className="font-semibold text-neutral-900 dark:text-white tracking-wide">Flow</span>
                    </div>

                    <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700" />

                    {/* Project Name & Active Page Badge */}
                    <div className="flex items-center gap-2">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={titleText}
                                    onChange={(e) => setTitleText(e.target.value)}
                                    onBlur={handleTitleSubmit}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                                    className="bg-neutral-100 dark:bg-[#2d2d2d] text-neutral-900 dark:text-white px-2 py-0.5 rounded border border-[#0078d4] outline-hidden text-xs font-medium w-44"
                                    autoFocus
                                    placeholder="Project Name"
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
                                className="group flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-[#2b2b2b] transition-colors text-neutral-900 dark:text-white font-semibold text-xs"
                                title="Click to rename project"
                            >
                                <span>{projectName}</span>
                                <Pencil className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}

                        {/* Current Active Page Name (Small Badge) */}
                        {activePage?.name && (
                            <span
                                className="text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-[#2b2b2b] px-1.5 py-0.5 rounded border border-neutral-200 dark:border-[#383838] flex items-center gap-1"
                                title={`Active Page: ${activePage.name}`}
                            >
                                <span className="opacity-60">Page:</span>
                                <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[100px]">{activePage.name}</span>
                            </span>
                        )}

                        <span
                            onClick={handleSaveClick}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors flex items-center gap-1 ${justSaved
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                                : saving
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-[#2b2b2b] hover:bg-neutral-200 dark:hover:bg-[#383838]'
                                }`}
                            title="Click to save changes"
                        >
                            {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : justSaved ? <Check className="w-2.5 h-2.5" /> : null}
                            <span>{saving ? 'Saving...' : justSaved ? 'Saved' : 'Save'}</span>
                        </span>
                        {saveError && !nameModalOpen && !managerModalOpen && (
                            <span
                                onClick={() => setSaveError(null)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 cursor-pointer"
                                title={`Error: ${saveError}. Click to dismiss.`}
                            >
                                Error: {saveError}
                            </span>
                        )}
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
                                            placeholder="Search commands & shapes..."
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

                {/* ── TOP RIGHT: OPEN DIAGRAMS, DOWNLOAD & USER PROFILE ── */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setManagerModalOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#2B2B2B] hover:bg-[#F3F2F1] dark:hover:bg-[#383838] text-[#201F1E] dark:text-[#F3F2F1] border border-[#EDEBE9] dark:border-[#383838] font-medium rounded shadow-2xs transition-colors text-xs active:scale-[0.98]"
                        title="Open saved diagrams or import files"
                    >
                        <FolderOpen className="w-3.5 h-3.5 text-[#0078D4]" />
                        <span>Open</span>
                    </button>

                    <button
                        onClick={() => onOpenExport('drawmap')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium rounded shadow-xs transition-colors text-xs active:scale-[0.98]"
                        title="Download / Export Diagram File"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                    </button>

                    {!isLoggedIn ? (
                        !userLoading ? (
                            <a
                                href={`${ACCOUNT_APP_URL}/a/login?re=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                className="flex items-center gap-1.5 px-3 py-1 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white font-medium rounded shadow-xs transition-colors text-xs active:scale-[0.98]"
                                title="Sign in to your account"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Sign in</span>
                            </a>
                        ) : (
                            <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                        )
                    ) : (
                        <UserProfile user={currentUser} loading={userLoading} />
                    )}
                </div>
            </div>

            {/* ── BOTTOM RIBBON TOOLBAR ── */}
            <div className="flex items-center justify-between px-3 py-1 bg-neutral-100 dark:bg-[#252526] text-xs">
                <div className="flex items-center gap-1">
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

// ── REUSABLE MENU ITEM COMPONENT ──
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