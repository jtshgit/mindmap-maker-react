// useKeyboardShortcuts.js
import { useEffect } from 'react';
import { SHORTCUTS } from './shortcutsConfig';

export function useKeyboardShortcuts(actionHandlers) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            const isEditing =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            if (isEditing) return;

            const isCmdOrCtrl = e.metaKey || e.ctrlKey;
            const key = e.key;
            const lowerKey = key.toLowerCase();

            for (const sc of SHORTCUTS) {
                const matchCmd = !!sc.ctrlOrCmd === isCmdOrCtrl;
                const matchShift = !!sc.shift === !!e.shiftKey;
                const matchAlt = !!sc.alt === !!e.altKey;

                const targetKeys = Array.isArray(sc.key) ? sc.key : [sc.key];
                const matchKey = targetKeys.some(
                    (k) => k.toLowerCase() === lowerKey || k === key
                );

                if (matchCmd && matchShift && matchAlt && matchKey) {
                    const handler = actionHandlers[sc.id];
                    if (handler) {
                        e.preventDefault();
                        handler(e);
                        break;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [actionHandlers]);
}