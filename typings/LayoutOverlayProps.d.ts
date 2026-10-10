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
    ListExpressionValue,
    ListValue,
    WebImage
} from "mendix";
import { Big } from "big.js";
import { CSSProperties } from "react";

export type CoordModeEnum = "percent" | "pixels";

export type DefaultShapeEnum =
    | "circle"
    | "square"
    | "triangle"
    | "diamond"
    | "star"
    | "hexagon"
    | "pin"
    | "cross"
    | "check"
    | "warning"
    | "thumbsUp"
    | "thumbsDown"
    | "truck";

export type DefaultFillEnum = "filled" | "outline";

export type OccupiedStyleEnum = "outline" | "filled";

export type ZoomWheelEnum = "ctrl" | "wheel";

export type MarkerScalingEnum = "fixed" | "smooth" | "proportional";

export type LabelOrientationEnum = "follow" | "upright";

export type LabelTextEnum = "along" | "horizontal";

export type LabelSideEnum = "rear" | "cabin";

export type LabelWidthEnum = "match" | "readable" | "auto";

export type FilterModeEnum = "hide" | "dim";

export interface HoverLinesType {
    text: ListExpressionValue<string>;
    bold: boolean;
}

export type TitleAlignEnum = "left" | "center" | "right";

export interface LegendItemsType {
    legendCaption: string;
    legendColor: string;
    legendFilled: boolean;
    legendDotted: boolean;
    legendShape: string;
}

export interface HoverLinesPreviewType {
    text: string;
    bold: boolean;
}

export interface LegendItemsPreviewType {
    legendCaption: string;
    legendColor: string;
    legendFilled: boolean;
    legendDotted: boolean;
    legendShape: string;
}

export interface LayoutOverlayContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    markers: ListValue;
    xAttr: ListAttributeValue<Big>;
    integerCoords: boolean;
    yAttr: ListAttributeValue<Big>;
    shapeAttr?: ListAttributeValue<string>;
    shapeExpr?: ListExpressionValue<string>;
    colorAttr?: ListAttributeValue<string>;
    sizeAttr?: ListAttributeValue<Big>;
    sizeExpr?: ListExpressionValue<Big>;
    rotationAttr?: ListAttributeValue<Big>;
    labelAttr?: ListAttributeValue<string>;
    orientationAttr?: ListAttributeValue<string | Big>;
    mirrorAttr?: ListAttributeValue<boolean | string>;
    scaleAttr?: ListAttributeValue<Big>;
    scaleXAttr?: ListAttributeValue<Big>;
    scaleYAttr?: ListAttributeValue<Big>;
    occupancyAttr?: ListAttributeValue<boolean | string>;
    fillAttr?: ListAttributeValue<boolean | string>;
    pulseAttr?: ListAttributeValue<boolean>;
    tooltipAttr?: ListAttributeValue<string>;
    backgroundImage?: DynamicValue<WebImage>;
    backgroundUrl?: DynamicValue<string>;
    coordMode: CoordModeEnum;
    canvasFromImage: boolean;
    canvasWidth: number;
    canvasHeight: number;
    defaultSize: number;
    defaultShape: DefaultShapeEnum;
    defaultFill: DefaultFillEnum;
    occupiedStyle: OccupiedStyleEnum;
    defaultColor: string;
    allowZoom: boolean;
    zoomWheel: ZoomWheelEnum;
    minZoom: number;
    maxZoom: number;
    initialZoom: number;
    markerScaling: MarkerScalingEnum;
    viewportHeight: number;
    labelMinZoom: number;
    labelOrientation: LabelOrientationEnum;
    labelFontFamily: string;
    labelRadius: number;
    labelFontSize: number;
    labelText: LabelTextEnum;
    labelSide: LabelSideEnum;
    labelWidth: LabelWidthEnum;
    outlineFill: number;
    outlineWidth: number;
    showGrid: boolean;
    snapSize: number;
    allowEditing: boolean;
    canEditExpr?: DynamicValue<boolean>;
    startInEditMode: boolean;
    clickWhileEditing: boolean;
    newXAttr?: EditableValue<Big>;
    newYAttr?: EditableValue<Big>;
    movedXAttr?: EditableValue<Big>;
    movedYAttr?: EditableValue<Big>;
    groupAttr?: ListAttributeValue<string>;
    searchAttr?: ListAttributeValue<string>;
    showSearch: boolean;
    searchPlaceholder: string;
    allGroupsLabel: string;
    filterMode: FilterModeEnum;
    onMarkerClick?: ListActionValue;
    onMarkerDoubleClick?: ListActionValue;
    onMarkerContextMenu?: ListActionValue;
    onMarkerChange?: ListActionValue;
    onCanvasClick?: ActionValue;
    hoverTitle?: ListExpressionValue<string>;
    hoverLines: HoverLinesType[];
    hoverDelay: number;
    titleLabel: string;
    titleExpr?: DynamicValue<string>;
    titleText?: DynamicValue<string>;
    titleAlign: TitleAlignEnum;
    legendItems: LegendItemsType[];
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
    integerCoords: boolean;
    yAttr: string;
    shapeAttr: string;
    shapeExpr: string;
    colorAttr: string;
    sizeAttr: string;
    sizeExpr: string;
    rotationAttr: string;
    labelAttr: string;
    orientationAttr: string;
    mirrorAttr: string;
    scaleAttr: string;
    scaleXAttr: string;
    scaleYAttr: string;
    occupancyAttr: string;
    fillAttr: string;
    pulseAttr: string;
    tooltipAttr: string;
    backgroundImage: { type: "static"; imageUrl: string } | { type: "dynamic"; entity: string } | null;
    backgroundUrl: string;
    coordMode: CoordModeEnum;
    canvasFromImage: boolean;
    canvasWidth: number | null;
    canvasHeight: number | null;
    defaultSize: number | null;
    defaultShape: DefaultShapeEnum;
    defaultFill: DefaultFillEnum;
    occupiedStyle: OccupiedStyleEnum;
    defaultColor: string;
    allowZoom: boolean;
    zoomWheel: ZoomWheelEnum;
    minZoom: number | null;
    maxZoom: number | null;
    initialZoom: number | null;
    markerScaling: MarkerScalingEnum;
    viewportHeight: number | null;
    labelMinZoom: number | null;
    labelOrientation: LabelOrientationEnum;
    labelFontFamily: string;
    labelRadius: number | null;
    labelFontSize: number | null;
    labelText: LabelTextEnum;
    labelSide: LabelSideEnum;
    labelWidth: LabelWidthEnum;
    outlineFill: number | null;
    outlineWidth: number | null;
    showGrid: boolean;
    snapSize: number | null;
    allowEditing: boolean;
    canEditExpr: string;
    startInEditMode: boolean;
    clickWhileEditing: boolean;
    newXAttr: string;
    newYAttr: string;
    movedXAttr: string;
    movedYAttr: string;
    groupAttr: string;
    searchAttr: string;
    showSearch: boolean;
    searchPlaceholder: string;
    allGroupsLabel: string;
    filterMode: FilterModeEnum;
    onMarkerClick: {} | null;
    onMarkerDoubleClick: {} | null;
    onMarkerContextMenu: {} | null;
    onMarkerChange: {} | null;
    onCanvasClick: {} | null;
    hoverTitle: string;
    hoverLines: HoverLinesPreviewType[];
    hoverDelay: number | null;
    titleLabel: string;
    titleExpr: string;
    titleText: string;
    titleAlign: TitleAlignEnum;
    legendItems: LegendItemsPreviewType[];
}
