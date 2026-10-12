# Episode 01 — "My Senpai Is Mine!!" (Operation Lunch Box)

An 86 s yandere-comedy short (1280x720 @ 60 fps), 100% procedural: no image or video models, no GPU.

- `lib.mjs`: palette, shape helpers, `rig()` (pivot-shared character groups with drawing swaps)
- `characters.mjs`: Hana and Taro rigs, speech bubbles, sweat drops, hearts
- `kit.mjs`: rooftop parallax set, speed/focus lines, camera shake, tints, captions
- `scenes1.mjs`, `scenes2.mjs`: the 7 scenes; `build.mjs` writes `scene0..6.paint.json`

```sh
node examples/episode-01/build.mjs
for i in 0 1 2 3 4 5 6; do paint-studio render examples/episode-01/scene$i.paint.json -o s$i.mp4; done
paint-studio concat s0.mp4 s1.mp4 s2.mp4 s3.mp4 s4.mp4 s5.mp4 s6.mp4 -o episode-01.mp4
paint-studio render examples/episode-01/scene4.paint.json --from 3000 --to 8000 -o teaser.webm
```
