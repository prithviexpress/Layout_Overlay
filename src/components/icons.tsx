import React, { ReactElement } from "react";

const PATHS: Record<string, string> = {
    left: "M2 1.5v13 M5 4h8 M5 9h5",
    centerX: "M8 1.5v13 M3.5 4h9 M5 9h6",
    right: "M14 1.5v13 M3 4h8 M6 9h5",
    top: "M1.5 2h13 M4 5v8 M9 5v5",
    middle: "M1.5 8h13 M4 3.5v9 M9 5v6",
    bottom: "M1.5 14h13 M4 3v8 M9 6v5",
    distH: "M2 2v12 M14 2v12 M6.5 5h3v6h-3z",
    distV: "M2 2h12 M2 14h12 M5 6.5v3h6v-3z"
};

export type IconKind = keyof typeof PATHS;

export function Icon({ kind }: { kind: IconKind }): ReactElement {
    return (
        <svg
            viewBox="0 0 16 16"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[kind]} />
        </svg>
    );
}
