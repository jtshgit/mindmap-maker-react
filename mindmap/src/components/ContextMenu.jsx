import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
    Crop,
    Image as ImageIcon,
    RotateCcw,
    Pencil,
    Trash2,
    Scissors,
    Copy,
    CopyPlus,
    Lock,
    Unlock,
    ChevronsUp,
    ChevronsDown,
    ChevronUp,
    ChevronDown,
    BoxSelect,
    ArrowLeftRight,
    Clipboard,
    Undo2,
    Redo2,
    Maximize2,
    Grid
} from 'lucide-react';

export default function ContextMenu({
    x,
    y,
    target,
    nodes,
    edges,
    clipboard,
    canvasConfig,
    selectedNode,
    onAction,
    onClose,
    canUndo,
    canRedo,
    past,
    future
}) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ x, y });

    // Determine disabled states for Undo / Redo
    const isUndoDisabled = canUndo !== undefined ? !canUndo : (past ? past.length === 0 : false);
    const isRedoDisabled = canRedo !== undefined ? !canRedo : (future ? future.length === 0 : false);

    // Close on outside click or Escape press
    useEffect(() => {
        const handlePointerDown = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('pointerdown', handlePointerDown, true);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown, true);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Keep context menu strictly within viewport boundaries
    useLayoutEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const newX = x + rect.width > vw ? Math.max(10, x - rect.width) : x;
        const newY = y + rect.height > vh ? Math.max(10, y - rect.height) : y;

        setPosition({ x: newX, y: newY });
    }, [x, y]);

    const node = selectedNode;
    const isLocked = Boolean(node?.locked);
    const hasClipboard = Boolean(clipboard?.nodes?.length || clipboard?.edges?.length);

    return (
        <div
            ref={menuRef}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed z-[9999] min-w-[200px] p-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl shadow-xl text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100 transition-colors"
        >
            {/* Image Node Context Menu */}
            {target.type === 'node' && node?.shapeType === 'image' && (
                <>
                    <MenuItem label="Crop Image..." icon={Crop} onClick={() => onAction('cropImage')} />
                    <MenuItem label="Replace Image..." icon={ImageIcon} onClick={() => onAction('replaceImage')} />
                    <MenuItem label="Reset Crop" icon={RotateCcw} onClick={() => onAction('resetCrop')} />
                    <MenuDivider />
                    <MenuItem label="Edit Caption" icon={Pencil} onClick={() => onAction('editText')} />
                    <MenuDivider />
                    <MenuItem label="Delete" icon={Trash2} shortcut="Del" danger onClick={() => onAction('delete')} />
                    <MenuDivider />
                    <MenuItem label="Cut" icon={Scissors} shortcut="⌘X" disabled={isLocked} onClick={() => onAction('cut')} />
                    <MenuItem label="Copy" icon={Copy} shortcut="⌘C" onClick={() => onAction('copy')} />
                    <MenuItem label="Duplicate" icon={CopyPlus} shortcut="⌘D" disabled={isLocked} onClick={() => onAction('duplicate')} />
                    <MenuDivider />
                    <MenuItem
                        label={isLocked ? 'Unlock' : 'Lock'}
                        icon={isLocked ? Unlock : Lock}
                        onClick={() => onAction('lock')}
                    />
                    <MenuDivider />
                    <MenuItem label="To Front" icon={ChevronsUp} onClick={() => onAction('toFront')} />
                    <MenuItem label="Bring Forward" icon={ChevronUp} onClick={() => onAction('bringForward')} />
                    <MenuItem label="Send Backward" icon={ChevronDown} onClick={() => onAction('sendBackward')} />
                    <MenuItem label="To Back" icon={ChevronsDown} onClick={() => onAction('toBack')} />
                    <MenuDivider />
                    <MenuItem label="Select All" icon={BoxSelect} shortcut="⌘A" onClick={() => onAction('selectAll')} />
                </>
            )}

            {/* Standard Shape/Node Context Menu */}
            {target.type === 'node' && node?.shapeType !== 'image' && (
                <>
                    <MenuItem label="Edit Text" icon={Pencil} shortcut="F2" onClick={() => onAction('editText')} />
                    <MenuDivider />
                    <MenuItem label="Delete" icon={Trash2} shortcut="Del" danger onClick={() => onAction('delete')} />
                    <MenuDivider />
                    <MenuItem label="Cut" icon={Scissors} shortcut="⌘X" disabled={isLocked} onClick={() => onAction('cut')} />
                    <MenuItem label="Copy" icon={Copy} shortcut="⌘C" onClick={() => onAction('copy')} />
                    <MenuItem label="Duplicate" icon={CopyPlus} shortcut="⌘D" disabled={isLocked} onClick={() => onAction('duplicate')} />
                    <MenuDivider />
                    <MenuItem
                        label={isLocked ? 'Unlock' : 'Lock'}
                        icon={isLocked ? Unlock : Lock}
                        onClick={() => onAction('lock')}
                    />
                    <MenuDivider />
                    <MenuItem label="To Front" icon={ChevronsUp} onClick={() => onAction('toFront')} />
                    <MenuItem label="Bring Forward" icon={ChevronUp} onClick={() => onAction('bringForward')} />
                    <MenuItem label="Send Backward" icon={ChevronDown} onClick={() => onAction('sendBackward')} />
                    <MenuItem label="To Back" icon={ChevronsDown} onClick={() => onAction('toBack')} />
                    <MenuDivider />
                    <MenuItem label="Select All" icon={BoxSelect} shortcut="⌘A" onClick={() => onAction('selectAll')} />
                </>
            )}

            {/* Connection Edge Context Menu */}
            {target.type === 'edge' && (
                <>
                    <MenuItem label="Delete" icon={Trash2} shortcut="Del" danger onClick={() => onAction('delete')} />
                    <MenuDivider />
                    <MenuItem label="Cut" icon={Scissors} shortcut="⌘X" onClick={() => onAction('cut')} />
                    <MenuItem label="Copy" icon={Copy} shortcut="⌘C" onClick={() => onAction('copy')} />
                    <MenuItem label="Duplicate" icon={CopyPlus} onClick={() => onAction('duplicate')} />
                    <MenuDivider />
                    <MenuItem label="Reverse Direction" icon={ArrowLeftRight} onClick={() => onAction('reverseDirection')} />
                    <MenuDivider />
                    <MenuItem label="Select All" icon={BoxSelect} shortcut="⌘A" onClick={() => onAction('selectAll')} />
                </>
            )}

            {/* Canvas Context Menu */}
            {target.type === 'canvas' && (
                <>
                    <MenuItem label="Select All" icon={BoxSelect} shortcut="⌘A" onClick={() => onAction('selectAll')} />
                    <MenuItem label="Paste" icon={Clipboard} shortcut="⌘V" disabled={!hasClipboard} onClick={() => onAction('paste')} />
                    <MenuDivider />
                    <MenuItem
                        label="Undo"
                        icon={Undo2}
                        shortcut="⌘Z"
                        disabled={isUndoDisabled}
                        onClick={() => onAction('undo')}
                    />
                    <MenuItem
                        label="Redo"
                        icon={Redo2}
                        shortcut="⌘Y"
                        disabled={isRedoDisabled}
                        onClick={() => onAction('redo')}
                    />
                    <MenuDivider />
                    <MenuItem label="Fit to Page" icon={Maximize2} onClick={() => onAction('fitPage')} />
                    <MenuItem
                        label={canvasConfig?.showGrid ? 'Hide Grid' : 'Show Grid'}
                        icon={Grid}
                        onClick={() => onAction('toggleGrid')}
                    />
                </>
            )}
        </div>
    );
}

/* Helper UI Components */

function MenuItem({ label, icon: Icon, shortcut, danger, disabled, onClick }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onPointerDown={(e) => {
                e.stopPropagation();
                if (!disabled && onClick) onClick();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${disabled
                    ? 'opacity-40 cursor-not-allowed hover:bg-transparent text-neutral-400 dark:text-neutral-500'
                    : danger
                        ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50/80 dark:hover:bg-red-950/40 active:bg-red-100 dark:active:bg-red-950/60'
                        : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60 active:bg-neutral-200/80 dark:active:bg-neutral-800'
                }`}
        >
            {Icon && <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" />}
            <span className="flex-1 font-medium text-xs">{label}</span>
            {shortcut && (
                <span className="text-[10px] font-mono tracking-wider text-neutral-400 dark:text-neutral-500">
                    {shortcut}
                </span>
            )}
        </button>
    );
}

function MenuDivider() {
    return <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80 my-1 mx-1" />;
}