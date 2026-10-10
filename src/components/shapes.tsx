import React, { ReactElement } from "react";

// All path shapes are drawn in a 24x24 viewBox.
export const SHAPE_PATHS: Record<string, string> = {
    circle: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z",
    square: "M3 3h18v18H3z",
    triangle: "M12 2L22 21H2z",
    diamond: "M12 1L23 12L12 23L1 12z",
    star: "M12 2l3.1 6.9l7.4.8l-5.5 5l1.6 7.3L12 18.2L5.4 22l1.6-7.3l-5.5-5l7.4-.8z",
    hexagon: "M12 2l8.7 5v10L12 22l-8.7-5V7z",
    pin: "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5a2.5 2.5 0 0 1 0 5z",
    cross: "M9 2h6v7h7v6h-7v7H9v-7H2V9h7z",
    check: "M9 16.2L4.8 12l-1.4 1.4L9 19L21 7l-1.4-1.4z",
    warning: "M12 2L1 21h22zM11 10h2v5h-2zm0 6h2v2h-2z",
    "thumbs-up":
        "M1 21h4V9H1zm22-11c0-1.1-.9-2-2-2h-6.3l.95-4.57l.03-.32c0-.41-.17-.79-.44-1.06L14.17 1L7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73z",
    "thumbs-down":
        "M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57l-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3z"
};

// Tractor and trailer seen from above, heading right (0° = east). Two separate shapes with a gap.
const TRUCK_VIEWBOX = { x: -1, y: 0, w: 48, h: 14 };
// Dock leveler seen from above: deck plate with its hinged lip pointing right (0° = east, towards the truck).
const DOCK_VIEWBOX = { x: -1, y: 0, w: 23, h: 18 };
// Manual trolley seen from above (as drawn on the plan): a platform with X bracing and two cross bars, with a
// tow bar and grip at the rear (0° = east: the platform leads, the handle trails to the left).
const TROLLEY_VIEWBOX = { x: -9, y: -1, w: 32, h: 18 };
const TRUCK_NAMES = new Set(["truck", "truck-filled", "truck-outline"]);
const DOCK_NAMES = new Set(["dock-leveler", "dockleveler", "dock", "leveler", "dock-levelor"]);
const TROLLEY_NAMES = new Set(["manual-trolley", "trolley", "pallet-jack", "pallet-truck", "hand-pallet-truck"]);

export const SHAPE_NAMES = ["truck", "dock-leveler", "manual-trolley", ...Object.keys(SHAPE_PATHS)];

export type ParsedShape =
    | { kind: "path"; d: string }
    | { kind: "image"; url: string }
    | { kind: "truck"; forceFill?: boolean }
    | { kind: "dock" }
    | { kind: "trolley" };

export function parseShape(value: string | undefined): ParsedShape {
    const v = (value ?? "").trim();
    if (v.startsWith("svg:")) {
        return { kind: "path", d: v.slice(4).trim() || SHAPE_PATHS.circle };
    }
    if (v.startsWith("url:")) {
        return { kind: "image", url: v.slice(4).trim() };
    }
    const name = v.toLowerCase().replace(/[\s_]+/g, "-");
    if (TRUCK_NAMES.has(name)) {
        return {
            kind: "truck",
            forceFill: name === "truck-filled" ? true : name === "truck-outline" ? false : undefined
        };
    }
    if (DOCK_NAMES.has(name)) {
        return { kind: "dock" };
    }
    if (TROLLEY_NAMES.has(name)) {
        return { kind: "trolley" };
    }
    return { kind: "path", d: SHAPE_PATHS[name] ?? SHAPE_PATHS.circle };
}

/** Long, thin icons get a larger nominal width than a square icon of the same Size. */
export function shapeWidthFactor(shape: ParsedShape): number {
    return shape.kind === "truck" ? 1.6 : shape.kind === "trolley" ? 1.25 : shape.kind === "dock" ? 1.1 : 1;
}

/** Height / width of the unscaled shape. */
export function shapeAspect(shape: ParsedShape): number {
    switch (shape.kind) {
        case "truck":
            return TRUCK_VIEWBOX.h / TRUCK_VIEWBOX.w;
        case "dock":
            return DOCK_VIEWBOX.h / DOCK_VIEWBOX.w;
        case "trolley":
            return TROLLEY_VIEWBOX.h / TROLLEY_VIEWBOX.w;
        default:
            return 1;
    }
}

interface ShapeProps {
    shape: ParsedShape;
    color: string;
    /** Width in px of the unscaled shape. */
    size: number;
    /** Clockwise degrees. */
    rotation: number;
    filled?: boolean;
    /** Filled icons only: also draw a solid outline in a darker shade of the color. */
    outlined?: boolean;
    /** Draw the outline as dots (only when not filled). */
    dotted?: boolean;
    /** Outline thickness in screen px (does not change with scale or zoom). */
    lineWidth?: number;
    /** 0..1: how strongly the inside of an outline icon is tinted with its color (0 = see-through). */
    outlineTint?: number;
    scaleX?: number;
    scaleY?: number;
    mirror?: boolean;
}

export function Shape({
    shape,
    color,
    size,
    rotation,
    filled = true,
    outlined = false,
    dotted = false,
    lineWidth = 2,
    outlineTint = 0.14,
    scaleX = 1,
    scaleY = 1,
    mirror = false
}: ShapeProps): ReactElement {
    const width = size * scaleX;
    const height = size * shapeAspect(shape) * scaleY;
    // Dotted: round caps on zero-length dashes give dots of the line width, spaced about two widths apart.
    // A pale tint of the icon's own color keeps outline icons visible over a busy drawing.
    const tintFill = outlineTint > 0 ? "rgba(255,255,255,0.88)" : "none";
    const tintStyle =
        outlineTint > 0
            ? ({
                  fill: `color-mix(in srgb, ${color} ${Math.round(outlineTint * 100)}%, white)`,
                  fillOpacity: 0.95
              } as React.CSSProperties)
            : undefined;
    const dash = dotted ? `0.01 ${Math.max(3, lineWidth * 2)}` : undefined;
    const transform = [rotation ? `rotate(${rotation}deg)` : "", mirror ? "scaleX(-1)" : ""].filter(Boolean).join(" ");
    const style = { width, height, transform: transform || undefined };
    // Solid outline of a filled icon: a darker shade of its own color.
    const edgeStyle = { stroke: `color-mix(in srgb, ${color} 55%, black)` } as React.CSSProperties;

    if (shape.kind === "image") {
        return (
            <img
                className="layout-overlay__shape"
                src={shape.url}
                style={{ ...style, opacity: filled ? 1 : 0.4 }}
                alt=""
                draggable={false}
            />
        );
    }

    // Icons built from several parts: `solid` is the filled drawing, `lines` the same parts as outlines.
    let box: { x: number; y: number; w: number; h: number } | undefined;
    let solid: ReactElement | undefined;
    let lines: ReactElement | undefined;
    let fillIt = filled;

    if (shape.kind === "truck") {
        box = TRUCK_VIEWBOX;
        fillIt = shape.forceFill ?? filled;
        solid = (
            <g>
                <rect x={0} y={1} width={32.2} height={12} rx={1.8} fill={color} />
                <path d="M33 1H42.4Q46 1 46 4.6V9.4Q46 13 42.4 13H33Z" fill={color} />
                <path d="M33 1H42.4Q46 1 46 4.6V9.4Q46 13 42.4 13H33Z" fill="rgba(0,0,0,0.2)" />
                <rect x={41.3} y={3.2} width={2.7} height={7.6} rx={1.2} fill="rgba(255,255,255,0.6)" />
            </g>
        );
        lines = (
            <>
                <rect x={0.55} y={1.55} width={31.1} height={10.9} rx={1.5} />
                <path d="M33.55 1.55H42.4Q45.45 1.55 45.45 4.6V9.4Q45.45 12.45 42.4 12.45H33.55Z" />
                <rect
                    x={41.5}
                    y={3.6}
                    width={2.2}
                    height={6.8}
                    rx={1}
                    strokeWidth={Math.max(1, lineWidth * 0.6)}
                    strokeDasharray="none"
                />
            </>
        );
    } else if (shape.kind === "dock") {
        box = DOCK_VIEWBOX;
        solid = (
            <g>
                <rect x={0} y={1} width={16} height={16} rx={1} fill={color} />
                <rect
                    x={2.2}
                    y={3.2}
                    width={11.6}
                    height={11.6}
                    rx={0.6}
                    fill="none"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth={0.6}
                />
                <rect x={16.5} y={3} width={4.5} height={12} rx={0.8} fill={color} />
                <rect x={16.5} y={3} width={4.5} height={12} rx={0.8} fill="rgba(0,0,0,0.28)" />
                <path d="M17.7 4.5V13.5M19.8 4.5V13.5" stroke="rgba(255,255,255,0.45)" strokeWidth={0.6} />
            </g>
        );
        lines = (
            <>
                <rect x={0.55} y={1.55} width={14.9} height={14.9} rx={0.8} />
                <rect x={17.05} y={3.55} width={3.4} height={10.9} rx={0.6} />
            </>
        );
    } else if (shape.kind === "trolley") {
        box = TROLLEY_VIEWBOX;
        solid = (
            <g>
                <rect x={0} y={0} width={22} height={16} rx={1.2} fill={color} />
                <rect x={2} y={2} width={18} height={12} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={0.7} />
                <path
                    d="M2 2L20 14M2 14L20 2M2 5.4H20M2 10.6H20"
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth={0.7}
                    fill="none"
                />
                <path d="M0 6.2L-2.6 8L0 9.8Z" fill="rgba(0,0,0,0.7)" />
                <path d="M-2.6 8H-6" stroke="rgba(0,0,0,0.75)" strokeWidth={1.4} strokeLinecap="round" />
                <rect x={-8} y={4.8} width={2.2} height={6.4} rx={1.1} fill="rgba(0,0,0,0.82)" />
            </g>
        );
        lines = (
            <>
                <rect x={0.55} y={0.55} width={20.9} height={14.9} rx={1} />
                <path
                    d="M2.6 2.6L19.4 13.4M2.6 13.4L19.4 2.6M2.6 5.6H19.4M2.6 10.4H19.4"
                    strokeWidth={Math.max(1, lineWidth * 0.55)}
                    strokeDasharray="none"
                />
                <path d="M0 6.2L-2.6 8L0 9.8" strokeDasharray="none" />
                <path d="M-2.6 8H-5.8" strokeDasharray="none" />
                <rect x={-7.6} y={5.2} width={1.4} height={5.6} rx={0.7} strokeDasharray="none" />
            </>
        );
    }

    if (box && solid && lines) {
        return (
            <svg
                className="layout-overlay__shape"
                viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
                preserveAspectRatio="none"
                style={style}
                aria-hidden="true"
            >
                {fillIt ? (
                    <>
                        {solid}
                        {outlined && (
                            <g
                                className="layout-overlay__outline"
                                fill="none"
                                style={edgeStyle}
                                stroke="#222"
                                strokeWidth={lineWidth}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            >
                                {lines}
                            </g>
                        )}
                    </>
                ) : (
                    <g
                        className="layout-overlay__outline"
                        fill={tintFill}
                        style={tintStyle}
                        stroke={color}
                        strokeWidth={lineWidth}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray={dash}
                    >
                        {lines}
                    </g>
                )}
            </svg>
        );
    }

    const d = shape.kind === "path" ? shape.d : SHAPE_PATHS.circle;
    return (
        <svg
            className="layout-overlay__shape"
            viewBox="0 0 24 24"
            preserveAspectRatio="none"
            style={style}
            aria-hidden="true"
        >
            {filled ? (
                outlined ? (
                    <g className="layout-overlay__outline">
                        <path
                            d={d}
                            fill={color}
                            style={edgeStyle}
                            stroke="#222"
                            strokeWidth={lineWidth}
                            strokeLinejoin="round"
                        />
                    </g>
                ) : (
                    <path d={d} fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth={0.8} />
                )
            ) : (
                <g className="layout-overlay__outline">
                    <path
                        d={d}
                        fill={tintFill}
                        style={tintStyle}
                        stroke={color}
                        strokeWidth={lineWidth}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray={dash}
                    />
                </g>
            )}
        </svg>
    );
}
