// node sheets/render.mjs <module> <export> <out.json>
const [mod, fn, out] = process.argv.slice(2);
const m = await import(new URL(mod, import.meta.url));
(await import('node:fs')).writeFileSync(out, JSON.stringify(m[fn]()));
