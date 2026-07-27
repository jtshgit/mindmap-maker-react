import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
    Lock,
    Unlock,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    ChevronsUp,
    ChevronsDown,
    Crop,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Bold,
    Italic,
    Underline,
    ImageIcon,
    Sliders,
    Pipette,
    Palette,
    SlidersHorizontal,
    Grid,
    X,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    StretchHorizontal,
    StretchVertical
} from 'lucide-react';

/* ============================================================================
   Color Utility Helpers (HEX <-> RGB)
   ============================================================================ */

function hexToRgb(hex) {
    let c = (hex || '#000000').replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    return isNaN(num)
        ? { r: 0, g: 0, b: 0 }
        : { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n) || 0));
    const toHex = (n) => clamp(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* ============================================================================
   Constants & Preset Data
   ============================================================================ */

const FONTS = [
    { label: 'Segoe UI', value: 'Segoe UI' },
    { label: 'Helvetica', value: 'Helvetica' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Inter', value: 'Inter' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Impact', value: 'Impact' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS' },
    { label: 'Tahoma', value: 'Tahoma' },
    { label: 'Garamond', value: 'Garamond' }
];

const ENDPOINT_STYLES = [
    { value: 'none', label: 'None' },
    { value: 'arrow', label: 'Solid Arrow' },
    { value: 'open-arrow', label: 'Open Arrow' },
    { value: 'stealth', label: 'Stealth Arrow' },
    { value: 'dot', label: 'Filled Circle' },
    { value: 'diamond', label: 'Filled Diamond' },
    { value: 'bar', label: 'T-Bar' }
];

const LINE_STYLES = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' }
];

const ROUTING_STYLES = [
    { value: 'orthogonal', label: 'Orthogonal' },
    { value: 'straight', label: 'Straight Line' },
    { value: 'curved', label: 'Curved Bezier' }
];

const FILL_MODES = [
    { value: 'solid', label: 'Solid Fill' },
    { value: 'gradient', label: 'Gradient Fill' },
    { value: 'none', label: 'No Fill' }
];

const ORIENTATIONS = [
    { value: 'landscape', label: 'Landscape' },
    { value: 'portrait', label: 'Portrait' }
];

const PALETTE_CATEGORIES = [
    {
        name: 'Standard',
        colors: ['#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#2563eb']
    },
    {
        name: 'Theme',
        colors: ['#002060', '#1f497d', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646', '#2c4d75', '#772c2a']
    },
    {
        name: 'Pastel Accent',
        colors: ['#fee2e2', '#ffedd5', '#fef3c7', '#dcfce7', '#e0f2fe', '#e0e7ff', '#f3e8ff', '#fce7f3', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8']
    }
];

const NODE_PRESETS = [
    { name: 'Classic', fillColor: '#ffffff', strokeColor: '#000000', strokeWidth: 1, fontColor: '#000000' },
    { name: 'Light Gray', fillColor: '#f8fafc', strokeColor: '#cbd5e1', strokeWidth: 1, fontColor: '#334155' },
    { name: 'Soft Blue', fillColor: '#dbeafe', strokeColor: '#3b82f6', strokeWidth: 1, fontColor: '#1e40af' },
    { name: 'Soft Green', fillColor: '#dcfce7', strokeColor: '#22c55e', strokeWidth: 1, fontColor: '#166534' },
    { name: 'Soft Yellow', fillColor: '#fef3c7', strokeColor: '#f59e0b', strokeWidth: 1, fontColor: '#92400e' },
    { name: 'Warm Cream', fillColor: '#fffbeb', strokeColor: '#fde68a', strokeWidth: 1, fontColor: '#78350f' },
    { name: 'Soft Red', fillColor: '#fee2e2', strokeColor: '#ef4444', strokeWidth: 1, fontColor: '#991b1b' },
    { name: 'Soft Purple', fillColor: '#f3e8ff', strokeColor: '#a855f7', strokeWidth: 1, fontColor: '#6b21a8' },
    { name: 'Dark Card', fillColor: '#1e293b', strokeColor: '#475569', strokeWidth: 1, fontColor: '#f8fafc' },
    { name: 'Outline Only', fillColor: '#ffffff', fillType: 'none', strokeColor: '#000000', strokeWidth: 2, fontColor: '#000000' }
];

const EDGE_PRESETS = [
    { name: 'Classic', strokeColor: '#000000', strokeWidth: 1, strokeStyle: 'solid', markerEnd: 'arrow' },
    { name: 'Blue Line', strokeColor: '#2563eb', strokeWidth: 2, strokeStyle: 'solid', markerEnd: 'arrow' },
    { name: 'Dashed', strokeColor: '#64748b', strokeWidth: 1.5, strokeStyle: 'dashed', markerEnd: 'open-arrow' },
    { name: 'Dotted', strokeColor: '#94a3b8', strokeWidth: 1.5, strokeStyle: 'dotted', markerEnd: 'dot' },
    { name: 'Bold Red', strokeColor: '#ef4444', strokeWidth: 3, strokeStyle: 'solid', markerEnd: 'stealth' },
    { name: 'Minimal', strokeColor: '#cbd5e1', strokeWidth: 1, strokeStyle: 'solid', markerEnd: 'none' }
];

/* ============================================================================
   Custom SVG Endpoint & Line Previews
   ============================================================================ */

function EndpointSvg({ type, isStart = false }) {
    if (type === 'none') {
        return (
            <svg className="w-5 h-3 text-neutral-600 dark:text-neutral-300 shrink-0" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="6" x2="22" y2="6" strokeDasharray="2,2" />
            </svg>
        );
    }

    return (
        <svg
            className={`w-5 h-3 text-neutral-700 dark:text-neutral-200 shrink-0 transition-transform ${isStart ? 'rotate-180' : ''}`}
            viewBox="0 0 24 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="2" y1="6" x2="17" y2="6" />
            {type === 'arrow' && (
                <path d="M 14 2 L 22 6 L 14 10 Z" fill="currentColor" stroke="none" />
            )}
            {type === 'open-arrow' && (
                <path d="M 14 2 L 22 6 L 14 10" fill="none" strokeWidth="2" />
            )}
            {type === 'stealth' && (
                <path d="M 12 2 L 22 6 L 12 10 L 15 6 Z" fill="currentColor" stroke="none" />
            )}
            {type === 'dot' && (
                <circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" />
            )}
            {type === 'diamond' && (
                <polygon points="14,6 18,2 22,6 18,10" fill="currentColor" stroke="none" />
            )}
            {type === 'bar' && (
                <line x1="19" y1="1" x2="19" y2="11" strokeWidth="2" />
            )}
        </svg>
    );
}

function EndpointStyleSelect({ value, options, onChange, isStart = false, className = '' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const selectedOption = options.find((o) => o.value === value);

    return (
        <div ref={ref} className={`relative inline-block text-left ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full px-2 py-1 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded flex items-center justify-between hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer shadow-2xs"
            >
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <EndpointSvg type={value} isStart={isStart} />
                    <span className="text-xs text-neutral-800 dark:text-neutral-200 truncate">
                        {selectedOption ? selectedOption.label : value}
                    </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" />
            </button>

            {open && (
                <div className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl py-1 max-h-56 overflow-y-auto">
                    {options.map((opt) => {
                        const selected = value === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                className={`w-full px-2 py-1.5 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer ${selected ? 'bg-blue-50 dark:bg-blue-900/30 font-bold' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <EndpointSvg type={opt.value} isStart={isStart} />
                                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                                        {opt.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function LinePreview({ style }) {
    return (
        <div className="flex items-center w-full">
            <div
                className={`w-full border-t-2 border-neutral-700 dark:border-neutral-200 ${style === 'solid'
                    ? 'border-solid'
                    : style === 'dashed'
                        ? 'border-dashed'
                        : 'border-dotted'
                    }`}
            />
        </div>
    );
}

function LineStyleSelect({ value, options, onChange, className = '' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div
            ref={ref}
            className={`relative inline-block text-left ${className}`}
        >
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full px-2 py-1 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded flex items-center justify-between hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer"
            >
                <div className="flex-1 mr-2">
                    <LinePreview style={value} />
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            </button>

            {open && (
                <div className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl py-1">
                    {options.map((opt) => {
                        const selected = value === opt.value;

                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                className={`w-full px-3 py-2 flex items-center hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer ${selected
                                    ? 'bg-blue-50 dark:bg-blue-900/30'
                                    : ''
                                    }`}
                            >
                                <div className="flex-1 mr-3">
                                    <LinePreview style={opt.value} />
                                </div>

                                <span className="text-xs text-neutral-600 dark:text-neutral-300">
                                    {opt.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

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
        ? typeof selectedOption === 'object' ? selectedOption.label : selectedOption
        : value;

    return (
        <div ref={ref} className={`relative inline-block text-left ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded flex items-center justify-between shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors"
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-1 shrink-0" />
            </button>
            {open && (
                <div className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-h-48 overflow-y-auto py-1 text-xs">
                    {options.map((opt) => {
                        const optVal = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        const isSelected = optVal === value;
                        return (
                            <button
                                key={optVal}
                                type="button"
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

function MenuItem({ label, icon: Icon, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors border border-neutral-200 dark:border-neutral-700/60 bg-white dark:bg-neutral-800/80 shadow-2xs"
        >
            {Icon && <Icon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />}
            <span className="truncate">{label}</span>
        </button>
    );
}

function MSTabs({ tabs, activeTab, onChange }) {
    return (
        <div className="grid grid-cols-3 bg-neutral-200/90 dark:bg-neutral-800 p-0.5 border-b border-neutral-300 dark:border-neutral-700 select-none rounded-t-sm">
            {tabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => onChange(tab)}
                        className={`py-1.5 text-[11px] font-bold tracking-tight transition-all cursor-pointer ${isActive
                            ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs rounded-xs border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100/60 dark:hover:bg-neutral-700/60'
                            }`}
                    >
                        {tab}
                    </button>
                );
            })}
        </div>
    );
}

function MSAccordion({ title, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 w-full text-left font-bold text-[11px] uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer select-none py-1.5 transition-colors"
            >
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
                <span>{title}</span>
            </button>
            {open && <div className="mt-1 space-y-2.5 pl-1.5">{children}</div>}
        </div>
    );
}

function PresetSlideBar({ presets, onApply }) {
    const [page, setPage] = useState(0);
    const pageSize = 8;
    const totalPages = Math.ceil(presets.length / pageSize);
    const visiblePresets = presets.slice(page * pageSize, (page + 1) * pageSize);

    return (
        <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="flex items-center justify-between w-full gap-1">
                <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-20 cursor-pointer transition-opacity"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-4 grid-rows-2 gap-1.5 flex-1">
                    {visiblePresets.map((p) => (
                        <button
                            key={p.name}
                            type="button"
                            title={p.name}
                            onClick={() => onApply(p)}
                            className="h-7 border border-neutral-300 dark:border-neutral-600 rounded hover:border-blue-600 dark:hover:border-blue-400 cursor-pointer transition-transform active:scale-95 bg-white overflow-hidden shadow-2xs"
                            style={{
                                backgroundColor: p.fillType === 'none' ? 'transparent' : p.fillColor,
                                borderColor: p.strokeColor || '#cccccc',
                                borderWidth: `${Math.max(1, p.strokeWidth || 1)}px`
                            }}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-20 cursor-pointer transition-opacity"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setPage(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${page === idx
                                ? 'bg-blue-600 dark:bg-blue-400 w-3'
                                : 'bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function MSNumberInput({ value, onChange, unit = 'pt', min = -500, max = 1000, step = 1 }) {
    return (
        <div className="flex items-center border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 px-1.5 py-0.5 w-24 focus-within:border-blue-500 shadow-2xs">
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

/* ============================================================================
   Color Picker
   ============================================================================ */

function MSColorPicker({ value, onChange, label, checked, onCheckChange }) {
    const [open, setOpen] = useState(false);
    const [pickerMode, setPickerMode] = useState('spectrum');
    const popoverRef = useRef(null);
    const currentColor = value || '#000000';
    const rgb = hexToRgb(currentColor);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleEyedropper = async (e) => {
        e.stopPropagation();
        if ('EyeDropper' in window) {
            try {
                const eyeDropper = new window.EyeDropper();
                const result = await eyeDropper.open();
                if (result?.sRGBHex) {
                    onChange(result.sRGBHex);
                }
            } catch (err) {
                // Eyedropper cancelled
            }
        }
    };

    const handleRgbChange = (channel, val) => {
        const newRgb = { ...rgb, [channel]: Math.max(0, Math.min(255, val || 0)) };
        onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    };

    return (
        <div className="relative flex items-center justify-between gap-2 py-0.5">
            {label && (
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer select-none">
                    {onCheckChange !== undefined && (
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => onCheckChange(e.target.checked)}
                            className="w-3.5 h-3.5 rounded-2xs border-neutral-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                    )}
                    {label}
                </label>
            )}

            <div className="flex items-center border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 overflow-hidden shadow-2xs">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="w-8 h-6 flex items-center justify-center cursor-pointer border-r border-neutral-200 dark:border-neutral-700 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: currentColor }}
                />
                <button
                    type="button"
                    onClick={handleEyedropper}
                    title="Pick color from screen (Eyedropper)"
                    className="px-1.5 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                >
                    <Pipette className="w-3.5 h-3.5" />
                </button>
            </div>

            {open && (
                <div
                    ref={popoverRef}
                    className="absolute right-0 top-8 z-50 p-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-2xl flex flex-col gap-2.5 w-60 text-xs select-none"
                >
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded">
                            <button
                                type="button"
                                onClick={() => setPickerMode('spectrum')}
                                title="Color Canvas"
                                className={`p-1 rounded cursor-pointer ${pickerMode === 'spectrum' ? 'bg-white dark:bg-neutral-700 shadow-2xs text-blue-600 dark:text-blue-400 font-bold' : 'text-neutral-500'}`}
                            >
                                <Palette className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setPickerMode('rgb')}
                                title="RGB Sliders"
                                className={`p-1 rounded cursor-pointer ${pickerMode === 'rgb' ? 'bg-white dark:bg-neutral-700 shadow-2xs text-blue-600 dark:text-blue-400 font-bold' : 'text-neutral-500'}`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setPickerMode('swatches')}
                                title="Color Swatches"
                                className={`p-1 rounded cursor-pointer ${pickerMode === 'swatches' ? 'bg-white dark:bg-neutral-700 shadow-2xs text-blue-600 dark:text-blue-400 font-bold' : 'text-neutral-500'}`}
                            >
                                <Grid className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded border border-neutral-300 dark:border-neutral-600" style={{ backgroundColor: currentColor }} />
                            <span className="font-mono text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-300">{currentColor}</span>
                        </div>
                    </div>

                    {pickerMode === 'spectrum' && (
                        <div className="flex flex-col gap-2">
                            <HexColorPicker color={currentColor} onChange={onChange} className="!w-full !h-36" />
                        </div>
                    )}

                    {pickerMode === 'rgb' && (
                        <div className="space-y-2 py-1">
                            {['r', 'g', 'b'].map((channel) => {
                                const colors = { r: 'bg-red-500', g: 'bg-green-500', b: 'bg-blue-500' };
                                return (
                                    <div key={channel} className="flex items-center gap-2">
                                        <span className={`w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center uppercase ${colors[channel]}`}>
                                            {channel}
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="255"
                                            value={rgb[channel]}
                                            onChange={(e) => handleRgbChange(channel, parseInt(e.target.value))}
                                            className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="255"
                                            value={rgb[channel]}
                                            onChange={(e) => handleRgbChange(channel, parseInt(e.target.value))}
                                            className="w-10 px-1 py-0.5 text-right font-mono border border-neutral-300 dark:border-neutral-700 rounded text-xs bg-neutral-50 dark:bg-neutral-800"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {pickerMode === 'swatches' && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {PALETTE_CATEGORIES.map((cat) => (
                                <div key={cat.name} className="space-y-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{cat.name}</span>
                                    <div className="grid grid-cols-6 gap-1">
                                        {cat.colors.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => { onChange(c); setOpen(false); }}
                                                className="w-6 h-6 rounded-2xs border border-neutral-300 dark:border-neutral-600 cursor-pointer hover:scale-110 transition-transform"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">HEX</span>
                        <input
                            type="text"
                            value={currentColor}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full px-2 py-0.5 text-xs font-mono border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 uppercase"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ============================================================================
   Canvas Settings Panel
   ============================================================================ */

function CanvasStylePanel({ config, setConfig, canvasSettings, setCanvasSettings }) {
    return (
        <div className="flex flex-col gap-3 text-xs">
            <MSAccordion title="Page Setup" defaultOpen={true}>
                <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Width</span>
                    <MSNumberInput
                        value={canvasSettings?.width || 1920}
                        unit="px"
                        onChange={(v) => setCanvasSettings && setCanvasSettings((p) => ({ ...p, width: v }))}
                    />
                </div>
                <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Height</span>
                    <MSNumberInput
                        value={canvasSettings?.height || 1080}
                        unit="px"
                        onChange={(v) => setCanvasSettings && setCanvasSettings((p) => ({ ...p, height: v }))}
                    />
                </div>
                <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Orientation</span>
                    <CustomSelect
                        value={canvasSettings?.orientation || 'landscape'}
                        options={ORIENTATIONS}
                        onChange={(val) => setCanvasSettings && setCanvasSettings((p) => ({ ...p, orientation: val }))}
                        className="w-28"
                    />
                </div>
            </MSAccordion>

            <MSAccordion title="Canvas Appearance" defaultOpen={true}>
                <MSColorPicker
                    label="Background Color"
                    checked={true}
                    value={config.backgroundColor || '#ffffff'}
                    onChange={(v) => setConfig({ ...config, backgroundColor: v })}
                />
                <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.showGrid !== false}
                            onChange={(e) => setConfig({ ...config, showGrid: e.target.checked })}
                            className="w-3.5 h-3.5 rounded-2xs border-neutral-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        Show Grid Lines
                    </label>
                </div>
            </MSAccordion>
        </div>
    );
}

/* ============================================================================
   Node Panel (Style, Text, Arrange)
   ============================================================================ */

function NodeStylePanel({ node, updateNode, onOpenCropModal, onAction }) {
    const isImage = node.shapeType === 'image';
    const [tab, setTab] = useState(isImage ? 'Image' : 'Style');
    const tabs = isImage ? ['Image', 'Arrange'] : ['Style', 'Text', 'Arrange'];
    const activeTab = tabs.includes(tab) ? tab : (isImage ? 'Image' : 'Style');
    const fileInputRef = useRef(null);
    const isLocked = !!node.locked;

    const handleReplaceFile = (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            const img = new Image();
            img.onload = () => {
                updateNode(node.id, {
                    imageSrc: dataUrl,
                    imageNaturalWidth: img.naturalWidth,
                    imageNaturalHeight: img.naturalHeight,
                    imageCropRect: { x: 0, y: 0, width: 1, height: 1 }
                });
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-2">
                <span className="font-bold text-neutral-800 dark:text-neutral-200">Shape Properties</span>
                <button
                    type="button"
                    onClick={() => updateNode(node.id, { locked: !isLocked })}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${isLocked
                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-white text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                        }`}
                >
                    {isLocked ? <Lock className="w-3 h-3 text-amber-600" /> : <Unlock className="w-3 h-3 text-neutral-400" />}
                    {isLocked ? 'Locked' : 'Unlocked'}
                </button>
            </div>

            <MSTabs tabs={tabs} activeTab={activeTab} onChange={setTab} />

            <div className="py-2 space-y-3">
                {activeTab === 'Style' && !isImage && (
                    <>
                        <PresetSlideBar presets={NODE_PRESETS} onApply={(p) => updateNode(node.id, { ...p })} />

                        <MSAccordion title="Fill" defaultOpen={true}>
                            <div className="flex items-center justify-between pb-1">
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Fill Mode</span>
                                <CustomSelect
                                    value={node.fillType || 'solid'}
                                    options={FILL_MODES}
                                    onChange={(val) => updateNode(node.id, { fillType: val })}
                                    className="w-28"
                                />
                            </div>

                            {node.fillType !== 'none' && (
                                <MSColorPicker
                                    label="Primary Fill Color"
                                    value={node.fillColor || '#ffffff'}
                                    onChange={(v) => updateNode(node.id, { fillColor: v })}
                                />
                            )}

                            {node.fillType === 'gradient' && (
                                <div className="space-y-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                                    <MSColorPicker
                                        label="Gradient End Color"
                                        value={node.gradientColor || '#e2e8f0'}
                                        onChange={(v) => updateNode(node.id, { gradientColor: v })}
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Angle</span>
                                        <MSNumberInput
                                            value={node.gradientAngle || 90}
                                            unit="deg"
                                            min={0}
                                            max={360}
                                            onChange={(v) => updateNode(node.id, { gradientAngle: v })}
                                        />
                                    </div>
                                </div>
                            )}
                        </MSAccordion>

                        <MSAccordion title="Line & Border" defaultOpen={true}>
                            <MSColorPicker
                                label="Border Color"
                                checked={node.strokeWidth !== 0}
                                onCheckChange={(c) => updateNode(node.id, { strokeWidth: c ? 1 : 0 })}
                                value={node.strokeColor || '#000000'}
                                onChange={(v) => updateNode(node.id, { strokeColor: v })}
                            />
                            <div className="flex items-center justify-between py-0.5">
                                <LineStyleSelect
                                    value={node.strokeStyle || 'solid'}
                                    options={LINE_STYLES}
                                    onChange={(val) => updateNode(node.id, { strokeStyle: val })}
                                    className="w-32"
                                />

                                <MSNumberInput
                                    value={node.strokeWidth ?? 1}
                                    unit="pt"
                                    min={0}
                                    onChange={(v) => updateNode(node.id, { strokeWidth: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between py-0.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">Corner Radius</span>
                                <MSNumberInput
                                    value={node.cornerRadius ?? 0}
                                    unit="px"
                                    min={0}
                                    max={Math.min(node.width || 120, node.height || 40) / 2}
                                    onChange={(v) => updateNode(node.id, { cornerRadius: v })}
                                />
                            </div>
                        </MSAccordion>

                        <MSAccordion title="Shadow & Effects" defaultOpen={true}>
                            <div className="flex items-center justify-between py-0.5">
                                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={node.effect === 'shadow'}
                                        onChange={(e) => updateNode(node.id, { effect: e.target.checked ? 'shadow' : 'none' })}
                                        className="w-3.5 h-3.5 rounded-2xs border-neutral-300 text-blue-600 focus:ring-0 cursor-pointer"
                                    />
                                    Enable Drop Shadow
                                </label>
                            </div>

                            {node.effect === 'shadow' && (
                                <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                    <MSColorPicker
                                        label="Shadow Color"
                                        value={node.shadowColor || 'rgba(0,0,0,0.25)'}
                                        onChange={(v) => updateNode(node.id, { shadowColor: v })}
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Blur Radius</span>
                                        <MSNumberInput
                                            value={node.shadowBlur ?? 8}
                                            unit="px"
                                            min={0}
                                            max={50}
                                            onChange={(v) => updateNode(node.id, { shadowBlur: v })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Offset X</span>
                                        <MSNumberInput
                                            value={node.shadowOffsetX ?? 0}
                                            unit="px"
                                            min={-50}
                                            max={50}
                                            onChange={(v) => updateNode(node.id, { shadowOffsetX: v })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Offset Y</span>
                                        <MSNumberInput
                                            value={node.shadowOffsetY ?? 4}
                                            unit="px"
                                            min={-50}
                                            max={50}
                                            onChange={(v) => updateNode(node.id, { shadowOffsetY: v })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Opacity</span>
                                <MSNumberInput
                                    value={Math.round((node.opacity ?? 1) * 100)}
                                    unit="%"
                                    min={0}
                                    max={100}
                                    onChange={(v) => updateNode(node.id, { opacity: v / 100 })}
                                />
                            </div>
                        </MSAccordion>
                    </>
                )}

                {activeTab === 'Text' && (
                    <div className="space-y-3">
                        <MSAccordion title="Font Formatting" defaultOpen={true}>
                            <CustomSelect
                                value={node.fontFamily || 'Segoe UI'}
                                options={FONTS}
                                onChange={(val) => updateNode(node.id, { fontFamily: val })}
                                className="w-full"
                            />

                            <div className="flex items-center justify-between gap-1 pt-1">
                                <div className="flex border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 overflow-hidden shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => updateNode(node.id, { fontWeight: (node.fontWeight || 400) >= 700 ? 400 : 700 })}
                                        className={`p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer ${(node.fontWeight || 400) >= 700 ? 'bg-neutral-200 dark:bg-neutral-700 font-bold text-blue-600' : ''
                                            }`}
                                    >
                                        <Bold className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateNode(node.id, { fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                        className={`p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer border-l border-neutral-200 dark:border-neutral-700 ${node.fontStyle === 'italic' ? 'bg-neutral-200 dark:bg-neutral-700 text-blue-600' : ''
                                            }`}
                                    >
                                        <Italic className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateNode(node.id, { textDecoration: node.textDecoration === 'underline' ? 'none' : 'underline' })}
                                        className={`p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer border-l border-neutral-200 dark:border-neutral-700 ${node.textDecoration === 'underline' ? 'bg-neutral-200 dark:bg-neutral-700 text-blue-600' : ''
                                            }`}
                                    >
                                        <Underline className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <MSNumberInput
                                    value={node.fontSize || 12}
                                    unit="px"
                                    onChange={(v) => updateNode(node.id, { fontSize: v })}
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-2">
                                <div className="flex border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 overflow-hidden shadow-2xs">
                                    {[
                                        { v: 'start', icon: AlignLeft },
                                        { v: 'middle', icon: AlignCenter },
                                        { v: 'end', icon: AlignRight }
                                    ].map((o) => {
                                        const Icon = o.icon;
                                        return (
                                            <button
                                                key={o.v}
                                                type="button"
                                                title={`Align text ${o.v === 'start' ? 'left' : o.v === 'end' ? 'right' : 'center'}`}
                                                onClick={() => updateNode(node.id, { textAlign: o.v })}
                                                className={`p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer ${(node.textAlign || 'middle') === o.v ? 'bg-neutral-200 dark:bg-neutral-700 text-blue-600' : ''
                                                    }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 overflow-hidden shadow-2xs">
                                    {[
                                        { v: 'start', icon: AlignVerticalJustifyStart, label: 'top' },
                                        { v: 'middle', icon: AlignVerticalJustifyCenter, label: 'middle' },
                                        { v: 'end', icon: AlignVerticalJustifyEnd, label: 'bottom' }
                                    ].map((o) => {
                                        const Icon = o.icon;
                                        return (
                                            <button
                                                key={o.v}
                                                type="button"
                                                title={`Align text to ${o.label}`}
                                                onClick={() => updateNode(node.id, { verticalAlign: o.v })}
                                                className={`p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer ${(node.verticalAlign || 'middle') === o.v ? 'bg-neutral-200 dark:bg-neutral-700 text-blue-600' : ''
                                                    }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-0.5">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">Letter Spacing</span>
                                <MSNumberInput
                                    value={node.letterSpacing ?? 0}
                                    unit="px"
                                    min={-5}
                                    max={30}
                                    step={0.5}
                                    onChange={(v) => updateNode(node.id, { letterSpacing: v })}
                                />
                            </div>

                            <MSColorPicker
                                label="Text Color"
                                checked={true}
                                value={node.fontColor || '#000000'}
                                onChange={(v) => updateNode(node.id, { fontColor: v })}
                            />
                        </MSAccordion>

                        <MSAccordion title="Text Padding" defaultOpen={true}>
                            <div className="flex items-center justify-between py-0.5">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">Horizontal</span>
                                <MSNumberInput
                                    value={node.textPaddingX ?? 10}
                                    unit="px"
                                    min={0}
                                    max={100}
                                    onChange={(v) => updateNode(node.id, { textPaddingX: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between py-0.5">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">Vertical</span>
                                <MSNumberInput
                                    value={node.textPaddingY ?? 4}
                                    unit="px"
                                    min={0}
                                    max={100}
                                    onChange={(v) => updateNode(node.id, { textPaddingY: v })}
                                />
                            </div>
                        </MSAccordion>
                    </div>
                )}

                {activeTab === 'Arrange' && (
                    <div className="space-y-3">
                        <MSAccordion title="Layering & Order" defaultOpen={true}>
                            <div className="flex flex-col gap-1.5">
                                <MenuItem label="To Front" icon={ChevronsUp} onClick={() => onAction && onAction('toFront')} />
                                <MenuItem label="Bring Forward" icon={ChevronUp} onClick={() => onAction && onAction('bringForward')} />
                                <MenuItem label="Send Backward" icon={ChevronDown} onClick={() => onAction && onAction('sendBackward')} />
                                <MenuItem label="To Back" icon={ChevronsDown} onClick={() => onAction && onAction('toBack')} />
                            </div>
                        </MSAccordion>

                        <MSAccordion title="Transform & Geometry" defaultOpen={true}>
                            <div className="flex items-center justify-between py-0.5">
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">X Position</span>
                                <MSNumberInput
                                    value={Math.round(node.x || 0)}
                                    unit="px"
                                    onChange={(v) => updateNode(node.id, { x: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between py-0.5">
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Y Position</span>
                                <MSNumberInput
                                    value={Math.round(node.y || 0)}
                                    unit="px"
                                    onChange={(v) => updateNode(node.id, { y: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between py-0.5">
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Width</span>
                                <MSNumberInput
                                    value={node.width || 120}
                                    unit="px"
                                    onChange={(v) => updateNode(node.id, { width: Math.max(10, v) })}
                                />
                            </div>
                            <div className="flex items-center justify-between py-0.5">
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Height</span>
                                <MSNumberInput
                                    value={node.height || 40}
                                    unit="px"
                                    onChange={(v) => updateNode(node.id, { height: Math.max(10, v) })}
                                />
                            </div>
                        </MSAccordion>

                        <MSAccordion title="Align to Page" defaultOpen={true}>
                            <div className="flex items-center justify-between gap-1.5">
                                {[
                                    { a: 'alignLeftPage', icon: AlignStartVertical, title: 'Align left' },
                                    { a: 'alignHCenterPage', icon: AlignCenterVertical, title: 'Align center' },
                                    { a: 'alignRightPage', icon: AlignEndVertical, title: 'Align right' },
                                    { a: 'alignTopPage', icon: AlignStartHorizontal, title: 'Align top' },
                                    { a: 'alignVCenterPage', icon: AlignCenterHorizontal, title: 'Align middle' },
                                    { a: 'alignBottomPage', icon: AlignEndHorizontal, title: 'Align bottom' }
                                ].map(({ a, icon: Icon, title }) => (
                                    <button
                                        key={a}
                                        type="button"
                                        title={title}
                                        onClick={() => onAction && onAction(a)}
                                        className="flex-1 flex items-center justify-center p-1.5 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer shadow-2xs"
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                    </button>
                                ))}
                            </div>
                        </MSAccordion>
                    </div>
                )}

                {activeTab === 'Image' && isImage && (
                    <div className="space-y-3">
                        <MSAccordion title="Image Tools" defaultOpen={true}>
                            {node.imageSrc && (
                                <img
                                    src={node.imageSrc}
                                    alt="Selected element"
                                    className="w-full h-24 object-cover rounded border border-neutral-300 dark:border-neutral-700 mb-2 shadow-2xs"
                                />
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onOpenCropModal && onOpenCropModal(node.id)}
                                    className="flex-1 py-1.5 bg-blue-600 text-white rounded font-bold text-xs hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                                >
                                    <Crop className="w-3.5 h-3.5" /> Crop Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                    className="flex-1 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-200 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                                >
                                    <ImageIcon className="w-3.5 h-3.5" /> Replace
                                </button>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReplaceFile} className="hidden" />
                        </MSAccordion>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================================
   Multi-Select Panel (Align & Distribute)
   ============================================================================ */

function MultiSelectPanel({ count, onAction }) {
    return (
        <div className="flex flex-col text-xs">
            <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-2">
                <span className="font-bold text-neutral-800 dark:text-neutral-200">{count} Objects Selected</span>
            </div>
            <div className="py-2 space-y-3">
                <MSAccordion title="Align" defaultOpen={true}>
                    <div className="flex items-center justify-between gap-1.5">
                        {[
                            { a: 'alignLeft', icon: AlignStartVertical, title: 'Align left' },
                            { a: 'alignHCenter', icon: AlignCenterVertical, title: 'Align center' },
                            { a: 'alignRight', icon: AlignEndVertical, title: 'Align right' },
                            { a: 'alignTop', icon: AlignStartHorizontal, title: 'Align top' },
                            { a: 'alignVCenter', icon: AlignCenterHorizontal, title: 'Align middle' },
                            { a: 'alignBottom', icon: AlignEndHorizontal, title: 'Align bottom' }
                        ].map(({ a, icon: Icon, title }) => (
                            <button
                                key={a}
                                type="button"
                                title={title}
                                onClick={() => onAction && onAction(a)}
                                className="flex-1 flex items-center justify-center p-1.5 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer shadow-2xs"
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </button>
                        ))}
                    </div>
                </MSAccordion>

                <MSAccordion title="Distribute" defaultOpen={true}>
                    <div className="flex flex-col gap-1.5">
                        <MenuItem label="Distribute Horizontally" icon={StretchHorizontal} onClick={() => onAction && onAction('distributeH')} />
                        <MenuItem label="Distribute Vertically" icon={StretchVertical} onClick={() => onAction && onAction('distributeV')} />
                    </div>
                    {count < 3 && (
                        <p className="text-[10px] text-neutral-400 pt-1">Select at least 3 objects to distribute spacing evenly.</p>
                    )}
                </MSAccordion>

                <MSAccordion title="Layering & Order" defaultOpen={true}>
                    <div className="flex flex-col gap-1.5">
                        <MenuItem label="To Front" icon={ChevronsUp} onClick={() => onAction && onAction('toFront')} />
                        <MenuItem label="Bring Forward" icon={ChevronUp} onClick={() => onAction && onAction('bringForward')} />
                        <MenuItem label="Send Backward" icon={ChevronDown} onClick={() => onAction && onAction('sendBackward')} />
                        <MenuItem label="To Back" icon={ChevronsDown} onClick={() => onAction && onAction('toBack')} />
                    </div>
                </MSAccordion>
            </div>
        </div>
    );
}

/* ============================================================================
   Edge Panel
   ============================================================================ */

function EdgeStylePanel({ edge, onChange }) {
    return (
        <div className="flex flex-col text-xs">
            <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800 mb-2">
                <span className="font-bold text-neutral-800 dark:text-neutral-200">Connector Format</span>
            </div>

            <PresetSlideBar presets={EDGE_PRESETS} onApply={(p) => onChange({ ...edge, ...p })} />

            <MSAccordion title="Line Properties" defaultOpen={true}>
                <MSColorPicker
                    label="Line Color"
                    checked={true}
                    value={edge.strokeColor || '#000000'}
                    onChange={(v) => onChange({ ...edge, strokeColor: v })}
                />
                <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Width</span>
                    <MSNumberInput
                        value={edge.strokeWidth || 1}
                        unit="pt"
                        step={0.5}
                        onChange={(v) => onChange({ ...edge, strokeWidth: v })}
                    />
                </div>
                <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Pattern</span>
                    <LineStyleSelect
                        value={edge.strokeStyle || 'solid'}
                        options={LINE_STYLES}
                        onChange={(val) => onChange({ ...edge, strokeStyle: val })}
                        className="w-32"
                    />
                </div>
                <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Routing</span>
                    <CustomSelect
                        value={edge.routingStyle || 'orthogonal'}
                        options={ROUTING_STYLES}
                        onChange={(val) => onChange({ ...edge, routingStyle: val })}
                        className="w-32"
                    />
                </div>
            </MSAccordion>

            <MSAccordion title="Endpoints & Markers" defaultOpen={true}>
                <div className="space-y-2.5">
                    {/* START MARKER */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between py-0.5">
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Start Marker</span>
                            <EndpointStyleSelect
                                value={edge.markerStart || 'none'}
                                options={ENDPOINT_STYLES}
                                onChange={(val) => onChange({ ...edge, markerStart: val })}
                                isStart={true}
                                className="w-32"
                            />
                        </div>
                        {edge.markerStart && edge.markerStart !== 'none' && (
                            <div className="flex items-center justify-between py-0.5 pl-2 border-l-2 border-blue-500/40">
                                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Start Size</span>
                                <MSNumberInput
                                    value={edge.markerStartSize ?? edge.markerStartWidth ?? 10}
                                    unit="pt"
                                    min={1}
                                    max={50}
                                    onChange={(v) => onChange({ ...edge, markerStartSize: v, markerStartWidth: v })}
                                />
                            </div>
                        )}
                    </div>

                    {/* END MARKER */}
                    <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                        <div className="flex items-center justify-between py-0.5">
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">End Marker</span>
                            <EndpointStyleSelect
                                value={edge.markerEnd || 'arrow'}
                                options={ENDPOINT_STYLES}
                                onChange={(val) => onChange({ ...edge, markerEnd: val })}
                                isStart={false}
                                className="w-32"
                            />
                        </div>
                        {edge.markerEnd && edge.markerEnd !== 'none' && (
                            <div className="flex items-center justify-between py-0.5 pl-2 border-l-2 border-blue-500/40">
                                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">End Size</span>
                                <MSNumberInput
                                    value={edge.markerEndSize ?? edge.markerEndWidth ?? 10}
                                    unit="pt"
                                    min={1}
                                    max={50}
                                    onChange={(v) => onChange({ ...edge, markerEndSize: v, markerEndWidth: v })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </MSAccordion>
        </div>
    );
}

/* ============================================================================
   Main Sidebar / CollapsiblePanel Component Exports
   ============================================================================ */

export function CollapsiblePanel({
    canvasConfig,
    setCanvasConfig,
    canvasSettings,
    setCanvasSettings,
    selectedNode,
    updateNode,
    selectedEdge,
    updateEdge,
    onOpenCropModal,
    isOpen = true,
    onToggle,
    width = 300,
    onAction,
    multiSelectedCount = 0
}) {
    return (
        <div
            style={{ width: isOpen ? `${width}px` : '0px' }}
            className="h-full overflow-hidden shrink-0 bg-[#f8f9fa] dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 transition-[width] duration-200 ease-in-out"
        >
            <div
                style={{ width: `${width}px` }}
                className="h-full overflow-y-auto flex flex-col text-xs font-sans select-none bg-[#f8f9fa] dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
            >
                <div className="p-2.5 border-b border-neutral-300 dark:border-neutral-800 bg-[#ebebeb] dark:bg-neutral-800/80 sticky top-0 z-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 text-xs tracking-tight">
                            Format Pane
                        </span>
                    </div>
                    {onToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded cursor-pointer transition-colors text-neutral-500"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="p-3 flex-1">
                    {multiSelectedCount > 1 ? (
                        <MultiSelectPanel count={multiSelectedCount} onAction={onAction} />
                    ) : selectedNode ? (
                        <NodeStylePanel
                            node={selectedNode}
                            updateNode={updateNode}
                            onOpenCropModal={onOpenCropModal}
                            onAction={onAction}
                        />
                    ) : selectedEdge ? (
                        <EdgeStylePanel edge={selectedEdge} onChange={updateEdge} />
                    ) : (
                        <CanvasStylePanel
                            config={canvasConfig || {}}
                            setConfig={setCanvasConfig}
                            canvasSettings={canvasSettings}
                            setCanvasSettings={setCanvasSettings}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default CollapsiblePanel;

export function CollapsibleSection({ side = 'right', open, width = 256, children, panelId }) {
    const isRight = side === 'right';

    return (
        <div
            id={panelId}
            style={{ width: open ? `${width}px` : '0px' }}
            className={`h-full overflow-hidden shrink-0 bg-[#f8f9fa] dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 transition-[width] duration-200 ease-in-out ${isRight ? 'border-l' : 'border-r'
                }`}
        >
            <div style={{ width: `${width}px` }} className="h-full">
                {children}
            </div>
        </div>
    );
}