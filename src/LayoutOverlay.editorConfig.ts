import { LayoutOverlayPreviewProps } from "../typings/LayoutOverlayProps";

export type Problem = {
    property?: string;
    severity?: "error" | "warning" | "deprecation";
    message: string;
    studioMessage?: string;
    url?: string;
    studioUrl?: string;
};

export function check(values: LayoutOverlayPreviewProps): Problem[] {
    const errors: Problem[] = [];
    if (values.legendItems.length > 6) {
        errors.push({
            property: "legendItems",
            severity: "error",
            message: `The legend supports up to 6 entries, but ${values.legendItems.length} are configured. Remove the extra entries.`
        });
    }
    if (values.minZoom !== null && values.maxZoom !== null && values.minZoom > values.maxZoom) {
        errors.push({
            property: "minZoom",
            severity: "error",
            message: "Minimum zoom cannot be larger than maximum zoom."
        });
    }
    return errors;
}
