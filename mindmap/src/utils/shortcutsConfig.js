// shortcutsConfig.js

export const SHORTCUTS = [
    // --- File & Editing ---
    { id: 'addPage', name: 'Add Page', displayKey: '⌘ N', ctrlOrCmd: true, key: 'n' },
    { id: 'openFile', name: 'Open File', displayKey: '⌘ O', ctrlOrCmd: true, key: 'o' },
    { id: 'saveFile', name: 'Save File', displayKey: '⌘ S', ctrlOrCmd: true, key: 's' },
    { id: 'undo', name: 'Undo', displayKey: '⌘ Z', ctrlOrCmd: true, key: 'z' },
    { id: 'redoShift', name: 'Redo', displayKey: '⌘ ⇧ Z', ctrlOrCmd: true, shift: true, key: 'z' },
    { id: 'redo', name: 'Redo', displayKey: '⌘ Y', ctrlOrCmd: true, key: 'y', hidden: true },
    { id: 'cut', name: 'Cut Element', displayKey: '⌘ X', ctrlOrCmd: true, key: 'x' },
    { id: 'copy', name: 'Copy Element', displayKey: '⌘ C', ctrlOrCmd: true, key: 'c' },
    { id: 'paste', name: 'Paste Element', displayKey: '⌘ V', ctrlOrCmd: true, key: 'v' },
    { id: 'duplicate', name: 'Duplicate', displayKey: '⌘ D', ctrlOrCmd: true, key: 'd' },
    { id: 'selectAll', name: 'Select All', displayKey: '⌘ A', ctrlOrCmd: true, key: 'a' },

    // --- Selection & Layers ---
    { id: 'reverseDirection', name: 'Reverse Direction', displayKey: '⌘ ⇧ R', ctrlOrCmd: true, shift: true, key: 'r' },
    { id: 'editTitle', name: 'Edit Title', displayKey: '⌘ R', ctrlOrCmd: true, key: 'r' },
    { id: 'insertImage', name: 'Insert Image', displayKey: '⌘ I', ctrlOrCmd: true, key: 'i' },
    { id: 'lock', name: 'Lock Selection', displayKey: '⌘ L', ctrlOrCmd: true, key: 'l' },
    { id: 'toFront', name: 'Bring to Front', displayKey: '⌘ ]', ctrlOrCmd: true, key: ']' },
    { id: 'toBack', name: 'Send to Back', displayKey: '⌘ [', ctrlOrCmd: true, key: '[' },

    // --- View & Controls ---
    { id: 'shapeLib', name: 'Shape Library', displayKey: '⌘ 1', ctrlOrCmd: true, key: '1' },
    { id: 'propsSidebar', name: 'Properties Sidebar', displayKey: '⌘ 2', ctrlOrCmd: true, key: '2' },
    { id: 'toggleGrid', name: 'Toggle Grid', displayKey: "⌘ '", ctrlOrCmd: true, key: "'" },
    { id: 'resetViewport', name: 'Reset Viewport', displayKey: '⌘ Alt 0', ctrlOrCmd: true, alt: true, key: '0' },
    { id: 'fitPage', name: 'Fit Page', displayKey: '⌘ 0', ctrlOrCmd: true, key: '0' },
    { id: 'zoomIn', name: 'Zoom In', displayKey: '⌘ +', ctrlOrCmd: true, key: ['=', '+'] },
    { id: 'zoomOut', name: 'Zoom Out', displayKey: '⌘ -', ctrlOrCmd: true, key: '-' },
    { id: 'shortcutsHelp', name: 'Shortcuts Help', displayKey: '⌘ /', ctrlOrCmd: true, key: '/' },

    // --- Single Keys ---
    { id: 'delete', name: 'Delete Selected', displayKey: 'Del / Backspace', key: ['Delete', 'Backspace'] },
    { id: 'editText', name: 'Edit Node Text', displayKey: 'F2', key: 'F2' },
    { id: 'fullscreen', name: 'Toggle Fullscreen', displayKey: 'F', key: 'f' },
    { id: 'selectTool', name: 'Select Tool', displayKey: 'V', key: 'v' },
    { id: 'panTool', name: 'Pan / Hand Tool', displayKey: 'H', key: 'h' },
    { id: 'addText', name: 'Text Shape', displayKey: 'T', key: 't' },
    { id: 'addFreeLine', name: 'Free Line Tool', displayKey: 'L', key: 'l' },
    { id: 'addRectangle', name: 'Rectangle Shape', displayKey: 'R', key: 'r' },
    { id: 'addEllipse', name: 'Ellipse Shape', displayKey: 'C', key: 'c' },
    { id: 'addDiamond', name: 'Diamond Shape', displayKey: 'D', key: 'd' },
];