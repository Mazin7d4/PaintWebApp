# ECLIPSE THIEF — Ep.01 "Borrowed Dawn" (production kit)

Everything is drawn in code and rendered locally on the CPU with the Paint Studio CLI. No image or video models are used.

## Status
| Scene | State |
|---|---|
| 01 Dead Sun (+ title card) | **rendered** (s01a–d, 13.2 s) |
| 04 Theft | **rendered** (s04a–f, 11.4 s) |
| 05 First impact | **rendered** (s05a–j, 12.6 s) |
| 06 Impossible enemy | **rendered** (s06a–f, 12.6 s) |
| 02, 03, 07–12 | not started (Sora rig, exterior bridge set and sunrise grade still to do) |

## Layout
- `lib/geom.mjs`: path builders (smooth, sharp-corner shapes, tapered limbs, cel-shade strips, strands, convex clipping)
- `lib/anim.mjs`: **key pose → key drawing baking**. Poses are inbetweened on 1s/2s/3s at 24 fps anime timing and stored in `ShapeObject.drawings`, so there is no per-frame tweening
- `lib/face.mjs`: reusable anime head (clipped iris/pupil/highlights, lash flick, brows, mouth shapes, tears, scratch, eye reflection)
- `lib/rin.mjs`, `lib/poses.mjs`: Rin's skeleton drawing (foreshortening, foot-contact `ground`, `spin`, hair/coat/ribbon secondary motion) plus the pose library (guard, antic, leap, slash, follow, dodge, block, thrown, down, kneel, rise, catch, hold, 4-drawing run cycle, mirror)
- `lib/warden.mjs`: the Warden (mask with slit eye, rotating inverted halo, segmented armor, void smoke body, torn cloth, claws, split/reform, wrist crack, dissolve)
- `lib/hands.mjs`: dedicated close-up drawing of the gloved grip on the dagger (grip, tremble, crack, three-shard shatter)
- `lib/env.mjs`, `lib/city.mjs`, `lib/props.mjs`: cathedral set (2.5D parallax layers, DOF foreground), cage + Sun Core, gothic city skyline, rail bridges, eclipse, shards, arch, foreground coat sweep
- `lib/fx.mjs`: focus/speed lines, impact frames (difference-invert + burst), flashes, slash/smear arcs, ballistic debris, cel smoke, light beams, glows, grade layers, vignette, ash particles, floor cracks, speech/thought bubbles
- `shots/sNN.mjs`: one function per shot; `build.mjs` writes `out/*.paint.json`
- `sheets/`: model sheets, expressions, pose library and environment sheet

## Build
```sh
node examples/eclipse-thief/build.mjs            # -> examples/eclipse-thief/out/*.paint.json (git-ignored, regenerable)
for f in examples/eclipse-thief/out/*.paint.json; do paint-studio render $f -o shots/$(basename $f .paint.json).mp4 --crf 18; done
paint-studio concat shots/*.mp4 -o eclipse-thief-ep01.mp4
node examples/eclipse-thief/sheets/render.mjs ./rin-sheet.mjs rinSheet /tmp/rin.json && paint-studio render /tmp/rin.json -o rin.png --format png
```

## v2 character drawing (default; `ECLIPSE_V1=1` renders the old v1 puppets)
- `lib/v2/person.mjs`: Rin/Sora drawer with the same pose API as v1. It adds organic chain limbs (deltoid/elbow/calf profiles with joint-volume bulge), `ik2` 2-bone IK (`handLT`/`footLT` targets), per-view torso, coat tails, deterministic fixed-step spring secondary motion (`secLock` override), and authored smears (`smearL/R`, `smearLegL/R`).
- `lib/v2/face2.mjs`: face key drawings for front, 3/4, side and back, with `EXPR` presets (determination, panic, realization, tenderness, smile, shock, calculation).
- `lib/v2/hair2.mjs`: locks on a 3D head sphere, projected by yaw and depth-sorted, with highlights and per-lock lag.
- `lib/v2/hands2.mjs`: hand presets (open, relaxed, fist, grip, point, reach, splayed) in back, palm and side views.
- `lib/v2/inkify.mjs`: upgrades the v1 Warden and close-up hands to ink lines and cel shading, and adds armour cracks.
- Engine: `stroke.taper/weight/boil` (variable-width ink ribbons), `cel` two-tone shading plus rim, and layer `light`/`rim`. CLI: `--post grain|glow|grain+glow`.
- Sheets: `node sheets/render.mjs ./v2-sheets.mjs turnaround|actionSheet|handsSheet|checkFace|checkBody|checkSora out.json`
- Benchmark: `shots/bench.mjs` (`sBench`).
