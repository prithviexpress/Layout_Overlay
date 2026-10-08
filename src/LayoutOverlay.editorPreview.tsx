import React, { ReactElement } from "react";
import { LayoutOverlayPreviewProps } from "../typings/LayoutOverlayProps";
import { Shape, parseShape } from "./components/shapes";

export function preview(props: LayoutOverlayPreviewProps): ReactElement {
    const w = props.canvasWidth || 1000;
    const h = props.canvasHeight || 600;
    const samples = [
        { x: 20, y: 30, s: "thumbs-up", c: "#2e7d32" },
        { x: 55, y: 55, s: "thumbs-down", c: "#d32f2f" },
        { x: 80, y: 25, s: "star", c: "#ef6c00" }
    ];
    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                aspectRatio: `${w} / ${h}`,
                maxHeight: 300,
                background: "#fafafa",
                border: "1px dashed #999",
                fontFamily: "sans-serif",
                fontSize: 12
            }}
        >
            <div style={{ position: "absolute", top: 4, left: 8, color: "#666" }}>Layout Overlay</div>
            {samples.map(m => (
                <div
                    key={m.s}
                    style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-50%)" }}
                >
                    <Shape shape={parseShape(m.s)} color={m.c} size={28} rotation={0} />
                </div>
            ))}
        </div>
    );
}

export function getPreviewCss(): string {
    return "";
}
