## Problem
The map country outlines for highlighted/focus countries currently use `#1a1a1a` (near-black) at `1.5px` width. The user reports the outline does not look fully black and well-defined.

## Change
In `src/components/WorldMap.tsx` (around line 151), update the focused-country stroke styling:
- Change `stroke` from `"#1a1a1a"` to `"#000000"` (pure black).
- Increase `strokeWidth` from `1.5` to `2` for a sharper, more visible outline.
- Keep `vectorEffect: "non-scaling-stroke"`, `strokeLinejoin: "round"`, and `strokeLinecap: "round"` so the line stays crisp at all zoom levels.

## Verification
Open the preview, hover or view any highlighted country (e.g., Guatemala), and confirm the border is a solid, pure black line with no gaps or fading.