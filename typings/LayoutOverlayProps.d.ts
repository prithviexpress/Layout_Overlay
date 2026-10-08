/**
 * This file was generated from LayoutOverlay.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import {
    ActionValue,
    DynamicValue,
    EditableValue,
    ListActionValue,
    ListAttributeValue,
    ListValue,
    WebImage
} from "mendix";
import { Big } from "big.js";
import { CSSProperties } from "react";

export type CoordModeEnum = "percent" | "pixels";

export interface LayoutOverlayContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    markers: ListValue;
    xAttr: ListAttributeValue<Big>;
    yAttr: ListAttributeValue<Big>;
    shapeAttr?: ListAttributeValue<string>;
    colorAttr?: ListAttributeValue<string>;
    sizeAttr?: ListAttributeValue<Big>;
    rotationAttr?: ListAttributeValue<Big>;
    labelAttr?: ListAttributeValue<string>;
    tooltipAttr?: ListAttributeValue<string>;
    backgroundImage?: DynamicValue<WebImage>;
    backgroundUrl?: DynamicValue<string>;
    coordMode: CoordModeEnum;
    canvasWidth: number;
    canvasHeight: number;
    defaultSize: number;
    defaultColor: string;
    showGrid: boolean;
    snapSize: number;
    allowEditing: boolean;
    startInEditMode: boolean;
    newXAttr?: EditableValue<Big>;
    newYAttr?: EditableValue<Big>;
    movedXAttr?: EditableValue<Big>;
    movedYAttr?: EditableValue<Big>;
    onMarkerClick?: ListActionValue;
    onMarkerDoubleClick?: ListActionValue;
    onMarkerContextMenu?: ListActionValue;
    onMarkerChange?: ListActionValue;
    onCanvasClick?: ActionValue;
}

export interface LayoutOverlayPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    markers: {} | { caption: string } | { type: string } | null;
    xAttr: string;
    yAttr: string;
    shapeAttr: string;
    colorAttr: string;
    sizeAttr: string;
    rotationAttr: string;
    labelAttr: string;
    tooltipAttr: string;
    backgroundImage: { type: "static"; imageUrl: string } | { type: "dynamic"; entity: string } | null;
    backgroundUrl: string;
    coordMode: CoordModeEnum;
    canvasWidth: number | null;
    canvasHeight: number | null;
    defaultSize: number | null;
    defaultColor: string;
    showGrid: boolean;
    snapSize: number | null;
    allowEditing: boolean;
    startInEditMode: boolean;
    newXAttr: string;
    newYAttr: string;
    movedXAttr: string;
    movedYAttr: string;
    onMarkerClick: {} | null;
    onMarkerDoubleClick: {} | null;
    onMarkerContextMenu: {} | null;
    onMarkerChange: {} | null;
    onCanvasClick: {} | null;
}
