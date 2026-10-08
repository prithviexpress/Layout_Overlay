import React, { ReactElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Big from "big.js";
import { ObjectItem } from "mendix";
import { LayoutOverlayContainerProps } from "../typings/LayoutOverlayProps";
import { Shape, SHAPE_NAMES, parseShape } from "./components/shapes";
import "./ui/LayoutOverlay.css";

interface DragState {
    id: string;
    x: number;
    y: number;
    moved: boolean;
}

const num = (v: Big | undefined | null, fallback = 0): number => (v ? Number(v.toString()) : fallback);

export function LayoutOverlay(props: LayoutOverlayContainerProps): ReactElement {
    const {
        markers,
        xAttr,
        yAttr,
        shapeAttr,
        colorAttr,
        sizeAttr,
        rotationAttr,
        labelAttr,
        tooltipAttr,
        backgroundImage,
        backgroundUrl,
        coordMode,
        canvasWidth,
        canvasHeight,
        defaultSize,
        defaultColor,
        showGrid,
        snapSize,
        allowEditing,
        startInEditMode,
        newXAttr,
        movedXAttr,
        integerCoords,
        allowZoom,
        minZoom,
        maxZoom,
        initialZoom,
        markerScaling,
        viewportHeight,
        hoverTitle,
        hoverLines,
        hoverDelay,
        legendItems,
        movedYAttr,
        newYAttr,
        onMarkerClick,
        onMarkerDoubleClick,
        onMarkerContextMenu,
        onMarkerChange,
        onCanvasClick
    } = props;

    const canvasRef = useRef<HTMLDivElement>(null);
    const [editMode, setEditMode] = useState(allowEditing && startInEditMode);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
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
        (next: number, px?: number, py?: number) => {
            const vp = viewportRef.current;
            const cv = canvasRef.current;
            const z = Math.min(zMax, Math.max(zMin, next));
            if (!vp || !cv || z === zoomRef.current) {
                return;
            }
            const ax = px ?? vp.clientWidth / 2;
            const ay = py ?? vp.clientHeight / 2;
            anchorRef.current = {
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

    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp || !allowZoom) {
            return undefined;
        }
        const onWheel = (e: WheelEvent): void => {
            if (!(e.ctrlKey || e.metaKey)) {
                return;
            }
            e.preventDefault();
            const rect = vp.getBoundingClientRect();
            zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
        };
        vp.addEventListener("wheel", onWheel, { passive: false });
        return () => vp.removeEventListener("wheel", onWheel);
    }, [allowZoom, zoomTo]);

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
                top: below ? r.bottom - root.top + 6 : r.top - root.top - 6,
                below
            });
        }, Math.max(0, hoverDelay));
    };
    const hideHover = (): void => {
        window.clearTimeout(hoverTimer.current);
        setHover(null);
    };

    const editing = allowEditing && editMode;
    const w = Math.max(1, canvasWidth);
    const h = Math.max(1, canvasHeight);
    const maxX = coordMode === "percent" ? 100 : w;
    const maxY = coordMode === "percent" ? 100 : h;
    const toFracX = (x: number): number => x / maxX;
    const toFracY = (y: number): number => y / maxY;

    const bgUrl = backgroundUrl?.value || backgroundImage?.value?.uri;

    const items = markers.items ?? [];
    const hoverItem = drag || !hover ? undefined : items.find(i => i.id === hover.id);
    const selected = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId]);

    const clamp = (v: number, max: number): number => Math.min(max, Math.max(0, v));
    const round = (n: number): number => (integerCoords ? Math.round(n) : Math.round(n * 100) / 100);
    const snap = (v: number): number => (snapSize > 0 ? Math.round(v / snapSize) * snapSize : v);

    const run = (action: { canExecute: boolean; execute: () => void } | undefined): void => {
        if (action?.canExecute) {
            action.execute();
        }
    };

    const commitPosition = useCallback(
        (item: ObjectItem, x: number, y: number) => {
            const xv = xAttr.get(item);
            const yv = yAttr.get(item);
            if (xv.readOnly || yv.readOnly) {
                // Fallback: hand the new coordinates to the page context so a microflow can save them.
                const mx = movedXAttr;
                const my = movedYAttr;
                if (mx && my && !mx.readOnly && !my.readOnly && onMarkerChange?.get(item).canExecute) {
                    mx.setValue(new Big(round(x)));
                    my.setValue(new Big(round(y)));
                    setWarning(null);
                    run(onMarkerChange.get(item));
                } else {
                    setWarning(
                        "X/Y attributes are read-only, so the move cannot be saved. Check entity access rules (write access to X and Y) or configure Moved X/Y output attributes."
                    );
                }
                return;
            }
            setWarning(null);
            xv.setValue(new Big(round(x)));
            yv.setValue(new Big(round(y)));
            run(onMarkerChange?.get(item));
        },
        [xAttr, yAttr, movedXAttr, movedYAttr, onMarkerChange, integerCoords]
    );

    const pointToCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            return null;
        }
        return {
            x: clamp(snap(((clientX - rect.left) / rect.width) * maxX), maxX),
            y: clamp(snap(((clientY - rect.top) / rect.height) * maxY), maxY)
        };
    };

    const onMarkerPointerDown = (e: React.PointerEvent, item: ObjectItem): void => {
        e.stopPropagation();
        setSelectedId(item.id);
        if (!editing) {
            return;
        }
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const x = num(xAttr.get(item).value);
        const y = num(yAttr.get(item).value);
        dragRef.current = { id: item.id, x, y, moved: false };
        setDrag(dragRef.current);
    };

    const onMarkerPointerMove = (e: React.PointerEvent): void => {
        const d = dragRef.current;
        if (!d) {
            return;
        }
        const p = pointToCoords(e.clientX, e.clientY);
        if (p) {
            dragRef.current = { ...d, ...p, moved: true };
            setDrag(dragRef.current);
        }
    };

    const onMarkerPointerUp = (e: React.PointerEvent, item: ObjectItem): void => {
        e.stopPropagation();
        const d = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (d?.moved) {
            commitPosition(item, d.x, d.y);
        } else {
            run(onMarkerClick?.get(item));
        }
    };

    const onMarkerKeyDown = (e: React.KeyboardEvent, item: ObjectItem): void => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedId(item.id);
            run(onMarkerClick?.get(item));
            return;
        }
        const step = e.shiftKey ? 10 : 1;
        const delta: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step]
        };
        const dxy = delta[e.key];
        if (editing && dxy) {
            e.preventDefault();
            const x = clamp(
                num(xAttr.get(item).value) +
                    dxy[0] * (snapSize || (coordMode === "percent" && !integerCoords ? 0.5 : 1)),
                maxX
            );
            const y = clamp(
                num(yAttr.get(item).value) +
                    dxy[1] * (snapSize || (coordMode === "percent" && !integerCoords ? 0.5 : 1)),
                maxY
            );
            commitPosition(item, x, y);
        }
    };

    const onCanvasPointerMove = (e: React.PointerEvent): void => {
        const pan = panRef.current;
        const vp = viewportRef.current;
        if (pan && vp) {
            vp.scrollLeft = pan.sl - (e.clientX - pan.x);
            vp.scrollTop = pan.st - (e.clientY - pan.y);
        }
    };

    const endPan = (): void => {
        panRef.current = null;
        setPanning(false);
    };

    const onCanvasPointerDown = (e: React.PointerEvent): void => {
        setSelectedId(null);
        if (!editing && allowZoom && e.target === e.currentTarget && viewportRef.current && e.button === 0) {
            const vp = viewportRef.current;
            if (vp.scrollWidth > vp.clientWidth || vp.scrollHeight > vp.clientHeight) {
                e.currentTarget.setPointerCapture(e.pointerId);
                panRef.current = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
                setPanning(true);
            }
            return;
        }
        if (!editing || e.target !== e.currentTarget) {
            return;
        }
        const p = pointToCoords(e.clientX, e.clientY);
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

    if (markers.status === "loading" && items.length === 0) {
        return <div className={`layout-overlay ${props.class}`}>Loading…</div>;
    }

    return (
        <div ref={rootRef} className={`layout-overlay ${props.class}`} style={props.style}>
            {(allowEditing || allowZoom) && (
                <div className="layout-overlay__toolbar">
                    {allowEditing && (
                        <button
                            type="button"
                            className={`layout-overlay__btn ${editMode ? "layout-overlay__btn--on" : ""}`}
                            onClick={() => setEditMode(m => !m)}
                        >
                            {editMode ? "Editing" : "Edit"}
                        </button>
                    )}
                    {allowZoom && (
                        <span className="layout-overlay__zoom">
                            <button
                                type="button"
                                className="layout-overlay__btn"
                                title="Zoom out"
                                onClick={() => zoomTo(zoomRef.current / 1.25)}
                            >
                                −
                            </button>
                            <span className="layout-overlay__zoom-label">{Math.round(zoom * 100)}%</span>
                            <button
                                type="button"
                                className="layout-overlay__btn"
                                title="Zoom in"
                                onClick={() => zoomTo(zoomRef.current * 1.25)}
                            >
                                +
                            </button>
                            <button
                                type="button"
                                className="layout-overlay__btn"
                                title="Fit to width"
                                onClick={() => zoomTo(1)}
                            >
                                Fit
                            </button>
                        </span>
                    )}
                    {editing && <span>Drag markers · arrow keys nudge · click empty space to add</span>}
                </div>
            )}
            {legendItems.length > 0 && (
                <div className="layout-overlay__legend">
                    {legendItems.map((l, i) => (
                        <span key={i} className="layout-overlay__legend-item">
                            <Shape shape={parseShape(l.legendShape)} color={l.legendColor} size={14} rotation={0} />
                            {l.legendCaption}
                        </span>
                    ))}
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
                        aspectRatio: `${w} / ${h}`,
                        backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined
                    }}
                    onPointerDown={onCanvasPointerDown}
                    onPointerMove={onCanvasPointerMove}
                    onPointerUp={endPan}
                    onPointerCancel={endPan}
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
                        const isDrag = drag?.id === item.id;
                        const x = isDrag ? drag.x : num(xAttr.get(item).value);
                        const y = isDrag ? drag.y : num(yAttr.get(item).value);
                        const size = (num(sizeAttr?.get(item).value, defaultSize) || defaultSize) * markerScale;
                        const color = colorAttr?.get(item).value || defaultColor;
                        const label = labelAttr?.get(item).value;
                        const cls = [
                            "layout-overlay__marker",
                            editing ? "layout-overlay__marker--edit" : "",
                            isDrag ? "layout-overlay__marker--drag" : "",
                            selectedId === item.id ? "layout-overlay__marker--selected" : ""
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
                                style={{ left: `${toFracX(x) * 100}%`, top: `${toFracY(y) * 100}%` }}
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
                                onDoubleClick={() => run(onMarkerDoubleClick?.get(item))}
                                onContextMenu={e => {
                                    if (onMarkerContextMenu?.get(item).canExecute) {
                                        e.preventDefault();
                                        run(onMarkerContextMenu.get(item));
                                    }
                                }}
                                onKeyDown={e => onMarkerKeyDown(e, item)}
                            >
                                <Shape
                                    shape={parseShape(shapeAttr?.get(item).value)}
                                    color={color}
                                    size={size}
                                    rotation={num(rotationAttr?.get(item).value)}
                                />
                                {label && <span className="layout-overlay__label">{label}</span>}
                            </div>
                        );
                    })}
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
            {editing && selected && (
                <div className="layout-overlay__inspector">
                    <label>
                        X{" "}
                        <input
                            type="number"
                            step="any"
                            value={num(xAttr.get(selected).value)}
                            onChange={e =>
                                setAttr(xAttr, selected, new Big(round(clamp(Number(e.target.value) || 0, maxX))))
                            }
                        />
                    </label>
                    <label>
                        Y{" "}
                        <input
                            type="number"
                            step="any"
                            value={num(yAttr.get(selected).value)}
                            onChange={e =>
                                setAttr(yAttr, selected, new Big(round(clamp(Number(e.target.value) || 0, maxY))))
                            }
                        />
                    </label>
                    {shapeAttr && (
                        <label>
                            Shape{" "}
                            <select
                                value={shapeAttr.get(selected).value ?? ""}
                                disabled={shapeAttr.get(selected).readOnly}
                                onChange={e => setAttr(shapeAttr, selected, e.target.value)}
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
                                    /^#[0-9a-f]{6}$/i.test(colorAttr.get(selected).value ?? "")
                                        ? colorAttr.get(selected).value!
                                        : "#d32f2f"
                                }
                                disabled={colorAttr.get(selected).readOnly}
                                onChange={e => setAttr(colorAttr, selected, e.target.value)}
                            />
                        </label>
                    )}
                    {sizeAttr && (
                        <label>
                            Size{" "}
                            <input
                                type="number"
                                min={8}
                                value={num(sizeAttr.get(selected).value, defaultSize)}
                                onChange={e =>
                                    setAttr(
                                        sizeAttr,
                                        selected,
                                        new Big(Math.max(8, Number(e.target.value) || defaultSize))
                                    )
                                }
                            />
                        </label>
                    )}
                    {labelAttr && (
                        <label>
                            Label{" "}
                            <input
                                type="text"
                                value={labelAttr.get(selected).value ?? ""}
                                readOnly={labelAttr.get(selected).readOnly}
                                onChange={e => setAttr(labelAttr, selected, e.target.value)}
                            />
                        </label>
                    )}
                </div>
            )}
        </div>
    );
}
