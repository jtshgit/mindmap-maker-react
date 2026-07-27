import React from 'react';

// ─── LINE TYPES ─────────────────────────────────────────────────────────────
// Basic connector lines that can be dragged/clicked from the sidebar, same as
// shapes. Each entry maps directly onto edge fields already understood by the
// existing edge renderer in App.js (markerStart / markerEnd / strokeStyle) —
// no new edge-rendering logic needed, just new starting presets.
export const LINE_TYPES = [
  {
    id: 'line',
    label: 'Line',
    markerStart: 'none',
    markerEnd: 'none',
    icon: (
      <svg width="24" height="16" viewBox="0 0 24 16">
        <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    id: 'arrow',
    label: 'Arrow',
    markerStart: 'none',
    markerEnd: 'arrow',
    icon: (
      <svg width="24" height="16" viewBox="0 0 24 16">
        <line x1="2" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="15 4, 22 8, 15 12" fill="currentColor" />
      </svg>
    )
  },
  {
    id: 'double-arrow',
    label: 'Double Arrow',
    markerStart: 'arrow',
    markerEnd: 'arrow',
    icon: (
      <svg width="24" height="16" viewBox="0 0 24 16">
        <polygon points="9 4, 2 8, 9 12" fill="currentColor" />
        <line x1="4" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="15 4, 22 8, 15 12" fill="currentColor" />
      </svg>
    )
  },
  {
    id: 'dashed',
    label: 'Dashed Line',
    markerStart: 'none',
    markerEnd: 'none',
    strokeStyle: 'dashed',
    icon: (
      <svg width="24" height="16" viewBox="0 0 24 16">
        <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,3" />
      </svg>
    )
  },
  {
    id: 'dashed-arrow',
    label: 'Dashed Arrow',
    markerStart: 'none',
    markerEnd: 'arrow',
    strokeStyle: 'dashed',
    icon: (
      <svg width="24" height="16" viewBox="0 0 24 16">
        <line x1="2" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,3" />
        <polygon points="15 4, 22 8, 15 12" fill="currentColor" />
      </svg>
    )
  },
];

export function getLineType(id) {
  return LINE_TYPES.find(l => l.id === id) || LINE_TYPES[0];
}