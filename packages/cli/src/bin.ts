import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import {
  createEmptyProject,
  validateProject,
  projectToHyperframesHtml,
  projectDurationMs,
  HYPERFRAMES_INTEROP,
  generateProjectFromPrompt,
  type PaintProject,
  type StylePresetId,
  type LlmProvider,
  applyOps,
  worldAabb,
  EDIT_OP_NAMES,
  type EditOp,
} from '@paint-studio/core';
import { concatVideos, renderGif, renderPngSequence, renderSpriteSheet, renderStill, renderVideo } from './render.js';

async function loadProject(file: string): Promise<PaintProject> {
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw) as unknown;
  const result = validateProject(data);
  if (!result.ok) {
    const msg = result.errors.map((e) => `  error ${e.path}: ${e.message}`).join('\n');
    throw new Error(`Invalid project ${file}:\n${msg}`);
  }
  for (const w of result.warnings) {
    console.warn(`  warning ${w.path}: ${w.message}`);
  }
  return data as PaintProject;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

const program = new Command();
program
  .name('paint-studio')
  .description('Paint Studio CLI — agent-friendly animation create / check / render')
  .version('2.0.0');

program
  .command('create')
  .description('Create a new .paint.json project')
  .argument('[file]', 'output file', 'project.paint.json')
  .option('-n, --name <name>', 'project name', 'Untitled')
  .option('-w, --width <px>', 'width', '1080')
  .option('-h, --height <px>', 'height', '720')
  .option('--fps <fps>', 'frames per second', '12')
  .option('-s, --style <preset>', 'style preset', 'inked-cartoon')
  .action(async (file: string, opts) => {
    const project = createEmptyProject({
      name: opts.name,
      width: Number(opts.width),
      height: Number(opts.height),
      fps: Number(opts.fps),
      style: opts.style as StylePresetId,
    });
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(file, JSON.stringify(project, null, 2) + '\n');
    console.log(`Created ${file} (${project.width}x${project.height} @ ${project.fps}fps, style=${project.style?.id})`);
  });

program
  .command('check')
  .alias('validate')
  .description('Validate a project file (agent lint loop — inspired by Hyperframes check)')
  .argument('<file>', 'project JSON')
  .action(async (file: string) => {
    const raw = JSON.parse(await readFile(file, 'utf8')) as unknown;
    const result = validateProject(raw);
    for (const w of result.warnings) console.warn(`warning ${w.path}: ${w.message}`);
    for (const e of result.errors) console.error(`error ${e.path}: ${e.message}`);
    if (!result.ok) {
      console.error(`FAIL ${file}`);
      process.exitCode = 1;
      return;
    }
    const p = raw as PaintProject;
    console.log(`OK ${file} — ${p.width}x${p.height}, ${p.layers.length} layers, ${p.frames.length} frames, ${projectDurationMs(p)}ms`);
  });

program
  .command('info')
  .description('Print project summary')
  .argument('<file>', 'project JSON')
  .action(async (file: string) => {
    const p = await loadProject(file);
    console.log(JSON.stringify({
      name: p.name,
      size: `${p.width}x${p.height}`,
      fps: p.fps,
      durationMs: projectDurationMs(p),
      style: p.style?.id,
      layers: p.layers.map((l) => ({ id: l.id, name: l.name, objects: l.objects.length })),
      frames: p.frames.length,
      palette: p.palette.map((c) => c.hex),
    }, null, 2));
  });

program
  .command('edit')
  .description('Apply JSON edit ops (objects, transforms, keyframes, layers, frames) atomically')
  .argument('<file>', 'project JSON')
  .option('--ops <path>', 'JSON file containing an array of ops (use - for stdin)')
  .option('--op <json...>', 'inline op JSON, repeatable')
  .option('-o, --out <path>', 'write result here instead of in place')
  .option('--dry-run', 'validate and print the result summary without writing')
  .action(async (file: string, opts) => {
    const project = await loadProject(file);
    let ops: EditOp[] = [];
    if (opts.ops) {
      const raw = opts.ops === '-' ? await readStdin() : await readFile(opts.ops, 'utf8');
      const parsed = JSON.parse(raw) as EditOp[] | { ops: EditOp[] };
      ops = ops.concat(Array.isArray(parsed) ? parsed : parsed.ops);
    }
    for (const o of (opts.op as string[] | undefined) ?? []) ops.push(JSON.parse(o) as EditOp);
    if (ops.length === 0) throw new Error(`No ops given. Use --ops file.json or --op '{"op":"..."}'. Ops: ${EDIT_OP_NAMES.join(', ')}`);
    const { project: next, created } = applyOps(project, ops);
    const result = validateProject(next);
    if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
    if (!opts.dryRun) await writeFile(opts.out ?? file, JSON.stringify(next, null, 2) + '\n');
    console.log(JSON.stringify({ applied: ops.length, created, wrote: opts.dryRun ? null : opts.out ?? file }));
  });

program
  .command('objects')
  .alias('ls')
  .description('List layers and objects with ids, keyframe times and world bounds at a time')
  .argument('<file>', 'project JSON')
  .option('--time <ms>', 'time to measure bounds at', '0')
  .action(async (file: string, opts) => {
    const p = await loadProject(file);
    const t = Number(opts.time);
    const rows = p.layers.map((l) => ({
      layer: { id: l.id, name: l.name, visible: l.visible, locked: !!l.locked, opacity: l.opacity },
      objects: l.objects.map((o) => {
        const b = worldAabb(o, t);
        return {
          id: o.id,
          type: o.type,
          bounds: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) },
          transform: o.transform ?? {},
          keyframes: (o.keyframes ?? []).map((k) => k.t),
        };
      }),
    }));
    console.log(JSON.stringify(rows, null, 2));
  });

program
  .command('render')
  .description('Render PNG still, PNG sequence, GIF, or sprite sheet')
  .argument('<file>', 'project JSON')
  .option('-o, --out <path>', 'output file or directory', 'out.gif')
  .option('--format <fmt>', 'gif | png | png-sequence | spritesheet | mp4 | webm (default: from --out extension, else gif)')
  .option('--scale <k>', 'video output scale relative to project size', '1')
  .option('--crf <n>', 'video quality (lower = better)')
  .option('--post <fx>', 'video post pass: grain | glow | grain+glow | raw ffmpeg filter graph')
  .option('--from <ms>', 'video: start time')
  .option('--to <ms>', 'video: end time')
  .option('--fps <fps>', 'override export fps')
  .option('--time <ms>', 'time for single PNG still', '0')
  .option('--columns <n>', 'spritesheet columns', '4')
  .action(async (file: string, opts) => {
    const project = await loadProject(file);
    const fps = opts.fps ? Number(opts.fps) : project.fps;
    const ext = path.extname(opts.out as string).slice(1).toLowerCase();
    const fmt = (opts.format as string | undefined) ?? (['mp4', 'webm', 'gif', 'png'].includes(ext) ? ext : 'gif');
    const out = opts.out as string;
    console.log(`Rendering ${project.name} → ${out} (${fmt}) @ ${fps}fps`);
    if (fmt === 'gif') {
      const f = await renderGif(project, out, fps);
      console.log(`Wrote ${f}`);
    } else if (fmt === 'png') {
      const f = await renderStill(project, out, Number(opts.time));
      console.log(`Wrote ${f}`);
    } else if (fmt === 'png-sequence') {
      const files = await renderPngSequence(project, out, fps);
      console.log(`Wrote ${files.length} frames to ${out}`);
    } else if (fmt === 'spritesheet') {
      const f = await renderSpriteSheet(project, out, fps, Number(opts.columns));
      console.log(`Wrote ${f}`);
    } else if (fmt === 'mp4' || fmt === 'webm') {
      const target = out.toLowerCase().endsWith(`.${fmt}`) ? out : `${out}.${fmt}`;
      let last = 0;
      const f = await renderVideo(project, target, {
        fps,
        scale: Number(opts.scale),
        crf: opts.crf ? Number(opts.crf) : undefined,
        post: opts.post,
        fromMs: opts.from ? Number(opts.from) : undefined,
        toMs: opts.to ? Number(opts.to) : undefined,
        onProgress: (d, n) => {
          const pct = Math.floor((d / n) * 10);
          if (pct > last || d === n) { last = pct; process.stderr.write(`  ${d}/${n} frames\n`); }
        },
      });
      console.log(`Wrote ${f}`);
    } else {
      throw new Error(`Unknown format: ${fmt}`);
    }
  });

program
  .command('concat')
  .description('Concatenate rendered MP4/WebM clips (same size/fps/codec) into one video without re-encoding')
  .argument('<inputs...>', 'video files in order')
  .requiredOption('-o, --out <path>', 'output video')
  .action(async (inputs: string[], opts) => {
    console.log(`Wrote ${await concatVideos(inputs, opts.out)}`);
  });

program
  .command('export-hyperframes')
  .description('Emit an HTML composition stub for Hyperframes MP4 pipelines (interop, no vendored code)')
  .argument('<file>', 'project JSON')
  .option('-o, --out <path>', 'output HTML', 'hyperframes-export.html')
  .action(async (file: string, opts) => {
    const project = await loadProject(file);
    const html = projectToHyperframesHtml(project);
    await writeFile(opts.out, html);
    console.log(`Wrote ${opts.out}`);
    console.log('Interop notes:');
    for (const a of HYPERFRAMES_INTEROP.adopted) console.log(`  + ${a}`);
  });

program
  .command('generate')
  .description('Generate a .paint.json animation from a text prompt (LLM-agnostic; template provider needs no key)')
  .argument('<prompt>', 'natural language prompt')
  .option('-o, --out <file>', 'output project', 'generated.paint.json')
  .option('-s, --style <preset>', 'style preset override')
  .option('--provider <name>', 'template | openai | anthropic | ollama', 'template')
  .option('--api-key <key>', 'API key (or use OPENAI_API_KEY / ANTHROPIC_API_KEY)')
  .option('--base-url <url>', 'OpenAI-compatible or Ollama base URL')
  .option('--model <model>', 'model id')
  .action(async (prompt: string, opts) => {
    const project = await generateProjectFromPrompt({
      prompt,
      style: opts.style as StylePresetId | undefined,
      provider: opts.provider as LlmProvider,
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      model: opts.model,
    });
    const result = validateProject(project);
    if (!result.ok) throw new Error(result.errors.map((e) => e.message).join('; '));
    await mkdir(path.dirname(path.resolve(opts.out)), { recursive: true });
    await writeFile(opts.out, JSON.stringify(project, null, 2) + '\n');
    console.log(`Wrote ${opts.out} (style=${project.style?.id}, provider=${opts.provider})`);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
