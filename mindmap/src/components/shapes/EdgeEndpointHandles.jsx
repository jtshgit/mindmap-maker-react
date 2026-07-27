import React from 'react';

/**
 * The two green "X in a circle" grab handles shown at the start/end of a
 * selected or hovered edge, used to drag-reconnect or detach that end.
 * Purely presentational — App.js supplies the already-computed points and
 * decides (via handlePointerDown) what dragging them actually does.
 */
export default function EdgeEndpointHandles({ startPt, endPt, sf, onStartPointerDown, onEndPointerDown }) {
    return (
        <>
            {/* Start handle */}
            <g cursor="grab" onPointerDown={onStartPointerDown}>
                <circle cx={startPt.x} cy={startPt.y} r={9 * sf} fill="#22c55e" stroke="#fff" strokeWidth={3 * sf} />
                <line x1={startPt.x - 4 * sf} y1={startPt.y - 4 * sf} x2={startPt.x + 4 * sf} y2={startPt.y + 4 * sf}
                    stroke="#fff" strokeWidth={2 * sf} strokeLinecap="round" />
                <line x1={startPt.x + 4 * sf} y1={startPt.y - 4 * sf} x2={startPt.x - 4 * sf} y2={startPt.y + 4 * sf}
                    stroke="#fff" strokeWidth={2 * sf} strokeLinecap="round" />
                <title>Drag to adjust / detach start of line from parent box</title>
            </g>

            {/* End handle */}
            <g cursor="grab" onPointerDown={onEndPointerDown}>
                <circle cx={endPt.x} cy={endPt.y} r={9 * sf} fill="#22c55e" stroke="#fff" strokeWidth={3 * sf} />
                <line x1={endPt.x - 4 * sf} y1={endPt.y - 4 * sf} x2={endPt.x + 4 * sf} y2={endPt.y + 4 * sf}
                    stroke="#fff" strokeWidth={2 * sf} strokeLinecap="round" />
                <line x1={endPt.x + 4 * sf} y1={endPt.y - 4 * sf} x2={endPt.x - 4 * sf} y2={endPt.y + 4 * sf}
                    stroke="#fff" strokeWidth={2 * sf} strokeLinecap="round" />
                <title>Drag to adjust / detach end of line</title>
            </g>
        </>
    );
}