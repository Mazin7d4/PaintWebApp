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
