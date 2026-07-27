export const GUIDE_ALIGN_TOLERANCE = 15;
export const GUIDE_SPACING_TOLERANCE = 6;

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Simple value/label candidate matcher — used for resize-edge snapping.
export function findAxisSnap(value, candidates, tolerance = GUIDE_ALIGN_TOLERANCE) {
    let best = null;
    candidates.forEach(({ val, label }) => {
        const diff = Math.abs(val - value);
        if (diff < tolerance && (!best || diff < best.diff)) {
            best = { value: val, label, diff };
        }
    });
    return best;
}

// Full box-vs-box smart guide computation — used while dragging a node/group.
// Returns the best x/y alignment snap (if any), plus a `guides` array ready
// to render: alignment lines, equal-spacing badges, and size-match badges.
export function computeSmartGuides(movingBox, others, pageW, pageH) {
    const { x: rawX, y: rawY, w, h } = movingBox;
    let bestX = null, bestY = null;
    const guides = [];
    const candidatesX = [];
    const candidatesY = [];

    others.forEach(n => {
        candidatesX.push(
            { ref: rawX, val: n.x, label: 'L' },
            { ref: rawX + w / 2, val: n.x + n.w / 2, label: 'C' },
            { ref: rawX + w, val: n.x + n.w, label: 'R' },
            { ref: rawX, val: n.x + n.w, label: 'R→L' },
            { ref: rawX + w, val: n.x, label: 'L←R' },
        );
        candidatesY.push(
            { ref: rawY, val: n.y, label: 'T' },
            { ref: rawY + h / 2, val: n.y + n.h / 2, label: 'M' },
            { ref: rawY + h, val: n.y + n.h, label: 'B' },
            { ref: rawY, val: n.y + n.h, label: 'B→T' },
            { ref: rawY + h, val: n.y, label: 'T←B' },
        );
    });

    // Page/canvas center alignment
    candidatesX.push({ ref: rawX + w / 2, val: pageW / 2, label: 'Page Center' });
    candidatesY.push({ ref: rawY + h / 2, val: pageH / 2, label: 'Page Center' });

    candidatesX.forEach(({ ref, val, label }) => {
        const diff = Math.abs(val - ref);
        if (diff < GUIDE_ALIGN_TOLERANCE && (!bestX || diff < bestX.diff)) {
            bestX = { value: val, label, diff, correction: val - ref };
        }
    });
    candidatesY.forEach(({ ref, val, label }) => {
        const diff = Math.abs(val - ref);
        if (diff < GUIDE_ALIGN_TOLERANCE && (!bestY || diff < bestY.diff)) {
            bestY = { value: val, label, diff, correction: val - ref };
        }
    });

    if (bestX) guides.push({ type: 'align', axis: 'x', value: bestX.value, label: bestX.label });
    if (bestY) guides.push({ type: 'align', axis: 'y', value: bestY.value, label: bestY.label });

    const finalX = bestX ? rawX + bestX.correction : rawX;
    const finalY = bestY ? rawY + bestY.correction : rawY;

    // --- Equal horizontal spacing ---
    const leftN = others.filter(n => n.x + n.w <= finalX + 1)
        .sort((a, b) => (b.x + b.w) - (a.x + a.w))[0];
    const rightN = others.filter(n => n.x >= finalX + w - 1)
        .sort((a, b) => a.x - b.x)[0];
    if (leftN && rightN) {
        const gapLeft = finalX - (leftN.x + leftN.w);
        const gapRight = rightN.x - (finalX + w);
        if (gapLeft > -1 && Math.abs(gapLeft - gapRight) < GUIDE_SPACING_TOLERANCE) {
            guides.push({
                type: 'spacing', axis: 'x',
                y: Math.min(leftN.y, rightN.y, finalY) - 26,
                x1: leftN.x + leftN.w, x2: finalX, x3: finalX + w, x4: rightN.x,
                gap: Math.round((gapLeft + gapRight) / 2)
            });
        }
    }

    // --- Equal vertical spacing ---
    const topN = others.filter(n => n.y + n.h <= finalY + 1)
        .sort((a, b) => (b.y + b.h) - (a.y + a.h))[0];
    const botN = others.filter(n => n.y >= finalY + h - 1)
        .sort((a, b) => a.y - b.y)[0];
    if (topN && botN) {
        const gapTop = finalY - (topN.y + topN.h);
        const gapBot = botN.y - (finalY + h);
        if (gapTop > -1 && Math.abs(gapTop - gapBot) < GUIDE_SPACING_TOLERANCE) {
            guides.push({
                type: 'spacing', axis: 'y',
                x: Math.min(topN.x, botN.x, finalX) - 26,
                y1: topN.y + topN.h, y2: finalY, y3: finalY + h, y4: botN.y,
                gap: Math.round((gapTop + gapBot) / 2)
            });
        }
    }

    // --- Match-size badges ---
    if (others.some(n => Math.abs(n.w - w) < 2)) guides.push({ type: 'size-match', label: '=W' });
    if (others.some(n => Math.abs(n.h - h) < 2)) guides.push({ type: 'size-match', label: '=H' });

    return { bestX, bestY, guides };
}