import React, { ReactElement } from "react";

// All paths are drawn in a 24x24 viewBox.
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

export const SHAPE_NAMES = Object.keys(SHAPE_PATHS);

export type ParsedShape = { kind: "path"; d: string } | { kind: "image"; url: string };

export function parseShape(value: string | undefined): ParsedShape {
    const v = (value ?? "").trim();
    if (v.startsWith("svg:")) {
        return { kind: "path", d: v.slice(4).trim() || SHAPE_PATHS.circle };
    }
    if (v.startsWith("url:")) {
        return { kind: "image", url: v.slice(4).trim() };
    }
    return { kind: "path", d: SHAPE_PATHS[v.toLowerCase()] ?? SHAPE_PATHS.circle };
}

interface ShapeProps {
    shape: ParsedShape;
    color: string;
    size: number;
    rotation: number;
}

export function Shape({ shape, color, size, rotation }: ShapeProps): ReactElement {
    const style = { width: size, height: size, transform: rotation ? `rotate(${rotation}deg)` : undefined };
    if (shape.kind === "image") {
        return <img className="layout-overlay__shape" src={shape.url} style={style} alt="" draggable={false} />;
    }
    return (
        <svg className="layout-overlay__shape" viewBox="0 0 24 24" style={style} aria-hidden="true">
            <path d={shape.d} fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth={0.8} />
        </svg>
    );
}
