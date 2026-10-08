import Big from "big.js";

// Heading of the unrotated icon is "right / east" = 0°, angles run clockwise (screen convention).
const COMPASS: Record<string, number> = {
    e: 0,
    east: 0,
    right: 0,
    se: 45,
    southeast: 45,
    s: 90,
    south: 90,
    down: 90,
    sw: 135,
    southwest: 135,
    w: 180,
    west: 180,
    left: 180,
    nw: 225,
    northwest: 225,
    n: 270,
    north: 270,
    up: 270,
    ne: 315,
    northeast: 315
};

/** Accepts degrees (number or "45", "45°") or a direction name (N, NE, east, up, ...). */
export function parseOrientation(v: string | Big | boolean | undefined | null): number {
    if (v === undefined || v === null || typeof v === "boolean") {
        return 0;
    }
    if (typeof v !== "string") {
        return Number(v.toString()) || 0;
    }
    const t = v
        .trim()
        .toLowerCase()
        .replace(/°|deg$/g, "")
        .replace(/[\s\-_]/g, "");
    if (t === "") {
        return 0;
    }
    const n = Number(t);
    return Number.isNaN(n) ? COMPASS[t] ?? 0 : n;
}

export function parseBool(v: string | Big | boolean | undefined | null): boolean {
    if (typeof v === "boolean") {
        return v;
    }
    return /^(true|yes|y|1|on|mirror|mirrored|flip|flipped)$/i.test(String(v ?? "").trim());
}

const FILLED = /^(filled|fill|occupied|busy|inuse|in use|active|docked|full|loaded|yes|true|1|on)$/i;
const EMPTY = /^(empty|outline|outlined|hollow|available|free|vacant|idle|no|false|0|off|none)$/i;

/** Boolean true / "occupied" / "filled" → filled; false / "available" / "empty" → outline; otherwise fallback. */
export function parseFilled(v: string | Big | boolean | undefined | null, fallback: boolean): boolean {
    if (typeof v === "boolean") {
        return v;
    }
    const t = String(v ?? "").trim();
    if (FILLED.test(t)) {
        return true;
    }
    if (EMPTY.test(t)) {
        return false;
    }
    return fallback;
}

export const positiveNum = (v: Big | undefined | null, fallback = 1): number => {
    const n = v ? Number(v.toString()) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** true / false when the value clearly says occupied / not occupied, undefined when empty or unknown. */
export function parseOccupancy(v: string | Big | boolean | undefined | null): boolean | undefined {
    if (typeof v === "boolean") {
        return v;
    }
    const t = String(v ?? "").trim();
    if (FILLED.test(t)) {
        return true;
    }
    if (EMPTY.test(t)) {
        return false;
    }
    return undefined;
}
