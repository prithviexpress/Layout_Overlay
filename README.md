# Layout Overlay (Mendix pluggable widget)

Draw clickable, draggable, editable **shape markers** at X/Y coordinates over a background layout image (floor plan, site map, warehouse). Every interaction can call a Mendix action.

## Data model
A marker entity with at least `X` and `Y` (Decimal/Integer). Optional attributes: `Shape`, `Color`, `Size`, `Rotation`, `Label`, `Tooltip`.

## Layouts: one picture per shop (PSL), switched by the drop-down
`PSL` (Location, Plant, Shop, Unloading_Location) is an Image entity, so each PSL record can hold its own layout picture. Configure **Layouts** and the drop-down becomes the layout switcher: exactly one shop is shown at a time (**no "All groups"**), and choosing a shop automatically switches the picture, the title and the bays.
1. **Layouts** data source: entity `PSL` (all PSLs the user may see, e.g. one plant). **Layout name** = `PSL.Shop`.
2. **Layout picture**: drop an Image widget into this slot, set it to *Dynamic image* from the PSL list item (the current object), width and height 100%.
3. **Layout title (expression)**: e.g. `'Truck Bay Status : ' + $currentObject/Location + ' | ' + $currentObject/Plant`.
4. **Markers** data source: entity `Bay` (all bays, or the bays of the plant); **Filter -> Group attribute** = `Bay.Shop`. Bays whose Shop equals the selected PSL's Shop are shown; the others are not drawn.
5. Each picture keeps its own proportions (never stretched); in Pixels mode X / Y are that picture's own pixels, in Percent mode 0-100.
6. **Security:** read access to `PSL` (including its image contents) for the user roles. Upload one picture per PSL on an admin page.
Without Layouts, **Filter** works as a plain group filter; turn **Offer "All" option** off to always show exactly one group.

## Shape and size sources
Both are resolved per marker in this order, so you can type a value, drive it from data, or compute it:
- **Shape:** *Shape attribute* → *Shape (expression)* → *Default shape* (a dropdown in the widget settings: truck, circle, square, triangle, diamond, star, hexagon, pin, cross, check, warning, thumbs up / down).
- **Size (px):** *Size attribute* → *Size (expression)* → *Default marker size* (typed manually). Expressions can use page variables and the marker's attributes. Zero, negative or empty values fall through to the next source.

## Shapes
`Shape` attribute value:
- built-in name: `truck circle square triangle diamond star hexagon pin cross check warning thumbs-up thumbs-down`
- custom vector: `svg:<path d>` (drawn in a 24x24 viewBox)
- custom image: `url:<image url>`

### Truck icon, fill, scale and orientation
- **`truck`** is a minimal top view of a tractor and trailer: two separate rounded shapes with a gap, a slim windshield, no wheels, heading right at 0°. Filled = solid, empty = outline. It is about 3:1 long, so its nominal width is 1.6 x the marker Size.
- **Occupancy** (any shape): Boolean `true`, or text `occupied / busy / yes / in use` → **solid line** in the marker's Color; `false`, or `available / empty / free / no` → **dotted line**. *Occupied style* switches occupied between a solid line (default) and a solid filled shape. When set, Occupancy wins over Fill; empty or unknown values fall back to Fill.
- **Fill** (any shape): Boolean `true`, or text `occupied / filled / yes / busy` → filled; `false`, or `available / empty / outline / no / free` → empty outline. *Default fill* applies when the value is missing. Color comes from the **Color** attribute.
- **Orientation:** degrees (0 = right/east, 90 = down/south, clockwise) or a name `N NE E SE S SW W NW` (also `up down left right`). **Angle offset** adds fine angles on top (e.g. 12.5).
- **Mirror** flips the icon left-right (mainly useful for custom side-view icons; for a top-view truck just use the orientation).
- **Scale** (uniform), **Scale X** and **Scale Y** (stretch) multiply the marker size. Legend entries can be filled, outline or dotted too.
- **Label orientation:** *Behind the truck rear* (default): for trucks the label sits directly behind the rear of the truck, on its axis, running away from it (never beside it, never towards the cab) and turned to stay readable; other shapes keep the label below. *Always upright* keeps it horizontal below the icon.
- **Label font** defaults to a clean system font (Segoe UI on Windows) with tabular digits; set *Label font* to override (installed or theme-loaded fonts only). Vertical labels use the browser's native vertical text and whole-pixel positions so they stay sharp.
- **Label corner radius (px)** (default 3): 0 = square corners; a very large value gives the old pill shape.
- **Label font size (px)** (default 12) is independent of how thin the icon is; the bubble is as thick as the truck but never thinner than the text needs. **Truck label text:** *Along the truck* (default, compact) or *Always horizontal* (easiest to read; the bubble can be wider than the truck and touches the truck's end).
- **Outline tint (%)** (default 14) fills the inside of empty / not-occupied icons with a pale tint of their color so they stay visible over a busy drawing.
- **Truck label side:** *Rear* (default) puts the label behind the container; *Cabin* puts it in front of the cab. Either way it is on the truck's axis, never beside it.
- **Truck label width:** *Exactly the truck's width* (default): the bubble is precisely as thick as the truck body and the text shrinks to fit (up to 90% of the thickness; use Size or Scale Y to make the truck thicker for larger text). *Truck's width, at least text height*: as thick as the truck but never thinner than the text needs. *Fit to text*: sized to its text.
- **Outline thickness (px):** line width of empty / not-occupied icons in screen pixels (default 2), constant regardless of scale or zoom. Dotted lines use dots of that width.

## Events (Mendix actions)
*Marker click, double click and right click run only while **Edit is off** (while editing a click just selects). Turn on **Fire click events while editing** to change that. **On marker moved / changed** only runs after a move or change made in edit mode.*

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
- **Toolbar:** one tidy row: shop drop-down and search on the left, the title in the middle, zoom (- / % / +, fit width, fit page as icons) and Edit on the right; the legend is a slim line below; align tools appear below only while editing. **Title:** from the selected layout, else the sources below (left, center or right of the bar). Three sources, first non-empty wins: *Title (expression)*, *Title (text template)*, *Title (plain text)*. Text templates are stored per language and only show for the language they were typed in, so if a title does not appear, use the plain text or expression.
- **Legend → Legend items:** up to **6** entries, each with its own caption, color and shape (Studio Pro flags more than 6).

## Filter: group drop-down and search
- **Group attribute** (e.g. `Shop`): adds a drop-down to the toolbar with *All groups* plus every distinct value (sorted naturally). Pick one to show only that group's markers.
- **Search box** (placeholder *Search bay...*): type to keep only markers whose label (e.g. `Bay_ID`), group (shop) or optional *Extra search attribute* contains the text; case-insensitive, Esc or × clears.
- Group and search combine (both must match). A `3 / 21` counter shows how many markers match.
- **Non-matching markers:** *Hide* removes them from the plan; *Dim* fades them and makes them unclickable. Markers keep their positions either way.
- In edit mode, select-all, box-select and align only touch the visible (matching) markers.

## Selection and hover
- A selected (clicked) marker gets a blue glow that follows the icon's own outline and rotation; there is no box or ring around it.
- Hover shows **one** thing: the hover card when *Hover card* is configured, otherwise the optional *Tooltip* attribute. The label is never repeated as a browser tooltip while it is visible.

## Zoom and scroll
- **Ctrl + mouse wheel** zooms in/out around the cursor (Cmd on Mac, or trackpad pinch); *Mouse wheel zoom = Wheel only* makes the wheel alone zoom (Shift+wheel scrolls sideways). Toolbar has − / + / Fit width / Fit page.
- **Middle mouse button** pans in any mode.
- Scroll and **Shift + scroll** pan; dragging empty space pans when not editing.
- **Marker scaling:** Proportional (default: icons and labels scale exactly with the plan), Smooth (grows with the square root of zoom) or Fixed (pixel size). Labels scale with the icons (0.75x to 3x of their base size).
- **Fit width** fills the widget width (scroll vertically if taller); **Fit page** shows the whole plan at once, even below the minimum zoom.
- Properties: min / max / initial zoom %, max viewport height (0 = 80% of window).

## Multi-select and alignment (edit mode)
- **Box-select:** drag on empty space to draw a selection box; Shift/Ctrl+click adds or removes markers; Ctrl+A selects all; Esc clears. A plain click on empty space still fires *On canvas click*.
- **Group move:** drag any selected marker to move them all; arrow keys nudge the whole selection (Shift = x10).
- **Align / distribute** (toolbar): left / center / right (same X), top / middle / bottom (same Y, i.e. in a row), distribute horizontally / vertically (3+ markers).
- Group changes save **one marker at a time**: each marker triggers *On marker moved / changed* in turn (waiting for the previous call to finish), so a microflow never sees overlapping calls. Unchanged markers are not saved.

## Look and feel
- **Pulse (alert):** Boolean attribute → animated ring on that marker.
- **Show labels from zoom (%)** hides labels on a dense plan until you zoom in.
- Label bubbles have a faint light-blue fill; override with `--lo-label-bg` / `--lo-label-border`.
- Theme with CSS variables on the widget class: `--lo-accent`, `--lo-surface`, `--lo-border`, `--lo-radius`, ...

## Who can edit
Set **Editing → Edit allowed (expression)** to a Boolean expression (for example an attribute on the page context that is true for administrators). The Edit button is shown only while it evaluates to true (hidden while loading or false); empty = everyone, as long as *Allow editing* is on. This only hides the UI: also check the user's role in the *On marker moved / changed* microflow. Alternative without an expression: place two widget instances in containers with *Visibility → module roles* (one with *Allow editing* on for admins, one off for everyone else).

## Editing
Toggle **Edit**: drag markers, arrow keys nudge (Shift = x10), inspector changes X/Y/shape/color/size/label. Optional grid + snap.

## Build
```
npm install
npm run build   # -> dist/1.0.0/com.prithvi.LayoutOverlay.mpk
```
Drop the .mpk into your Mendix project's `widgets` folder.
