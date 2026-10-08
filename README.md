# Layout Overlay (Mendix pluggable widget)

Draw clickable, draggable, editable **shape markers** at X/Y coordinates over a background layout image (floor plan, site map, warehouse). Every interaction can call a Mendix action.

## Data model
A marker entity with at least `X` and `Y` (Decimal/Integer). Optional attributes: `Shape`, `Color`, `Size`, `Rotation`, `Label`, `Tooltip`.

## Shapes
`Shape` attribute value:
- built-in name: `circle square triangle diamond star hexagon pin cross check warning thumbs-up thumbs-down`
- custom vector: `svg:<path d>` (drawn in a 24x24 viewBox)
- custom image: `url:<image url>`

## Events (Mendix actions)
| Property | When |
|---|---|
| On marker click | click / Enter on a marker (receives that marker object) |
| On marker double click | double click |
| On marker right click | context menu |
| On marker moved / changed | after X/Y (or inspector fields) were written to the object |
| On canvas click | edit mode, empty-space click; Clicked X/Y attributes are set first (use to create a marker) |

Dragging writes X/Y straight into the marker's attributes (they must be editable), then fires *On marker moved / changed* — commit the object there.

## If dragging doesn't save
Drag writes X/Y into the marker's attributes, which requires **write access** on those attributes (entity access rules; not calculated). If they are read-only the widget shows a warning. Fallback: set **Moved X / Moved Y (output)** to attributes on the page's context object. After a drag the widget writes the new coordinates there and fires *On marker moved / changed* (marker as context) — a microflow can then update the marker.

## Hover card and legend
- **Hover card → Title / Lines:** a title plus any number of lines, each a Mendix text template evaluated per marker (`Avg: {1} min  Util: {2}%`). Empty lines are hidden. Optional bold per line and a hover delay.
- **Legend → Legend items:** caption, color and shape per entry, shown above the canvas.

## Zoom and scroll
- **Ctrl + mouse wheel** zooms in/out around the cursor (Cmd on Mac); toolbar has − / + / Fit.
- Scroll and **Shift + scroll** pan; dragging empty space pans when not editing.
- **Marker scaling:** Fixed (pixel size), Smooth (grows with the square root of zoom, default) or Proportional (scales exactly with the plan).
- Properties: min / max / initial zoom %, max viewport height (0 = 80% of window).

## Multi-select and alignment (edit mode)
- **Box-select:** drag on empty space to draw a selection box; Shift/Ctrl+click adds or removes markers; Ctrl+A selects all; Esc clears. A plain click on empty space still fires *On canvas click*.
- **Group move:** drag any selected marker to move them all; arrow keys nudge the whole selection (Shift = x10).
- **Align / distribute** (toolbar): left / center / right (same X), top / middle / bottom (same Y, i.e. in a row), distribute horizontally / vertically (3+ markers).
- Group changes save **one marker at a time**: each marker triggers *On marker moved / changed* in turn (waiting for the previous call to finish), so a microflow never sees overlapping calls. Unchanged markers are not saved.

## Look and feel
- **Pulse (alert):** Boolean attribute → animated ring on that marker.
- **Show labels from zoom (%)** hides labels on a dense plan until you zoom in.
- Theme with CSS variables on the widget class: `--lo-accent`, `--lo-surface`, `--lo-border`, `--lo-radius`, ...

## Editing
Toggle **Edit**: drag markers, arrow keys nudge (Shift = x10), inspector changes X/Y/shape/color/size/label. Optional grid + snap.

## Build
```
npm install
npm run build   # -> dist/1.0.0/com.prithvi.LayoutOverlay.mpk
```
Drop the .mpk into your Mendix project's `widgets` folder.
