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

// Box-truck side view, facing right (same geometry as the Truck Scheduler widget).
const TRUCK_VIEWBOX = { x: -1, y: -1, w: 27, h: 20.5 };
const TRUCK_NAMES = new Set(["truck", "truck-filled", "truck-outline"]);

export const SHAPE_NAMES = ["truck", ...Object.keys(SHAPE_PATHS)];

export type ParsedShape =
    | { kind: "path"; d: string }
    | { kind: "image"; url: string }
    | { kind: "truck"; forceFill?: boolean };

export function parseShape(value: string | undefined): ParsedShape {
    const v = (value ?? "").trim();
    if (v.startsWith("svg:")) {
        return { kind: "path", d: v.slice(4).trim() || SHAPE_PATHS.circle };
    }
    if (v.startsWith("url:")) {
        return { kind: "image", url: v.slice(4).trim() };
    }
    const name = v.toLowerCase();
    if (TRUCK_NAMES.has(name)) {
        return {
            kind: "truck",
            forceFill: name === "truck-filled" ? true : name === "truck-outline" ? false : undefined
        };
    }
    return { kind: "path", d: SHAPE_PATHS[name] ?? SHAPE_PATHS.circle };
}

/** Height / width of the unscaled shape. */
export function shapeAspect(shape: ParsedShape): number {
    return shape.kind === "truck" ? TRUCK_VIEWBOX.h / TRUCK_VIEWBOX.w : 1;
}

interface ShapeProps {
    shape: ParsedShape;
    color: string;
    /** Width in px of the unscaled shape. */
    size: number;
    /** Clockwise degrees. */
    rotation: number;
    filled?: boolean;
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
    scaleX = 1,
    scaleY = 1,
    mirror = false
}: ShapeProps): ReactElement {
    const width = size * scaleX;
    const height = size * shapeAspect(shape) * scaleY;
    const transform = [rotation ? `rotate(${rotation}deg)` : "", mirror ? "scaleX(-1)" : ""].filter(Boolean).join(" ");
    const style = { width, height, transform: transform || undefined };

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
    if (shape.kind === "truck") {
        const solid = shape.forceFill ?? filled;
        const { x, y, w, h } = TRUCK_VIEWBOX;
        return (
            <svg
                className="layout-overlay__shape"
                viewBox={`${x} ${y} ${w} ${h}`}
                preserveAspectRatio="none"
                style={style}
                aria-hidden="true"
            >
                {solid ? (
                    <g fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={0.5} strokeLinejoin="round">
                        <rect x={0} y={0} width={17} height={11} />
                        <polygon points="17,2 21,2 25,4.88 25,11 17,11" />
                        <circle cx={4.25} cy={15.5} r={3} />
                        <circle cx={21.8} cy={15.5} r={3} />
                    </g>
                ) : (
                    <g fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
                        <rect x={0.75} y={0.75} width={15.5} height={9.5} />
                        <polygon points="17.75,2.75 21,2.75 24.25,4.88 24.25,10.25 17.75,10.25" />
                        <circle cx={4.25} cy={15.5} r={2.5} />
                        <circle cx={21.8} cy={15.5} r={2.5} />
                    </g>
                )}
            </svg>
        );
    }
    return (
        <svg
            className="layout-overlay__shape"
            viewBox="0 0 24 24"
            preserveAspectRatio="none"
            style={style}
            aria-hidden="true"
        >
            {filled ? (
                <path d={shape.d} fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth={0.8} />
            ) : (
                <path d={shape.d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
            )}
        </svg>
    );
}
