import { useMemo } from 'react';
import { getShapeConnectionPoints } from '../components/shapes/ShapeDefinitions';

export const PORT_OPPOSITE = { R: 'L', L: 'R', T: 'B', B: 'T' };

/**
 * Production-Grade Flowchart Connection & Auto-Routing Math
 */
export function useConnectionMath({ nodes, edges, BOX_W = 120, BOX_H = 80, EXIT = 20, SNAP_RADIUS = 10, snap = (v) => v }) {
    return useMemo(() => {
        // Helper to consistently get node bounding rect
        const getNodeBox = (node) => ({
            x: node.x,
            y: node.y,
            width: node.width || BOX_W,
            height: node.height || BOX_H,
            id: node.id
        });

        // Shape-aware port coordinate resolution in canvas space
        const getPortCoord = (node, port) => {
            if (!node) return { x: 0, y: 0 };
            const w = node.width || BOX_W;
            const h = node.height || BOX_H;
            const shape = node.shapeType || 'rectangle';
            const pts = getShapeConnectionPoints(shape, w, h);
            const p = pts[port] || pts.T || { x: w / 2, y: 0 };
            return { x: node.x + p.x, y: node.y + p.y };
        };

        const getStartCoord = (edge, edgesList = edges, nodesList = nodes, depth = 0) => {
            if (edge.sourceType === 'edgeAnchor') {
                if (depth > 6) return edge.sourcePoint || { x: 0, y: 0 };
                const host = edgesList.find(e => e.id === edge.sourceAnchorEdgeId);
                if (!host) return edge.sourcePoint || { x: 0, y: 0 };
                const coord = buildAnchorCoord(host, edge.sourceAnchorT, edgesList, nodesList, depth + 1);
                return coord || edge.sourcePoint || { x: 0, y: 0 };
            }
            if (edge.sourceType === 'point' || !edge.source) return edge.sourcePoint || { x: 0, y: 0 };
            const srcNode = nodesList.find(n => n.id === edge.source);
            if (srcNode) return getPortCoord(srcNode, edge.portS);
            return edge.sourcePoint || { x: 0, y: 0 };
        };

        const getEndCoord = (edge, edgesList = edges, nodesList = nodes, depth = 0) => {
            if (edge.targetType === 'point' || (!edge.target && edge.targetType !== 'edgeAnchor')) {
                return edge.targetPoint || { x: 0, y: 0 };
            }
            if (edge.targetType === 'edgeAnchor') {
                if (depth > 6) return edge.targetPoint || { x: 0, y: 0 };
                const host = edgesList.find(e => e.id === edge.anchorEdgeId);
                if (!host) return edge.targetPoint || { x: 0, y: 0 };
                const coord = buildAnchorCoord(host, edge.anchorT, edgesList, nodesList, depth + 1);
                return coord || edge.targetPoint || { x: 0, y: 0 };
            }
            const tgtNode = nodesList.find(n => n.id === edge.target);
            if (tgtNode) return getPortCoord(tgtNode, edge.portT);
            return edge.targetPoint || { x: 0, y: 0 };
        };

        const buildFullLine = (edge, edgesList = edges, nodesList = nodes, depth = 0) => {
            const A = getStartCoord(edge, edgesList, nodesList, depth);
            const B = getEndCoord(edge, edgesList, nodesList, depth);
            return [A, ...(edge.waypoints || []), B];
        };

        const buildAnchorCoord = (hostEdge, t, edgesList = edges, nodesList = nodes, depth = 0) => {
            const pts = buildFullLine(hostEdge, edgesList, nodesList, depth);
            if (pts.length < 2) return null;
            const lengths = [];
            let total = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
                lengths.push(d);
                total += d;
            }
            if (total === 0) return { x: pts[0].x, y: pts[0].y };
            let target = (t ?? 0.5) * total;
            for (let i = 0; i < pts.length - 1; i++) {
                const segLen = lengths[i];
                if (target <= segLen || i === lengths.length - 1) {
                    const ratio = segLen === 0 ? 0 : Math.min(1, Math.max(0, target / segLen));
                    const p1 = pts[i], p2 = pts[i + 1];
                    return { x: p1.x + (p2.x - p1.x) * ratio, y: p1.y + (p2.y - p1.y) * ratio };
                }
                target -= segLen;
            }
            return pts[pts.length - 1];
        };

        const getFullLine = (edge) => buildFullLine(edge, edges, nodes);

        const getAnchorPointInfo = (hostEdge, t) => {
            const pts = getFullLine(hostEdge);
            if (pts.length < 2) return null;
            const lengths = [];
            let total = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
                lengths.push(d);
                total += d;
            }
            if (total === 0) return { x: pts[0].x, y: pts[0].y, orientation: 'horizontal' };
            let target = (t ?? 0.5) * total;
            for (let i = 0; i < pts.length - 1; i++) {
                const segLen = lengths[i];
                if (target <= segLen || i === lengths.length - 1) {
                    const ratio = segLen === 0 ? 0 : Math.min(1, Math.max(0, target / segLen));
                    const p1 = pts[i], p2 = pts[i + 1];
                    return {
                        x: p1.x + (p2.x - p1.x) * ratio,
                        y: p1.y + (p2.y - p1.y) * ratio,
                        orientation: Math.abs(p1.y - p2.y) < 0.001 ? 'horizontal' : 'vertical'
                    };
                }
                target -= segLen;
            }
            return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, orientation: 'horizontal' };
        };

        /**
         * Dynamic Line Segment vs Rectangle Slab Collision Test
         */
        const checkLineRectIntersect = (p1, p2, rect) => {
            const rX = rect.x;
            const rY = rect.y;
            const rW = rect.width || rect.w || BOX_W;
            const rH = rect.height || rect.h || BOX_H;

            const minX = Math.min(p1.x, p2.x);
            const maxX = Math.max(p1.x, p2.x);
            const minY = Math.min(p1.y, p2.y);
            const maxY = Math.max(p1.y, p2.y);

            // Fast bounding box rejection
            if (maxX <= rX || minX >= rX + rW || maxY <= rY || minY >= rY + rH) {
                return false;
            }

            // Purely Horizontal Segment
            if (Math.abs(p1.y - p2.y) < 0.001) {
                return p1.y > rY && p1.y < rY + rH && maxX > rX && minX < rX + rW;
            }
            // Purely Vertical Segment
            if (Math.abs(p1.x - p2.x) < 0.001) {
                return p1.x > rX && p1.x < rX + rW && maxY > rY && minY < rY + rH;
            }

            // Slab Test for Diagonal Segments
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;

            let tMin = 0;
            let tMax = 1;

            if (dx !== 0) {
                let t1 = (rX - p1.x) / dx;
                let t2 = (rX + rW - p1.x) / dx;
                if (t1 > t2) [t1, t2] = [t2, t1];
                tMin = Math.max(tMin, t1);
                tMax = Math.min(tMax, t2);
                if (tMin > tMax) return false;
            }

            if (dy !== 0) {
                let t1 = (rY - p1.y) / dy;
                let t2 = (rY + rH - p1.y) / dy;
                if (t1 > t2) [t1, t2] = [t2, t1];
                tMin = Math.max(tMin, t1);
                tMax = Math.min(tMax, t2);
                if (tMin > tMax) return false;
            }

            return tMin <= tMax;
        };

        const isPathClear = (wps, excludeNodeIds = []) => {
            if (!wps || wps.length < 2) return null;
            const excludeSet = new Set(excludeNodeIds);
            for (let i = 0; i < wps.length - 1; i++) {
                for (const n of nodes) {
                    if (excludeSet.has(n.id)) continue;
                    const box = getNodeBox(n);
                    if (checkLineRectIntersect(wps[i], wps[i + 1], box)) return n;
                }
            }
            return null;
        };

        const findEdgeSnapPoint = (cursor, excludeEdgeId) => {
            let best = null;
            edges.forEach(edge => {
                if (edge.id === excludeEdgeId) return;
                const pts = getFullLine(edge);
                if (pts.length < 2) return;
                const lengths = [];
                let total = 0;
                for (let i = 0; i < pts.length - 1; i++) {
                    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
                    lengths.push(d);
                    total += d;
                }
                let acc = 0;
                for (let i = 0; i < pts.length - 1; i++) {
                    const p1 = pts[i], p2 = pts[i + 1];
                    const segLen = lengths[i];
                    if (segLen > 0) {
                        const isHoriz = Math.abs(p1.y - p2.y) < 0.001;
                        let gx, gy;
                        if (isHoriz) {
                            gy = p1.y;
                            gx = Math.min(Math.max(cursor.x, Math.min(p1.x, p2.x)), Math.max(p1.x, p2.x));
                        } else {
                            gx = p1.x;
                            gy = Math.min(Math.max(cursor.y, Math.min(p1.y, p2.y)), Math.max(p1.y, p2.y));
                        }
                        const dist = Math.hypot(cursor.x - gx, cursor.y - gy);
                        if (dist < SNAP_RADIUS && (!best || dist < best.dist)) {
                            const distAlongSeg = Math.hypot(gx - p1.x, gy - p1.y);
                            const t = total > 0 ? (acc + distAlongSeg) / total : 0;
                            best = { edgeId: edge.id, x: gx, y: gy, dist, t };
                        }
                    }
                    acc += segLen;
                }
            });
            return best;
        };

        const getExitPoint = (pt, port) => {
            if (port === 'T') return { x: pt.x, y: pt.y - EXIT };
            if (port === 'B') return { x: pt.x, y: pt.y + EXIT };
            if (port === 'L') return { x: pt.x - EXIT, y: pt.y };
            if (port === 'R') return { x: pt.x + EXIT, y: pt.y };
            return { ...pt };
        };

        /**
         * Waypoint post-processor: Removes duplicate adjacent points, collinear runs,
         * and U-turn redundant loops.
         */
        const cleanup = (wps, portA, portB) => {
            if (!wps || wps.length === 0) return [];
            let p = [portA, ...wps, portB];
            let changed = true;

            while (changed) {
                changed = false;

                // Remove duplicates
                for (let i = 0; i < p.length - 1; i++) {
                    if (Math.hypot(p[i].x - p[i + 1].x, p[i].y - p[i + 1].y) < 0.5) {
                        p.splice(i, 1);
                        changed = true;
                        break;
                    }
                }
                if (changed) continue;

                // Remove collinear points
                for (let i = 0; i < p.length - 2; i++) {
                    const p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
                    const isHoriz = Math.abs(p1.y - p2.y) < 0.5 && Math.abs(p2.y - p3.y) < 0.5;
                    const isVert = Math.abs(p1.x - p2.x) < 0.5 && Math.abs(p2.x - p3.x) < 0.5;

                    if (isHoriz || isVert) {
                        p.splice(i + 1, 1);
                        changed = true;
                        break;
                    }
                }
                if (changed) continue;

                // Remove U-turn loops
                for (let i = 0; i < p.length - 2; i++) {
                    const p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
                    if ((p1.x === p3.x && p1.x === p2.x) || (p1.y === p3.y && p1.y === p2.y)) {
                        p.splice(i + 1, 1);
                        changed = true;
                        break;
                    }
                }
            }

            let finalWps = p.slice(1, -1);

            // Auto-jog fallback for unbent diagonals
            if (finalWps.length === 0 && Math.abs(portA.x - portB.x) > 0.5 && Math.abs(portA.y - portB.y) > 0.5) {
                const midX = snap((portA.x + portB.x) / 2);
                finalWps = [{ x: midX, y: portA.y }, { x: midX, y: portB.y }];
            }

            return finalWps;
        };

        const straightLineWaypoints = (A, B, portS, portT) => {
            if (!portS || !portT || PORT_OPPOSITE[portS] !== portT) return null;
            const isHoriz = portS === 'L' || portS === 'R';
            if (isHoriz) {
                if (Math.abs(A.y - B.y) > 0.5) return null;
                const forward = portS === 'R' ? B.x > A.x : B.x < A.x;
                if (!forward) return null;
            } else {
                if (Math.abs(A.x - B.x) > 0.5) return null;
                const forward = portS === 'B' ? B.y > A.y : B.y < A.y;
                if (!forward) return null;
            }
            return [];
        };

        /**
         * Deterministic Manhattan Fallback Router
         */
        const manhattanFallback = (A, exA, exB, B, portS, portT) => {
            const isHorizS = portS === 'L' || portS === 'R';
            const isHorizT = portT === 'L' || portT === 'R';
            const isVertS = portS === 'T' || portS === 'B';
            const isVertT = portT === 'T' || portT === 'B';

            if (!portS && !portT) {
                if (A.x === B.x || A.y === B.y) return [A, B];
                const midX = snap((A.x + B.x) / 2);
                return [A, { x: midX, y: A.y }, { x: midX, y: B.y }, B];
            }
            if (!portT) return [A, exA, isVertS ? { x: B.x, y: exA.y } : { x: exA.x, y: B.y }, B];
            if (!portS) return [A, isVertT ? { x: A.x, y: exB.y } : { x: exB.x, y: A.y }, exB, B];

            if (isHorizS && isHorizT) {
                const midX = snap((exA.x + exB.x) / 2);
                return [A, exA, { x: midX, y: exA.y }, { x: midX, y: exB.y }, exB, B];
            }
            if (isVertS && isVertT) {
                const midY = snap((exA.y + exB.y) / 2);
                return [A, exA, { x: exA.x, y: midY }, { x: exB.x, y: midY }, exB, B];
            }

            return [A, exA, isHorizS ? { x: exA.x, y: exB.y } : { x: exB.x, y: exA.y }, exB, B];
        };

        /**
         * Industry Standard Orthogonal A* Channel Auto-Router
         */
        const smartRoute = (A, B, portS, portT, srcNodeId = null, tgtNodeId = null) => {
            const exA = portS ? getExitPoint(A, portS) : { ...A };
            const exB = portT ? getExitPoint(B, portT) : { ...B };

            // Check if unobstructed straight shot exists
            const straight = straightLineWaypoints(A, B, portS, portT);
            if (straight !== null && isPathClear([A, B], [srcNodeId, tgtNodeId]) === null) {
                return [];
            }

            // Gather obstacle nodes excluding source/target
            const obstacleBoxes = nodes
                .filter(n => n.id !== srcNodeId && n.id !== tgtNodeId)
                .map(n => getNodeBox(n));

            // Construct orthogonal grid channels
            const margin = Math.max(EXIT, 20);
            const xSet = new Set([snap(A.x), snap(B.x), snap(exA.x), snap(exB.x)]);
            const ySet = new Set([snap(A.y), snap(B.y), snap(exA.y), snap(exB.y)]);

            nodes.forEach(n => {
                const w = n.width || BOX_W;
                const h = n.height || BOX_H;
                xSet.add(snap(n.x - margin));
                xSet.add(snap(n.x + w + margin));
                xSet.add(snap(n.x + w / 2));

                ySet.add(snap(n.y - margin));
                ySet.add(snap(n.y + h + margin));
                ySet.add(snap(n.y + h / 2));
            });

            xSet.add(snap((exA.x + exB.x) / 2));
            ySet.add(snap((exA.y + exB.y) / 2));

            const xCoords = Array.from(xSet).sort((a, b) => a - b);
            const yCoords = Array.from(ySet).sort((a, b) => a - b);

            const startPt = { x: snap(exA.x), y: snap(exA.y) };
            const endPt = { x: snap(exB.x), y: snap(exB.y) };

            const isSegmentBlocked = (p1, p2) => {
                for (const box of obstacleBoxes) {
                    if (checkLineRectIntersect(p1, p2, box)) return true;
                }
                return false;
            };

            // A* Search Strategy
            const openSet = [];
            const closedSet = new Set();
            const gScore = new Map();
            const cameFrom = new Map();

            const getKey = (x, y) => `${x},${y}`;
            const startKey = getKey(startPt.x, startPt.y);
            const endKey = getKey(endPt.x, endPt.y);

            gScore.set(startKey, 0);
            openSet.push({
                x: startPt.x,
                y: startPt.y,
                f: Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y),
                dirX: 0,
                dirY: 0
            });

            let foundPath = null;
            let iterations = 0;
            const MAX_ITERATIONS = 400;

            while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
                iterations++;
                openSet.sort((a, b) => a.f - b.f);
                const current = openSet.shift();
                const currKey = getKey(current.x, current.y);

                if (currKey === endKey) {
                    const path = [{ x: current.x, y: current.y }];
                    let k = endKey;
                    while (cameFrom.has(k)) {
                        const prev = cameFrom.get(k);
                        path.unshift({ x: prev.x, y: prev.y });
                        k = getKey(prev.x, prev.y);
                    }
                    foundPath = path;
                    break;
                }

                closedSet.add(currKey);

                const xi = xCoords.indexOf(current.x);
                const yi = yCoords.indexOf(current.y);

                const neighbors = [];
                if (xi > 0) neighbors.push({ x: xCoords[xi - 1], y: current.y });
                if (xi < xCoords.length - 1) neighbors.push({ x: xCoords[xi + 1], y: current.y });
                if (yi > 0) neighbors.push({ x: current.x, y: yCoords[yi - 1] });
                if (yi < yCoords.length - 1) neighbors.push({ x: current.x, y: yCoords[yi + 1] });

                for (const neighbor of neighbors) {
                    const neighborKey = getKey(neighbor.x, neighbor.y);
                    if (closedSet.has(neighborKey)) continue;

                    if (isSegmentBlocked(current, neighbor)) continue;

                    const dx = Math.sign(neighbor.x - current.x);
                    const dy = Math.sign(neighbor.y - current.y);
                    const dist = Math.hypot(neighbor.x - current.x, neighbor.y - current.y);

                    // Turn penalty discourages unnecessary bends
                    const isTurn = (current.dirX !== 0 || current.dirY !== 0) && (current.dirX !== dx || current.dirY !== dy);
                    const turnPenalty = isTurn ? 180 : 0;

                    const tentativeG = (gScore.get(currKey) || 0) + dist + turnPenalty;

                    if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                        cameFrom.set(neighborKey, current);
                        gScore.set(neighborKey, tentativeG);
                        const h = Math.hypot(endPt.x - neighbor.x, endPt.y - neighbor.y);

                        openSet.push({
                            x: neighbor.x,
                            y: neighbor.y,
                            f: tentativeG + h,
                            dirX: dx,
                            dirY: dy
                        });
                    }
                }
            }

            let rawRoute = [];
            if (foundPath && foundPath.length > 0) {
                rawRoute = [A, exA, ...foundPath, exB, B];
            } else {
                rawRoute = manhattanFallback(A, exA, exB, B, portS, portT);
            }

            return cleanup(rawRoute, A, B);
        };

        const reconnectEnd = (wps, movedPt, port, isStart) => {
            if (!port) return wps;
            const isHoriz = port === 'L' || port === 'R';
            const exit = getExitPoint(movedPt, port);
            const idx = isStart ? 0 : wps.length - 1;
            const anchor = wps[idx];

            if (!anchor) return wps;

            const forward = isHoriz
                ? (port === 'R' ? anchor.x >= exit.x : anchor.x <= exit.x)
                : (port === 'B' ? anchor.y >= exit.y : anchor.y <= exit.y);

            if (forward) {
                const next = { ...anchor };
                if (isHoriz) next.y = exit.y; else next.x = exit.x;
                const result = [...wps];
                result[idx] = next;
                return result;
            }

            const corner = isHoriz
                ? { x: exit.x, y: anchor.y }
                : { x: anchor.x, y: exit.y };

            return isStart ? [exit, corner, ...wps] : [...wps, corner, exit];
        };

        const detachChildrenOfMovingEdges = (movingEdgeIds, currentEdges, currentNodes) => {
            if (!movingEdgeIds || movingEdgeIds.length === 0) return currentEdges;
            const movingSet = new Set(movingEdgeIds);
            return currentEdges.map(e => {
                let next = e;
                if (next.targetType === 'edgeAnchor' && movingSet.has(next.anchorEdgeId)) {
                    const host = currentEdges.find(h => h.id === next.anchorEdgeId);
                    const freePt = host ? buildAnchorCoord(host, next.anchorT, currentEdges, currentNodes) : getEndCoord(next, currentEdges, currentNodes);
                    next = {
                        ...next,
                        targetType: 'point',
                        targetPoint: freePt || { x: 0, y: 0 },
                        anchorEdgeId: null,
                        anchorT: null
                    };
                }
                if (next.sourceType === 'edgeAnchor' && movingSet.has(next.sourceAnchorEdgeId)) {
                    const host = currentEdges.find(h => h.id === next.sourceAnchorEdgeId);
                    const freePt = host ? buildAnchorCoord(host, next.sourceAnchorT, currentEdges, currentNodes) : getStartCoord(next, currentEdges, currentNodes);
                    next = {
                        ...next,
                        sourceType: 'point',
                        sourcePoint: freePt || { x: 0, y: 0 },
                        sourceAnchorEdgeId: null,
                        sourceAnchorT: null
                    };
                }
                return next;
            });
        };

        const reconnectEdgeEnd = (edge, movedNodeId, newNodes, edgesList = edges) => {
            const A = getStartCoord(edge, edgesList, newNodes);
            const B = getEndCoord(edge, edgesList, newNodes);

            let srcMoved = (edge.sourceType === 'node' || !edge.sourceType) && edge.source === movedNodeId;
            if (edge.sourceType === 'edgeAnchor') srcMoved = true;
            let tgtMoved = false;
            if (edge.targetType === 'node' || !edge.targetType) {
                tgtMoved = edge.target === movedNodeId;
            } else if (edge.targetType === 'edgeAnchor') {
                tgtMoved = true;
            }

            if (!srcMoved && !tgtMoved) return edge;

            const straight = straightLineWaypoints(A, B, edge.portS, edge.portT);
            if (straight !== null && isPathClear([A, B], [edge.source, edge.target]) === null) {
                return { ...edge, waypoints: straight };
            }

            if (!edge.waypoints || edge.waypoints.length === 0 || edge.autoRoute) {
                return {
                    ...edge,
                    waypoints: smartRoute(A, B, edge.portS, edge.portT, edge.source, edge.target)
                };
            }

            let wps = edge.waypoints.map(wp => ({ ...wp }));
            if (srcMoved && edge.portS) wps = reconnectEnd(wps, A, edge.portS, true);
            if (tgtMoved && edge.portT) wps = reconnectEnd(wps, B, edge.portT, false);

            wps = cleanup(wps, A, B);

            return { ...edge, waypoints: wps };
        };

        return {
            getPortCoord,
            getStartCoord,
            getEndCoord,
            buildFullLine,
            buildAnchorCoord,
            getFullLine,
            getAnchorPointInfo,
            checkLineRectIntersect,
            isPathClear,
            findEdgeSnapPoint,
            getExitPoint,
            smartRoute,
            cleanup,
            reconnectEnd,
            straightLineWaypoints,
            detachChildrenOfMovingEdges,
            reconnectEdgeEnd,
        };
    }, [nodes, edges, BOX_W, BOX_H, EXIT, SNAP_RADIUS, snap]);
}