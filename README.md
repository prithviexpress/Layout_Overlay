# Layout Overlay (Mendix pluggable widget)

Draw clickable, draggable, editable **shape markers** at X/Y coordinates over a background layout image (floor plan, site map, warehouse). Every interaction can call a Mendix action.

## Data model
A marker entity with at least `X` and `Y` (Decimal/Integer). Optional attributes: `Shape`, `Color`, `Size`, `Rotation`, `Label`, `Tooltip`.

## Layouts: one picture per shop (PSL), switched by the drop-down
`PSL` (Location, Plant, Shop, Unloading_Location) is an Image entity, so each PSL record holds its own layout picture. Configure **Layouts** and the drop-down becomes the layout switcher: exactly one layout is shown at a time (**no "All groups"**), and choosing one automatically switches the picture, the title and the bays.
1. **Layouts** data source: entity `PSL`. **Layout name** = e.g. `PSL.Location`; optional **Drop-down text (expression)**.
2. **Picture: nothing to place.** With *Use the layout's own picture* on (default) the widget loads the selected PSL's picture itself from the server (it is served at the object's file URL, via `mx.data.getDocumentUrl` when the client offers it, otherwise `/file?guid=<id>`). Needs: the entity is a specialization of System.Image, a picture is uploaded, and the user's role can read it. If it cannot be loaded the widget says so and shows the Canvas *Background image* instead. Optional **Picture version (date)** reloads the picture when it is replaced during a session.
3. *(Optional override)* **Layout picture** slot: an Image widget placed there takes precedence over the automatic picture.
4. **Layout title (expression)**, **Title size (px)** (default 22).
5. **Markers** data source: entity `Bay` (all bays). **Marker -> layout association** = `Bay_PSL`: the selected PSL shows exactly the bays linked to it. (Without it, bays are matched by comparing **Filter -> Group attribute** with the layout name.) Widgets receive objects reached through an association only as ids, so X, Y and the label still come from the Bay list.
6. Each picture keeps its own proportions (never stretched); in Pixels mode X / Y are that picture's own pixels, in Percent mode 0-100.
Without Layouts, **Filter** works as a plain group filter; turn **Offer "All" option** off to always show exactly one group.

## Rotating markers (edit mode)
Select one or more markers and use the **Rotate** buttons (or **R** = clockwise, **Shift+R** = counter-clockwise); *Rotate step* sets the angle per click (default 90). The new orientation shows immediately and is saved like a move:
- If the marker's own *Orientation* attribute is a numeric, editable attribute it is written directly.
- Otherwise (e.g. a text `BayDirection`, or read-only attributes) set **Editing -> Moved angle (output)** (degrees, 0 = east, clockwise) and/or **Moved direction (output)** (text: E, SE, S, SW, W, NW, N, NE). The widget then calls *On marker moved / changed* with **X, Y, angle and direction all set**, so a microflow that copies them onto the Bay can never write a stale position or orientation.

## Changing icons (edit mode)
Select markers and use the **Icon** drop-down in the edit row (also in the inspector for a single marker). The new icon shows immediately and is saved like a move: set **Editing -> Moved shape (output)** to a String attribute of the page's temp object; the widget fills it with the icon name (e.g. `dock-leveler`) and calls *On marker moved / changed*, and your microflow copies it onto the Bay's shape when it is not empty (empty = icon unchanged). If the marker's *Shape* attribute is editable it is written directly. **Icons offered in edit mode** limits the list (e.g. `truck, dock-leveler, manual-trolley`); if the Shape attribute is an enumeration, list only names that exist in it.

## Layout picture: which source wins
With **Layouts** configured the picture is chosen in this order: a widget in the *Layout picture* slot, then the selected layout's own picture loaded from the server, then the Canvas tab's **Background image** (also used when no Layouts are configured).

## Selection and hover
- A selected (clicked) marker gets a black outline with a white halo that follows the icon's own shape and rotation; no colour, no box or ring around it. Label bubbles are black with white text.
- The hover card is only drawn when it has content (no empty bubble). Hover shows **one** thing: the hover card when *Hover card* is configured, otherwise the optional *Tooltip* attribute. The label is never repeated as a browser tooltip while it is visible.

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
