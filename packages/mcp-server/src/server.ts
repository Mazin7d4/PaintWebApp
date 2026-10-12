import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  createEmptyProject,
  validateProject,
  generateProjectFromPrompt,
  type StylePresetId,
  type EditOp,
  applyOps,
  worldAabb,
  EDIT_OP_NAMES,
} from '@paint-studio/core';
import { spawn } from 'node:child_process';

function runPaintStudio(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const bin = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../cli/dist/bin.js');
    const child = spawn(process.execPath, [bin, ...args], { env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += String(d); });
    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

const server = new McpServer({
  name: 'paint-studio',
  version: '2.0.0',
});

server.tool(
  'paint_create_project',
  'Create a new Paint Studio .paint.json project file',
  {
    file: z.string().describe('Output path ending in .paint.json'),
    name: z.string().optional(),
    style: z.enum(['flat-vector', 'inked-cartoon', 'pixel-art', 'painterly', 'neon']).optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fps: z.number().optional(),
  },
  async ({ file, name, style, width, height, fps }) => {
    const project = createEmptyProject({
      name: name ?? 'Untitled',
      style: (style as StylePresetId | undefined) ?? 'inked-cartoon',
      width: width ?? 1080,
      height: height ?? 720,
      fps: fps ?? 12,
    });
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(file, JSON.stringify(project, null, 2) + '\n');
    return { content: [{ type: 'text', text: `Created ${file}` }] };
  },
);

server.tool(
  'paint_check_project',
  'Validate a Paint Studio project (schema + helpful issues)',
  {
    file: z.string(),
  },
  async ({ file }) => {
    const raw = JSON.parse(await readFile(file, 'utf8')) as unknown;
    const result = validateProject(raw);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
      isError: !result.ok,
    };
  },
);

server.tool(
  'paint_generate_animation',
  'Generate a .paint.json animation from a text prompt (template provider by default; optional LLM)',
  {
    prompt: z.string(),
    file: z.string().describe('Output .paint.json path'),
    style: z.enum(['flat-vector', 'inked-cartoon', 'pixel-art', 'painterly', 'neon']).optional(),
    provider: z.enum(['template', 'openai', 'anthropic', 'ollama']).optional(),
  },
  async ({ prompt, file, style, provider }) => {
    const project = await generateProjectFromPrompt({
      prompt,
      style: style as StylePresetId | undefined,
      provider: provider ?? 'template',
      apiKey: process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY,
    });
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(file, JSON.stringify(project, null, 2) + '\n');
    return { content: [{ type: 'text', text: `Wrote ${file} (${project.style?.id})` }] };
  },
);

server.tool(
  'paint_render',
  'Render a project to GIF or PNG via the Paint Studio CLI',
  {
    file: z.string(),
    out: z.string(),
    format: z.enum(['gif', 'png', 'png-sequence', 'spritesheet']).optional(),
  },
  async ({ file, out, format }) => {
    const result = await runPaintStudio(['render', file, '-o', out, '--format', format ?? 'gif']);
    return {
      content: [{ type: 'text', text: result.stdout || result.stderr }],
      isError: result.code !== 0,
    };
  },
);

server.tool(
  'paint_edit_project',
  `Apply edit ops to a .paint.json atomically (one failing op aborts all). Ops: ${EDIT_OP_NAMES.join(', ')}. ` +
    'Examples: {"op":"addObject","layerId":"L","object":{"type":"shape","shape":"ellipse","x":0,"y":0,"w":80,"h":80,"fill":{"color":"#FFD600"}}}, ' +
    '{"op":"setKeyframe","id":"ball","t":500,"transform":{"y":300,"scaleY":0.7},"easing":"easeOutBounce"}, ' +
    '{"op":"setTransform","id":"ball","transform":{"rotation":45}}, {"op":"setLayer","layerId":"L","props":{"opacity":0.5}}',
  {
    file: z.string(),
    ops: z.array(z.record(z.unknown())).describe('Array of edit ops ({ op: string, ... })'),
    out: z.string().optional().describe('Write to this path instead of in place'),
  },
  async ({ file, ops, out }) => {
    try {
      const project = JSON.parse(await readFile(file, 'utf8'));
      const { project: next, created } = applyOps(project, ops as unknown as EditOp[]);
      const result = validateProject(next);
      if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join('; '));
      await writeFile(out ?? file, JSON.stringify(next, null, 2) + '\n');
      return { content: [{ type: 'text', text: JSON.stringify({ applied: ops.length, created, wrote: out ?? file }) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: (err as Error).message }], isError: true };
    }
  },
);

server.tool(
  'paint_list_objects',
  'List layers and objects (ids, type, world bounds at a time, transform, keyframe times) so you can target edits',
  { file: z.string(), timeMs: z.number().optional() },
  async ({ file, timeMs }) => {
    const p = JSON.parse(await readFile(file, 'utf8'));
    const rows = (p.layers as { id: string; name: string; objects: Parameters<typeof worldAabb>[0][] }[]).map((l) => ({
      layer: { id: l.id, name: l.name },
      objects: l.objects.map((o) => ({ id: o.id, type: o.type, bounds: worldAabb(o, timeMs ?? 0), transform: o.transform ?? {}, keyframes: (o.keyframes ?? []).map((k) => k.t) })),
    }));
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
