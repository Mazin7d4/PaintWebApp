// node examples/eclipse-thief/build.mjs [filter]  -> writes shots/*.paint.json
import { writeFileSync, mkdirSync } from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
const mods = ['s01', 's04', 's05', 's06'];
const only = process.argv[2];
mkdirSync(dir + 'out', { recursive: true });
for (const m of mods) {
  let mod; try { mod = await import(`./shots/${m}.mjs`); } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND' && !String(e.message).includes('lib/')) continue; throw e; }
  for (const [name, fn] of Object.entries(mod)) {
    if (!/^s\d\d[a-z]$/.test(name) || (only && !name.startsWith(only))) continue;
    const p = fn();
    writeFileSync(`${dir}out/${name}.paint.json`, JSON.stringify(p));
    console.log(name, (p.frames[0].duration / 1000).toFixed(2) + 's');
  }
}
