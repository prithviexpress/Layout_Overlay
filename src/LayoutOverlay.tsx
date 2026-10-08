import React, { ReactElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Big from "big.js";
import { ObjectItem } from "mendix";
import { LayoutOverlayContainerProps } from "../typings/LayoutOverlayProps";
import { Shape, SHAPE_NAMES, parseShape, shapeAspect, shapeWidthFactor } from "./components/shapes";
import { parseBool, parseFilled, parseOccupancy, parseOrientation, positiveNum } from "./components/orient";
import { Icon, IconKind } from "./components/icons";
import "./ui/LayoutOverlay.css";

interface Pos {
    x: number;
    y: number;
}

interface DragState {
    ids: string[];
    start: Record<string, Pos>;
    p0: Pos;
    c0: Pos;
    dx: number;
    dy: number;
    moved: boolean;
    toggled: boolean;
    anchorId: string;
}

interface Move {
    item: ObjectItem;
    x: number;
    y: number;
}

interface QueuedMove extends Move {
    mode: "direct" | "fallback";
}

interface MarqueeState {
    fx0: number;
    fy0: number;
    fx1: number;
    fy1: number;
    cx0: number;
    cy0: number;
    additive: boolean;
}

const SHAPE_FROM_ENUM: Record<string, string> = { thumbsUp: "thumbs-up", thumbsDown: "thumbs-down" };
const num = (v: Big | undefined | null, fallback = 0): number => (v ? Number(v.toString()) : fallback);
const DRAG_THRESHOLD_PX = 3;
const nowMs = (): number => Date.now();

export function LayoutOverlay(props: LayoutOverlayContainerProps): ReactElement {
    const {
        markers,
        xAttr,
        yAttr,
        shapeAttr,
        colorAttr,
        sizeAttr,
        rotationAttr,
        orientationAttr,
        mirrorAttr,
        scaleAttr,
        scaleXAttr,
        scaleYAttr,
        fillAttr,
        occupancyAttr,
        occupiedStyle,
        defaultFill,
        labelAttr,
        pulseAttr,
        tooltipAttr,
        backgroundImage,
        backgroundUrl,
        coordMode,
        canvasWidth,
        canvasHeight,
        defaultSize,
        labelOrientation,
        labelWidth,
        labelSide,
        labelText,
        labelFontSize,
        outlineFill,
        outlineWidth,
        defaultShape,
        shapeExpr,
        sizeExpr,
        defaultColor,
        labelMinZoom,
        showGrid,
        snapSize,
        allowEditing,
        canEditExpr,
        labelFontFamily,
        startInEditMode,
        newXAttr,
        movedXAttr,
        integerCoords,
        allowZoom,
        zoomWheel,
        clickWhileEditing,
        minZoom,
        maxZoom,
        initialZoom,
        markerScaling,
        viewportHeight,
        hoverTitle,
        hoverLines,
        hoverDelay,
        legendItems,
        titleText,
        titleExpr,
        titleLabel,
        titleAlign,
        movedYAttr,
        newYAttr,
        onMarkerClick,
        onMarkerDoubleClick,
        onMarkerContextMenu,
        onMarkerChange,
        onCanvasClick
    } = props;

    const canvasRef = useRef<HTMLDivElement>(null);
    // Edit is offered only when allowed in the widget AND, if an expression is set, when it evaluates to true for this user.
    const canEdit = allowEditing && (canEditExpr ? canEditExpr.value === true : true);
    const [editMode, setEditMode] = useState(startInEditMode);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [drag, setDrag] = useState<DragState | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const [marquee, setMarquee] = useState<MarqueeState | null>(null);
    const marqueeRef = useRef<MarqueeState | null>(null);
    const [override, setOverride] = useState<Record<string, Pos & { t: number }>>({});
    const [, setTick] = useState(0);
    const queueRef = useRef<QueuedMove[]>([]);
    const inFlightRef = useRef<{ item: ObjectItem; seen: boolean; t: number } | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [lastEvent, setLastEvent] = useState<string | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const zMin = Math.max(10, minZoom) / 100;
    const zMax = Math.max(zMin, maxZoom / 100);
    const [zoom, setZoomState] = useState(() => Math.min(zMax, Math.max(zMin, (initialZoom || 100) / 100)));
    const zoomRef = useRef(zoom);
    const anchorRef = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null);
    const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
    const [panning, setPanning] = useState(false);
    const markerScale = markerScaling === "fixed" ? 1 : markerScaling === "proportional" ? zoom : Math.sqrt(zoom);

    // Zoom keeping the point (px, py) of the viewport fixed.
    const zoomTo = useCallback(
        (next: number, px?: number, py?: number, reset = false) => {
            const vp = viewportRef.current;
            const cv = canvasRef.current;
            // Fit actions may go below the configured minimum so the whole plan always fits.
            const z = Math.min(zMax, Math.max(reset ? 0.05 : zMin, next));
            if (!vp || !cv) {
                return;
            }
            if (z === zoomRef.current) {
                if (reset) {
                    vp.scrollLeft = 0;
                    vp.scrollTop = 0;
                }
                return;
            }
            const ax = px ?? vp.clientWidth / 2;
            const ay = py ?? vp.clientHeight / 2;
            anchorRef.current = reset
                ? { fx: 0, fy: 0, px: 0, py: 0 }
                : {
                      fx: (vp.scrollLeft + ax) / cv.offsetWidth,
                      fy: (vp.scrollTop + ay) / cv.offsetHeight,
                      px: ax,
                      py: ay
                  };
            zoomRef.current = z;
            setZoomState(z);
        },
        [zMin, zMax]
    );

    const fitWidth = (): void => zoomTo(1, 0, 0, true);

    const fitPage = (): void => {
        const vp = viewportRef.current;
        if (!vp) {
            return;
        }
        const cap = (viewportHeight > 0 ? viewportHeight : window.innerHeight * 0.8) - 4;
        const widthAtFit = vp.clientWidth;
        const zFit = (cap * canvasWidth) / (Math.max(1, widthAtFit) * canvasHeight);
        zoomTo(Math.min(1, zFit), 0, 0, true);
    };

    useLayoutEffect(() => {
        const a = anchorRef.current;
        const vp = viewportRef.current;
        const cv = canvasRef.current;
        if (a && vp && cv) {
            vp.scrollLeft = a.fx * cv.offsetWidth - a.px;
            vp.scrollTop = a.fy * cv.offsetHeight - a.py;
        }
        anchorRef.current = null;
    }, [zoom]);

    // The viewport only exists once the data source has loaded, so re-attach when that changes.
    // Title sources, in order: expression, text template, plain text (none depends on the user's language except the template).
    const titleValue = (titleExpr?.value || titleText?.value || titleLabel || "").trim();
    const wheelZoom = zoomWheel === "wheel";
    const loading = markers.status === "loading" && (markers.items ?? []).length === 0;

    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp || !allowZoom) {
            return undefined;
        }
        const onWheel = (e: WheelEvent): void => {
            const pinchOrCtrl = e.ctrlKey || e.metaKey;
            const zooms = wheelZoom ? pinchOrCtrl || !e.shiftKey : pinchOrCtrl;
            if (!zooms) {
                return;
            }
            e.preventDefault();
            const rect = vp.getBoundingClientRect();
            const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
            zoomTo(zoomRef.current * Math.exp(-dy * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
        };
        vp.addEventListener("wheel", onWheel, { passive: false });
        return () => vp.removeEventListener("wheel", onWheel);
    }, [allowZoom, wheelZoom, zoomTo, loading]);

    const rootRef = useRef<HTMLDivElement>(null);
    const hoverTimer = useRef<number | undefined>(undefined);
    const [hover, setHover] = useState<{ id: string; left: number; top: number; below: boolean } | null>(null);

    const showHover = (e: React.SyntheticEvent, id: string): void => {
        const el = e.currentTarget as HTMLElement;
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => {
            const root = rootRef.current?.getBoundingClientRect();
            if (!root) {
                return;
            }
            const r = el.getBoundingClientRect();
            const below = r.top - root.top < 90;
            setHover({
                id,
                left: Math.min(Math.max(r.left - root.left + r.width / 2, 90), Math.max(90, root.width - 90)),
                top: below ? r.bottom - root.top + 8 : r.top - root.top - 8,
                below
            });
        }, Math.max(0, hoverDelay));
    };
    const hideHover = (): void => {
        window.clearTimeout(hoverTimer.current);
        setHover(null);
    };

    const editing = canEdit && editMode;
    const w = Math.max(1, canvasWidth);
    const h = Math.max(1, canvasHeight);
    const maxX = coordMode === "percent" ? 100 : w;
    const maxY = coordMode === "percent" ? 100 : h;

    const bgUrl = backgroundUrl?.value || backgroundImage?.value?.uri;

    const items = markers.items ?? [];
    const hoverItem = drag?.moved || !hover ? undefined : items.find(i => i.id === hover.id);
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const single = selectedItems.length === 1 ? selectedItems[0] : undefined;

    const clamp = (v: number, max: number): number => Math.min(max, Math.max(0, v));
    const round = (n: number): number => (integerCoords ? Math.round(n) : Math.round(n * 100) / 100);
    const snap = (v: number): number => (snapSize > 0 ? Math.round(v / snapSize) * snapSize : v);

    const run = (action: { canExecute: boolean; execute: () => void } | undefined): void => {
        if (action?.canExecute) {
            action.execute();
        }
    };

    // Last saved (or optimistically saved) position, ignoring any drag in progress.
    const basePos = (item: ObjectItem): Pos => {
        const o = override[item.id];
        if (o) {
            return { x: o.x, y: o.y };
        }
        return { x: num(xAttr.get(item).value), y: num(yAttr.get(item).value) };
    };

    // Position currently shown for a marker: live drag > optimistic override > data.
    const displayPos = (item: ObjectItem): Pos => {
        const s = drag?.moved ? drag.start[item.id] : undefined;
        if (drag && s) {
            return {
                x: clamp(round(snap(s.x + drag.dx)), maxX),
                y: clamp(round(snap(s.y + drag.dy)), maxY)
            };
        }
        return basePos(item);
    };

    // Saves run one marker at a time so the microflow never sees overlapping calls.
    const processQueue = (): void => {
        const f = inFlightRef.current;
        if (f) {
            const act = onMarkerChange?.get(f.item);
            if (act?.isExecuting) {
                f.seen = true;
                return;
            }
            if (!f.seen && nowMs() - f.t < 500) {
                return;
            }
            inFlightRef.current = null;
        }
        while (queueRef.current.length > 0) {
            const m = queueRef.current.shift()!;
            const x = round(m.x);
            const y = round(m.y);
            if (m.mode === "direct") {
                xAttr.get(m.item).setValue(new Big(x));
                yAttr.get(m.item).setValue(new Big(y));
            } else {
                movedXAttr?.setValue(new Big(x));
                movedYAttr?.setValue(new Big(y));
            }
            const act = onMarkerChange?.get(m.item);
            if (act?.canExecute) {
                act.execute();
                inFlightRef.current = { item: m.item, seen: false, t: nowMs() };
                window.setTimeout(() => setTick(t => t + 1), 550);
                return;
            }
        }
    };

    useEffect(() => {
        processQueue();
    });

    // Drop optimistic positions once the data catches up, or after a grace period.
    useEffect(() => {
        const ids = Object.keys(override);
        if (ids.length === 0) {
            return undefined;
        }
        const busy = queueRef.current.length > 0 || inFlightRef.current !== null;
        const next = { ...override };
        let changed = false;
        ids.forEach(id => {
            const item = items.find(i => i.id === id);
            const o = override[id];
            const matches = item && num(xAttr.get(item).value) === o.x && num(yAttr.get(item).value) === o.y;
            if (!item || matches || (!busy && nowMs() - o.t > 4000)) {
                delete next[id];
                changed = true;
            }
        });
        if (changed) {
            setOverride(next);
            return undefined;
        }
        const timer = window.setTimeout(() => setTick(t => t + 1), 1000);
        return () => window.clearTimeout(timer);
    });

    const commitMoves = (moves: Move[]): void => {
        const changed = moves.filter(m => {
            const p = basePos(m.item);
            return round(m.x) !== p.x || round(m.y) !== p.y;
        });
        if (changed.length === 0) {
            return;
        }
        const queued: QueuedMove[] = changed.map(m => ({
            ...m,
            mode: xAttr.get(m.item).readOnly || yAttr.get(m.item).readOnly ? "fallback" : "direct"
        }));
        if (queued.some(m => m.mode === "fallback")) {
            const problems: string[] = [];
            if (!movedXAttr || !movedYAttr) {
                problems.push("Moved X / Moved Y are not configured (Editing tab)");
            } else if (movedXAttr.readOnly || movedYAttr.readOnly) {
                problems.push(
                    "Moved X / Moved Y are read-only or have no object (is the widget inside the data view of that entity, and has it loaded?)"
                );
            }
            if (!onMarkerChange) {
                problems.push('"On marker moved / changed" is not configured (Events tab)');
            } else if (!onMarkerChange.get(queued[0].item).canExecute) {
                problems.push(
                    '"On marker moved / changed" cannot execute (microflow parameters such as the context object are not available to the widget)'
                );
            }
            if (problems.length > 0) {
                // eslint-disable-next-line no-console
                console.warn("[LayoutOverlay] move not saved:", problems);
                setWarning(`X/Y are read-only and the fallback is not usable: ${problems.join("; ")}.`);
                setLastEvent(`${queued.length} marker(s) moved → NOT saved`);
                return;
            }
        }
        setWarning(null);
        setLastEvent(
            queued.length === 1
                ? `Moved to (${round(queued[0].x)}, ${round(queued[0].y)}) → saving`
                : `${queued.length} markers moved → saving one by one`
        );
        const now = nowMs();
        setOverride(prev => {
            const next = { ...prev };
            queued.forEach(m => {
                next[m.item.id] = { x: round(m.x), y: round(m.y), t: now };
            });
            return next;
        });
        queueRef.current.push(...queued);
        processQueue();
    };

    const clientToCoords = (clientX: number, clientY: number, snapped: boolean): Pos | null => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            return null;
        }
        const x = ((clientX - rect.left) / rect.width) * maxX;
        const y = ((clientY - rect.top) / rect.height) * maxY;
        return snapped ? { x: clamp(snap(x), maxX), y: clamp(snap(y), maxY) } : { x, y };
    };

    const toggleSelect = (id: string): void =>
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));

    const onMarkerPointerDown = (e: React.PointerEvent, item: ObjectItem): void => {
        e.stopPropagation();
        const additive = e.shiftKey || e.ctrlKey || e.metaKey;
        if (!editing) {
            setSelectedIds([item.id]);
            return;
        }
        let ids = selectedIds;
        if (additive) {
            toggleSelect(item.id);
            ids = selectedIds.includes(item.id) ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id];
        } else if (!selectedIds.includes(item.id)) {
            ids = [item.id];
            setSelectedIds(ids);
        }
        const p0 = clientToCoords(e.clientX, e.clientY, false);
        if (!p0 || !ids.includes(item.id)) {
            return;
        }
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const start: Record<string, Pos> = {};
        items.filter(i => ids.includes(i.id)).forEach(i => (start[i.id] = displayPos(i)));
        dragRef.current = {
            ids,
            start,
            p0,
            c0: { x: e.clientX, y: e.clientY },
            dx: 0,
            dy: 0,
            moved: false,
            toggled: additive,
            anchorId: item.id
        };
        setDrag(dragRef.current);
    };

    const onMarkerPointerMove = (e: React.PointerEvent): void => {
        const d = dragRef.current;
        if (!d) {
            return;
        }
        const far = Math.hypot(e.clientX - d.c0.x, e.clientY - d.c0.y) > DRAG_THRESHOLD_PX;
        if (!d.moved && !far) {
            return;
        }
        const p = clientToCoords(e.clientX, e.clientY, false);
        if (p) {
            dragRef.current = { ...d, dx: p.x - d.p0.x, dy: p.y - d.p0.y, moved: true };
            setDrag(dragRef.current);
        }
    };

    const onMarkerPointerUp = (e: React.PointerEvent, item: ObjectItem): void => {
        e.stopPropagation();
        const d = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (d?.moved) {
            commitMoves(
                items
                    .filter(i => d.ids.includes(i.id))
                    .map(i => {
                        const s = d.start[i.id];
                        return { item: i, x: clamp(snap(s.x + d.dx), maxX), y: clamp(snap(s.y + d.dy), maxY) };
                    })
            );
        } else if (!d?.toggled) {
            if (editing) {
                setSelectedIds([item.id]);
            }
            if (!editing || clickWhileEditing) {
                run(onMarkerClick?.get(item));
            }
        }
    };

    const nudgeStep = (): number => snapSize || (coordMode === "percent" && !integerCoords ? 0.5 : 1);

    const onMarkerKeyDown = (e: React.KeyboardEvent, item: ObjectItem): void => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedIds([item.id]);
            if (!editing || clickWhileEditing) {
                run(onMarkerClick?.get(item));
            }
            return;
        }
        if (e.key === "Escape") {
            setSelectedIds([]);
            return;
        }
        if (editing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
            e.preventDefault();
            setSelectedIds(items.map(i => i.id));
            return;
        }
        const step = (e.shiftKey ? 10 : 1) * nudgeStep();
        const delta: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step]
        };
        const dxy = delta[e.key];
        if (editing && dxy) {
            e.preventDefault();
            const group = selectedIds.includes(item.id) ? selectedItems : [item];
            commitMoves(
                group.map(i => {
                    const p = displayPos(i);
                    return { item: i, x: clamp(p.x + dxy[0], maxX), y: clamp(p.y + dxy[1], maxY) };
                })
            );
        }
    };

    const onCanvasPointerMove = (e: React.PointerEvent): void => {
        const pan = panRef.current;
        const vp = viewportRef.current;
        if (pan && vp) {
            vp.scrollLeft = pan.sl - (e.clientX - pan.x);
            vp.scrollTop = pan.st - (e.clientY - pan.y);
        }
        const m = marqueeRef.current;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (m && rect) {
            marqueeRef.current = {
                ...m,
                fx1: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
                fy1: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
            };
            setMarquee(marqueeRef.current);
        }
    };

    const onCanvasPointerUp = (e: React.PointerEvent): void => {
        panRef.current = null;
        setPanning(false);
        const m = marqueeRef.current;
        marqueeRef.current = null;
        setMarquee(null);
        if (!m) {
            return;
        }
        const far = Math.hypot(e.clientX - m.cx0, e.clientY - m.cy0) > 4;
        if (far) {
            const xa = Math.min(m.fx0, m.fx1) * maxX;
            const xb = Math.max(m.fx0, m.fx1) * maxX;
            const ya = Math.min(m.fy0, m.fy1) * maxY;
            const yb = Math.max(m.fy0, m.fy1) * maxY;
            const hit = items
                .filter(i => {
                    const p = displayPos(i);
                    return p.x >= xa && p.x <= xb && p.y >= ya && p.y <= yb;
                })
                .map(i => i.id);
            setSelectedIds(prev => (m.additive ? Array.from(new Set([...prev, ...hit])) : hit));
            return;
        }
        // A plain click on empty space: add-marker event with the clicked coordinates.
        if (!m.additive) {
            setSelectedIds([]);
        }
        const p = clientToCoords(e.clientX, e.clientY, true);
        if (!p) {
            return;
        }
        if (newXAttr && !newXAttr.readOnly) {
            newXAttr.setValue(new Big(round(p.x)));
        }
        if (newYAttr && !newYAttr.readOnly) {
            newYAttr.setValue(new Big(round(p.y)));
        }
        run(onCanvasClick);
    };

    const onCanvasPointerDown = (e: React.PointerEvent): void => {
        if (e.target !== e.currentTarget) {
            return;
        }
        const vpEl = viewportRef.current;
        if (e.button === 1 && vpEl) {
            // Middle mouse button pans in any mode.
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            panRef.current = { x: e.clientX, y: e.clientY, sl: vpEl.scrollLeft, st: vpEl.scrollTop };
            setPanning(true);
            return;
        }
        if (e.button !== 0) {
            return;
        }
        if (!editing) {
            setSelectedIds([]);
            const vp = viewportRef.current;
            if (allowZoom && vp && (vp.scrollWidth > vp.clientWidth || vp.scrollHeight > vp.clientHeight)) {
                e.currentTarget.setPointerCapture(e.pointerId);
                panRef.current = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
                setPanning(true);
            }
            return;
        }
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        const fx = (e.clientX - rect.left) / rect.width;
        const fy = (e.clientY - rect.top) / rect.height;
        marqueeRef.current = {
            fx0: fx,
            fy0: fy,
            fx1: fx,
            fy1: fy,
            cx0: e.clientX,
            cy0: e.clientY,
            additive: e.shiftKey || e.ctrlKey || e.metaKey
        };
        setMarquee(marqueeRef.current);
    };

    const align = (kind: IconKind): void => {
        if (selectedItems.length < 2) {
            return;
        }
        const pos = selectedItems.map(i => ({ item: i, ...displayPos(i) }));
        const xs = pos.map(p => p.x);
        const ys = pos.map(p => p.y);
        const minX = Math.min(...xs);
        const maxXv = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxYv = Math.max(...ys);
        let moves: Move[];
        switch (kind) {
            case "left":
                moves = pos.map(p => ({ item: p.item, x: minX, y: p.y }));
                break;
            case "centerX":
                moves = pos.map(p => ({ item: p.item, x: (minX + maxXv) / 2, y: p.y }));
                break;
            case "right":
                moves = pos.map(p => ({ item: p.item, x: maxXv, y: p.y }));
                break;
            case "top":
                moves = pos.map(p => ({ item: p.item, x: p.x, y: minY }));
                break;
            case "middle":
                moves = pos.map(p => ({ item: p.item, x: p.x, y: (minY + maxYv) / 2 }));
                break;
            case "bottom":
                moves = pos.map(p => ({ item: p.item, x: p.x, y: maxYv }));
                break;
            case "distH": {
                const sorted = [...pos].sort((a, b) => a.x - b.x);
                moves = sorted.map((p, i) => ({
                    item: p.item,
                    x: minX + ((maxXv - minX) * i) / (sorted.length - 1),
                    y: p.y
                }));
                break;
            }
            default: {
                const sorted = [...pos].sort((a, b) => a.y - b.y);
                moves = sorted.map((p, i) => ({
                    item: p.item,
                    x: p.x,
                    y: minY + ((maxYv - minY) * i) / (sorted.length - 1)
                }));
            }
        }
        commitMoves(moves);
    };

    const setAttr = <T,>(
        attr: { get: (i: ObjectItem) => { readOnly: boolean; setValue: (v: T) => void } } | undefined,
        item: ObjectItem,
        v: T
    ): void => {
        const a = attr?.get(item);
        if (a && !a.readOnly) {
            a.setValue(v);
            run(onMarkerChange?.get(item));
        }
    };

    if (loading) {
        return <div className={`layout-overlay ${props.class}`}>Loading…</div>;
    }

    const alignBtn = (kind: IconKind, title: string, min = 2): ReactElement => (
        <button
            type="button"
            className="layout-overlay__icon-btn"
            title={title}
            aria-label={title}
            disabled={selectedItems.length < min}
            onClick={() => align(kind)}
        >
            <Icon kind={kind} />
        </button>
    );

    return (
        <div ref={rootRef} className={`layout-overlay ${props.class}`} style={props.style}>
            {(canEdit || allowZoom || !!titleValue || legendItems.length > 0) && (
                <div className={`layout-overlay__toolbar layout-overlay__toolbar--title-${titleAlign}`}>
                    {titleValue && <span className="layout-overlay__title">{titleValue}</span>}
                    {canEdit && (
                        <button
                            type="button"
                            className={`layout-overlay__btn ${editMode ? "layout-overlay__btn--on" : ""}`}
                            onClick={() => {
                                setEditMode(m => !m);
                                setSelectedIds([]);
                            }}
                        >
                            {editMode ? "Editing" : "Edit"}
                        </button>
                    )}
                    {allowZoom && (
                        <span className="layout-overlay__group">
                            <button
                                type="button"
                                className="layout-overlay__icon-btn"
                                title="Zoom out"
                                onClick={() => zoomTo(zoomRef.current / 1.25)}
                            >
                                −
                            </button>
                            <span className="layout-overlay__zoom-label">{Math.round(zoom * 100)}%</span>
                            <button
                                type="button"
                                className="layout-overlay__icon-btn"
                                title="Zoom in"
                                onClick={() => zoomTo(zoomRef.current * 1.25)}
                            >
                                +
                            </button>
                            <button
                                type="button"
                                className="layout-overlay__btn layout-overlay__btn--flat"
                                title="Fit width: the plan fills the widget width (scroll vertically if taller)"
                                onClick={fitWidth}
                            >
                                Fit width
                            </button>
                            <button
                                type="button"
                                className="layout-overlay__btn layout-overlay__btn--flat"
                                title="Fit page: the whole plan is visible at once, no scrolling"
                                onClick={fitPage}
                            >
                                Fit page
                            </button>
                        </span>
                    )}
                    {editing && (
                        <span className="layout-overlay__group" role="group" aria-label="Align selected markers">
                            {alignBtn("left", "Align left edges (same X)")}
                            {alignBtn("centerX", "Align horizontal centers (same X)")}
                            {alignBtn("right", "Align right edges (same X)")}
                            <span className="layout-overlay__sep" />
                            {alignBtn("top", "Align tops (same Y, in a row)")}
                            {alignBtn("middle", "Align vertical middles (same Y, in a row)")}
                            {alignBtn("bottom", "Align bottoms (same Y, in a row)")}
                            <span className="layout-overlay__sep" />
                            {alignBtn("distH", "Distribute horizontally", 3)}
                            {alignBtn("distV", "Distribute vertically", 3)}
                        </span>
                    )}
                    {legendItems.length > 0 && (
                        <div className="layout-overlay__legend">
                            {legendItems.slice(0, 6).map((l, i) => (
                                <span key={i} className="layout-overlay__legend-item">
                                    <Shape
                                        shape={parseShape(l.legendShape)}
                                        color={l.legendColor}
                                        size={l.legendShape.toLowerCase().startsWith("truck") ? 40 : 14}
                                        rotation={0}
                                        filled={l.legendFilled}
                                        dotted={l.legendDotted}
                                        lineWidth={Math.max(1.5, Math.min(outlineWidth, 2.5))}
                                        outlineTint={outlineFill / 100}
                                    />
                                    {l.legendCaption}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {editing && (
                <div className="layout-overlay__status">
                    <span className="layout-overlay__hint">
                        {selectedItems.length > 0
                            ? `${selectedItems.length} selected`
                            : "Drag to move · drag empty space to box-select · Shift+click to add · middle button pans"}
                    </span>
                    {lastEvent && <span className="layout-overlay__last">{lastEvent}</span>}
                </div>
            )}
            {warning && (
                <div className="layout-overlay__warning" role="alert">
                    {warning}
                </div>
            )}
            <div
                ref={viewportRef}
                className="layout-overlay__viewport"
                style={{ maxHeight: viewportHeight > 0 ? viewportHeight : "80vh" }}
                onScroll={hideHover}
            >
                <div
                    ref={canvasRef}
                    className={`layout-overlay__canvas ${editing ? "layout-overlay__canvas--edit" : ""} ${
                        panning ? "layout-overlay__canvas--pan" : ""
                    }`}
                    style={{
                        width: `${zoom * 100}%`,
                        marginInline: "auto",
                        aspectRatio: `${w} / ${h}`,
                        backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined
                    }}
                    onPointerDown={onCanvasPointerDown}
                    onPointerMove={onCanvasPointerMove}
                    onPointerUp={onCanvasPointerUp}
                    onPointerCancel={onCanvasPointerUp}
                >
                    {showGrid && (
                        <div
                            className="layout-overlay__grid"
                            style={{
                                backgroundSize: `${snapSize > 0 ? (snapSize / maxX) * 100 : 10}% ${
                                    snapSize > 0 ? (snapSize / maxY) * 100 : (10 * w) / h
                                }%`
                            }}
                        />
                    )}
                    {items.map(item => {
                        const isDrag = !!drag?.moved && drag.ids.includes(item.id);
                        const { x, y } = displayPos(item);
                        // Precedence: attribute, then expression, then the value typed in Studio Pro.
                        const attrSize = num(sizeAttr?.get(item).value);
                        const exprSize = num(sizeExpr?.get(item).value);
                        const size =
                            (attrSize > 0 ? attrSize : exprSize > 0 ? exprSize : defaultSize || 28) * markerScale;
                        const shapeDef = parseShape(
                            shapeAttr?.get(item).value ||
                                shapeExpr?.get(item).value ||
                                SHAPE_FROM_ENUM[defaultShape] ||
                                defaultShape
                        );
                        // Occupancy wins over Fill: occupied = solid line, not occupied = dotted line.
                        const occupancy = occupancyAttr ? parseOccupancy(occupancyAttr.get(item).value) : undefined;
                        const filled =
                            occupancy === undefined
                                ? parseFilled(fillAttr?.get(item).value, defaultFill === "filled")
                                : occupancy && occupiedStyle === "filled";
                        const dotted = occupancy === false;
                        const angle =
                            parseOrientation(orientationAttr?.get(item).value) + num(rotationAttr?.get(item).value);
                        const uniform = positiveNum(scaleAttr?.get(item).value);
                        const scaleX = uniform * positiveNum(scaleXAttr?.get(item).value);
                        const scaleY = uniform * positiveNum(scaleYAttr?.get(item).value);
                        const mirror = parseBool(mirrorAttr?.get(item).value);
                        const baseW = size * shapeWidthFactor(shapeDef);
                        const boxW = baseW * scaleX;
                        const boxH = baseW * shapeAspect(shapeDef) * scaleY;
                        const rad = (angle * Math.PI) / 180;
                        // Half the rotated extent, so the label clears a rotated icon.
                        const labelOffset = (Math.abs(boxW * Math.sin(rad)) + Math.abs(boxH * Math.cos(rad))) / 2 + 3;
                        // Labels scale with the icons, within a readable range.
                        const baseLabelFont = Math.max(8, labelFontSize || 12);
                        const labelFont = baseLabelFont * Math.min(3, Math.max(0.75, markerScale));
                        const fontFamily = labelFontFamily || undefined;
                        const labelStyle: React.CSSProperties = {
                            top: `calc(50% + ${labelOffset + (labelFont - 11) * 0.6}px)`,
                            fontSize: labelFont,
                            fontFamily
                        };
                        // Trucks: the label sits on the truck's axis, behind the rear (default) or in front of the
                        // cabin, running away from the truck (never beside it) and turned to stay readable.
                        const rearLabel = labelOrientation === "follow" && shapeDef.kind === "truck";
                        let rearStyle: { anchor: React.CSSProperties; text: React.CSSProperties } | undefined;
                        if (rearLabel) {
                            const matchWidth = labelWidth === "match" && labelText !== "horizontal";
                            // Same width as the truck, but never thinner than the text needs; even px keeps text crisp.
                            const thickness = Math.ceil(Math.max(10, boxH, labelFont * 1.5) / 2) * 2;
                            const dist = boxW / 2 + 4;
                            // Side of the truck the label sits on: behind the rear, or in front of the cabin.
                            const away = labelSide === "cabin" ? angle : angle + 180;
                            const awayRad = (away * Math.PI) / 180;
                            const ux = Math.cos(awayRad);
                            const uy = Math.sin(awayRad);
                            // Whole pixels only: fractional positions make small text look blurry.
                            const anchorAt = {
                                left: `calc(50% + ${Math.round(ux * dist)}px)`,
                                top: `calc(50% + ${Math.round(uy * dist)}px)`
                            };
                            if (labelText === "horizontal") {
                                // Horizontal text: the bubble's near edge touches the truck's end, on its axis.
                                rearStyle = {
                                    anchor: anchorAt,
                                    text: {
                                        left: 0,
                                        top: 0,
                                        fontSize: labelFont,
                                        fontFamily,
                                        transform: `translate(${-50 + ux * 50}%, ${-50 + uy * 50}%)`
                                    }
                                };
                            } else {
                                let textAngle = ((away % 360) + 360) % 360;
                                let endAnchored = false;
                                if (textAngle > 90 && textAngle <= 270) {
                                    // Flip so the text is never upside down; its end then touches the truck.
                                    textAngle -= 180;
                                    endAnchored = true;
                                }
                                const near = (v: number): boolean => Math.abs(textAngle - v) < 0.01;
                                if (near(0) || near(90)) {
                                    // Exactly horizontal or vertical: no rotation transform, so text stays crisp
                                    // (vertical uses the browser's native vertical writing mode).
                                    const vertical = near(90);
                                    rearStyle = {
                                        anchor: anchorAt,
                                        text: {
                                            left: 0,
                                            top: 0,
                                            fontSize: labelFont,
                                            fontFamily,
                                            ...(vertical ? { writingMode: "vertical-rl" as const } : {}),
                                            transform: vertical
                                                ? `translate(-50%, ${endAnchored ? "-100%" : "0"})`
                                                : `translate(${endAnchored ? "-100%" : "0"}, -50%)`,
                                            ...(matchWidth
                                                ? vertical
                                                    ? {
                                                          boxSizing: "border-box" as const,
                                                          width: thickness,
                                                          lineHeight: `${thickness - 2}px`,
                                                          padding: "0.6em 0"
                                                      }
                                                    : {
                                                          boxSizing: "border-box" as const,
                                                          height: thickness,
                                                          lineHeight: `${thickness - 2}px`,
                                                          padding: "0 0.6em"
                                                      }
                                                : {})
                                        }
                                    };
                                } else {
                                    rearStyle = {
                                        anchor: { ...anchorAt, transform: `rotate(${textAngle}deg)` },
                                        text: {
                                            left: 0,
                                            top: 0,
                                            fontSize: labelFont,
                                            fontFamily,
                                            transform: `translate(${endAnchored ? "-100%" : "0"}, -50%)`,
                                            ...(matchWidth
                                                ? {
                                                      boxSizing: "border-box" as const,
                                                      height: thickness,
                                                      lineHeight: `${thickness - 2}px`,
                                                      padding: "0 0.6em"
                                                  }
                                                : {})
                                        }
                                    };
                                }
                            }
                        }
                        const lineW = outlineWidth * Math.min(2, Math.max(0.8, markerScale));
                        const color = colorAttr?.get(item).value || defaultColor;
                        const label = labelAttr?.get(item).value;
                        const showLabel = !!label && zoom * 100 >= labelMinZoom;
                        const pulse = pulseAttr?.get(item).value === true;
                        const cls = [
                            "layout-overlay__marker",
                            editing ? "layout-overlay__marker--edit" : "",
                            isDrag ? "layout-overlay__marker--drag" : "",
                            selectedIds.includes(item.id) ? "layout-overlay__marker--selected" : ""
                        ].join(" ");
                        return (
                            <div
                                key={item.id}
                                className={cls}
                                role="button"
                                tabIndex={0}
                                title={
                                    hoverTitle || hoverLines.length > 0
                                        ? undefined
                                        : tooltipAttr?.get(item).value ?? label
                                }
                                style={
                                    {
                                        left: `${(x / maxX) * 100}%`,
                                        top: `${(y / maxY) * 100}%`,
                                        "--lo-color": color
                                    } as React.CSSProperties
                                }
                                onPointerEnter={e => showHover(e, item.id)}
                                onPointerLeave={hideHover}
                                onFocus={e => showHover(e, item.id)}
                                onBlur={hideHover}
                                onPointerDown={e => {
                                    hideHover();
                                    onMarkerPointerDown(e, item);
                                }}
                                onPointerMove={onMarkerPointerMove}
                                onPointerUp={e => onMarkerPointerUp(e, item)}
                                onDoubleClick={() => {
                                    if (!editing || clickWhileEditing) {
                                        run(onMarkerDoubleClick?.get(item));
                                    }
                                }}
                                onContextMenu={e => {
                                    if ((!editing || clickWhileEditing) && onMarkerContextMenu?.get(item).canExecute) {
                                        e.preventDefault();
                                        run(onMarkerContextMenu.get(item));
                                    }
                                }}
                                onKeyDown={e => onMarkerKeyDown(e, item)}
                            >
                                <span className="layout-overlay__shape-wrap" style={{ width: boxW, height: boxH }}>
                                    {pulse && <span className="layout-overlay__pulse" />}
                                    <Shape
                                        shape={shapeDef}
                                        color={color}
                                        size={baseW}
                                        rotation={angle}
                                        filled={filled}
                                        dotted={dotted}
                                        lineWidth={lineW}
                                        outlineTint={outlineFill / 100}
                                        scaleX={scaleX}
                                        scaleY={scaleY}
                                        mirror={mirror}
                                    />
                                </span>
                                {showLabel &&
                                    (rearStyle ? (
                                        <span className="layout-overlay__label-anchor" style={rearStyle.anchor}>
                                            <span
                                                className="layout-overlay__label layout-overlay__label--rear"
                                                style={rearStyle.text}
                                            >
                                                {label}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="layout-overlay__label" style={labelStyle}>
                                            {label}
                                        </span>
                                    ))}
                            </div>
                        );
                    })}
                    {marquee && (
                        <div
                            className="layout-overlay__marquee"
                            style={{
                                left: `${Math.min(marquee.fx0, marquee.fx1) * 100}%`,
                                top: `${Math.min(marquee.fy0, marquee.fy1) * 100}%`,
                                width: `${Math.abs(marquee.fx1 - marquee.fx0) * 100}%`,
                                height: `${Math.abs(marquee.fy1 - marquee.fy0) * 100}%`
                            }}
                        />
                    )}
                </div>
            </div>
            {hover && hoverItem && (
                <div
                    className={`layout-overlay__card ${hover.below ? "layout-overlay__card--below" : ""}`}
                    style={{ left: hover.left, top: hover.top }}
                    role="tooltip"
                >
                    {hoverTitle?.get(hoverItem).value && (
                        <div className="layout-overlay__card-title">{hoverTitle.get(hoverItem).value}</div>
                    )}
                    {hoverLines.map((l, i) => {
                        const text = l.text.get(hoverItem).value;
                        return text ? (
                            <div key={i} className={l.bold ? "layout-overlay__card-bold" : undefined}>
                                {text}
                            </div>
                        ) : null;
                    })}
                </div>
            )}
            {editing && single && (
                <div className="layout-overlay__inspector">
                    {(["x", "y"] as const).map(axis => {
                        const p = displayPos(single);
                        const max = axis === "x" ? maxX : maxY;
                        return (
                            <label key={`${single.id}-${axis}-${p[axis]}`}>
                                {axis.toUpperCase()}{" "}
                                <input
                                    type="number"
                                    step="any"
                                    defaultValue={p[axis]}
                                    onBlur={e => {
                                        const v = clamp(Number(e.target.value) || 0, max);
                                        commitMoves([
                                            { item: single, x: axis === "x" ? v : p.x, y: axis === "y" ? v : p.y }
                                        ]);
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                />
                            </label>
                        );
                    })}
                    {shapeAttr && (
                        <label>
                            Shape{" "}
                            <select
                                value={shapeAttr.get(single).value ?? ""}
                                disabled={shapeAttr.get(single).readOnly}
                                onChange={e => setAttr(shapeAttr, single, e.target.value)}
                            >
                                <option value="">circle</option>
                                {SHAPE_NAMES.map(n => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    {colorAttr && (
                        <label>
                            Color{" "}
                            <input
                                type="color"
                                value={
                                    /^#[0-9a-f]{6}$/i.test(colorAttr.get(single).value ?? "")
                                        ? colorAttr.get(single).value!
                                        : "#d32f2f"
                                }
                                disabled={colorAttr.get(single).readOnly}
                                onChange={e => setAttr(colorAttr, single, e.target.value)}
                            />
                        </label>
                    )}
                    {sizeAttr && (
                        <label>
                            Size{" "}
                            <input
                                type="number"
                                min={8}
                                value={num(sizeAttr.get(single).value, defaultSize)}
                                disabled={sizeAttr.get(single).readOnly}
                                onChange={e =>
                                    setAttr(
                                        sizeAttr,
                                        single,
                                        new Big(Math.max(8, Number(e.target.value) || defaultSize))
                                    )
                                }
                            />
                        </label>
                    )}
                    {rotationAttr && (
                        <label>
                            Angle{" "}
                            <input
                                type="number"
                                step="any"
                                value={num(rotationAttr.get(single).value)}
                                disabled={rotationAttr.get(single).readOnly}
                                onChange={e => setAttr(rotationAttr, single, new Big(Number(e.target.value) || 0))}
                            />
                        </label>
                    )}
                    {scaleAttr && (
                        <label>
                            Scale{" "}
                            <input
                                type="number"
                                step="0.1"
                                min={0.1}
                                value={positiveNum(scaleAttr.get(single).value)}
                                disabled={scaleAttr.get(single).readOnly}
                                onChange={e =>
                                    setAttr(scaleAttr, single, new Big(Math.max(0.1, Number(e.target.value) || 1)))
                                }
                            />
                        </label>
                    )}
                    {labelAttr && (
                        <label>
                            Label{" "}
                            <input
                                type="text"
                                value={labelAttr.get(single).value ?? ""}
                                readOnly={labelAttr.get(single).readOnly}
                                onChange={e => setAttr(labelAttr, single, e.target.value)}
                            />
                        </label>
                    )}
                </div>
            )}
        </div>
    );
}
