import React, { ReactElement } from "react";
import { LayoutOverlayPreviewProps } from "../typings/LayoutOverlayProps";
import { Shape, parseShape } from "./components/shapes";

export function preview(props: LayoutOverlayPreviewProps): ReactElement {
    const w = props.canvasWidth || 1000;
    const h = props.canvasHeight || 600;
    const samples = [
        { x: 20, y: 30, s: "thumbs-up", c: "#2e7d32" },
        { x: 55, y: 55, s: "thumbs-down", c: "#d32f2f" },
        { x: 80, y: 25, s: "star", c: "#ef6c00" },
        { x: 35, y: 70, s: "truck", c: "#1565c0", filled: true },
        { x: 65, y: 78, s: "truck", c: "#1565c0", filled: false, dotted: true }
    ];
    const legend = props.legendItems.slice(0, 6);
    return (
        <div style={{ width: "100%", fontFamily: "sans-serif" }}>
            {(props.titleLabel || props.titleExpr || props.titleText) && (
                <div style={{ fontSize: 18, fontWeight: 700, textAlign: props.titleAlign, marginBottom: 6 }}>
                    {props.titleLabel || props.titleExpr || props.titleText}
                </div>
            )}
            {legend.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        justifyContent: "center",
                        marginBottom: 6,
                        fontSize: 12
                    }}
                >
                    {legend.map((l, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <Shape
                                shape={parseShape(l.legendShape)}
                                color={l.legendColor}
                                size={14}
                                rotation={0}
                                filled={l.legendFilled}
                                dotted={l.legendDotted}
                            />
                            {l.legendCaption}
                        </span>
                    ))}
                </div>
            )}
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
                        key={`${m.s}-${m.x}`}
                        style={{
                            position: "absolute",
                            left: `${m.x}%`,
                            top: `${m.y}%`,
                            transform: "translate(-50%,-50%)"
                        }}
                    >
                        <Shape
                            shape={parseShape(m.s)}
                            color={m.c}
                            size={m.s === "truck" ? 56 : 28}
                            rotation={0}
                            filled={m.filled ?? true}
                            dotted={m.dotted ?? false}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function getPreviewCss(): string {
    return "";
}
