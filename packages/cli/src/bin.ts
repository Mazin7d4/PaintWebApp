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
} from '@paint-studio/core';
import { renderGif, renderPngSequence, renderSpriteSheet, renderStill } from './render.js';

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
  .command('render')
  .description('Render PNG still, PNG sequence, GIF, or sprite sheet')
  .argument('<file>', 'project JSON')
  .option('-o, --out <path>', 'output file or directory', 'out.gif')
  .option('--format <fmt>', 'gif | png | png-sequence | spritesheet', 'gif')
  .option('--fps <fps>', 'override export fps')
  .option('--time <ms>', 'time for single PNG still', '0')
  .option('--columns <n>', 'spritesheet columns', '4')
  .action(async (file: string, opts) => {
    const project = await loadProject(file);
    const fps = opts.fps ? Number(opts.fps) : project.fps;
    const fmt = opts.format as string;
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
    } else {
      throw new Error(`Unknown format: ${fmt}`);
    }
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
