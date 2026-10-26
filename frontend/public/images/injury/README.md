# Horse reference cutout — v2

`horse-reference-cutout-v2.png` is a project-local RGBA PNG, 1448 × 1086 px.

Source: the standing bay horse photograph pasted by the user in this conversation on 26 October 2026. Processed with the built-in `image_gen` tool using that reference (transparent-background extraction/identity preservation). This is an AI-processed derivative, not a pixel-identical export of the original photograph and not a clinically validated anatomical atlas. No third-party image was downloaded or hotlinked.

The full ears, muzzle, tail and hooves remain in frame. Do not enlarge beyond the source resolution and claim added photographic detail. The current right view is explicitly a mirrored illustration of this single source; it is not a separate right-side photograph. The image and hit regions are calibrated together in `horseDiagram.js` with `diagramVersion = equi-horse-photo-v2`. Any new pose, crop, aspect ratio or region geometry requires recalibration and a new version.

The saved source file is consumed directly from `public/images/injury/`. The implementation uses one SVG with `preserveAspectRatio="xMidYMid meet"`, an alpha mask and an independent alpha hit map. No raster transformation is applied at runtime beyond proportional fit and the clearly labeled mirrored view.

## Image tool prompt

Use case: background-extraction. Asset type: local PNG cutout for Equi equine injury diagram. Edit target: the USER-UPLOADED standing bay horse with black halter, head pointing RIGHT, entire four legs down, tail on LEFT, originally shown against transparency/black (the first of the last three supplied images). The two other images (mountain horse banner and rearing horse illustration) are NOT targets, do not use them. Extract/reproduce ONLY that standing reference horse at high resolution with actual transparent alpha. Preserve its identity, natural photographic coat detail, black halter, stance, overall proportions and right-facing orientation. Entire head, both ears, muzzle, tail and ALL hooves must remain within frame, minimal even transparent margins. No stable/wall/scenery/background/shadow, no text/labels/markers, no illustration or polygon appearance, no additional objects or anatomy. Do not invent a new pose or enlarge a low-resolution thumbnail. Output one clean landscape canvas roughly 4:3 with a detailed photographic horse, for direct use as an asset; transparency is mandatory.
