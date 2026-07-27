import React, { useEffect } from 'react';
import { Command, MessageSquare, ExternalLink, X } from 'lucide-react';
import { SHORTCUTS } from '../utils/shortcutsConfig';
/**
 * Clean & Tabless Keyboard Shortcuts Modal
 */
// KeyboardShortcutsModal.jsx

export function KeyboardShortcutsModal({ isOpen, onClose }) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Show only shortcuts with names and not marked as hidden
    const visibleShortcuts = SHORTCUTS.filter((s) => !s.hidden && s.name);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-white dark:bg-[#252526] border border-neutral-200 dark:border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden text-neutral-800 dark:text-neutral-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-[#333333]">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                        <Command className="w-4 h-4 text-[#0078d4]" />
                        <span>Keyboard Shortcuts</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#333333] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 grid grid-cols-2 gap-2 text-xs max-h-[60vh] overflow-y-auto">
                    {visibleShortcuts.map((sc) => (
                        <div
                            key={sc.id}
                            className="flex justify-between items-center p-2 rounded bg-neutral-50 dark:bg-[#1e1e1e] border border-neutral-200 dark:border-[#333]"
                        >
                            <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate pr-2">
                                {sc.name}
                            </span>
                            <kbd className="font-mono bg-neutral-200 dark:bg-[#2d2d2d] px-1.5 py-0.5 rounded text-[10px] text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 whitespace-nowrap">
                                {sc.displayKey}
                            </kbd>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 bg-neutral-100 dark:bg-[#1e1e1e] border-t border-neutral-200 dark:border-[#333333] flex justify-between items-center text-[10px] text-neutral-500">
                    <span>Visio Studio Enterprise</span>
                    <span>
                        Press <kbd className="font-mono bg-neutral-200 dark:bg-[#2d2d2d] px-1 rounded">Esc</kbd> to close
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Clean & Tabless Support Modal
 */
export function SupportModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#252526] border border-neutral-200 dark:border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden text-neutral-800 dark:text-neutral-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-[#333333]">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                        <MessageSquare className="w-4 h-4 text-[#0078d4]" />
                        <span>Get Support & Feedback</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#333333] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 text-xs">
                    <div className="p-3 bg-blue-50 dark:bg-[#0078d4]/10 border border-blue-200 dark:border-[#0078d4]/30 rounded-lg">
                        <h4 className="font-semibold text-[#0078d4] mb-1">Need Enterprise Assistance?</h4>
                        <p className="text-neutral-600 dark:text-neutral-300">Contact system support or send direct feedback to our technical team.</p>
                    </div>

                    <a
                        href="https://support.microsoft.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-[#333333] hover:bg-neutral-50 dark:hover:bg-[#2d2d2d] transition-colors"
                    >
                        <div>
                            <div className="font-medium text-neutral-900 dark:text-white">Online Knowledge Base</div>
                            <div className="text-[10px] text-neutral-400">View documentation and diagram guides.</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-neutral-400" />
                    </a>

                    <div className="space-y-1.5">
                        <label className="font-medium text-neutral-700 dark:text-neutral-300">Submit Direct Issue / Suggestion</label>
                        <textarea
                            rows="3"
                            placeholder="Type your question or feedback..."
                            className="w-full p-2.5 text-xs rounded-lg border border-neutral-300 dark:border-[#3c3c3c] bg-neutral-50 dark:bg-[#1e1e1e] text-neutral-900 dark:text-white focus:outline-none focus:border-[#0078d4]"
                        />
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg font-medium text-xs transition-colors"
                    >
                        Send Feedback
                    </button>
                </div>
            </div>
        </div>
    );
}