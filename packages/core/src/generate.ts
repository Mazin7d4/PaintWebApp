import {
  createEmptyProject,
  sampleCubicBezier,
  strokeFromPolyline,
  uid,
  type PaintProject,
  type StylePresetId,
} from './index.js';

export type LlmProvider = 'openai' | 'anthropic' | 'ollama' | 'template';

export interface GenerateOptions {
  prompt: string;
  provider?: LlmProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  style?: StylePresetId;
}

/**
 * Optional prompt→animation path.
 * Default `template` provider is deterministic (no network) and always works.
 * OpenAI-compatible / Anthropic / Ollama ask the model for JSON ops; we validate and assemble.
 */
export async function generateProjectFromPrompt(opts: GenerateOptions): Promise<PaintProject> {
  const provider = opts.provider ?? (opts.apiKey ? 'openai' : 'template');
  if (provider === 'template') {
    return templateFromPrompt(opts.prompt, opts.style);
  }

  const system = `You are Paint Studio. Reply with ONLY compact JSON describing animation ops.
Schema: {"style":"inked-cartoon"|"neon"|"flat-vector"|"pixel-art"|"painterly","title":string,"objects":Array<
  | {"kind":"ball","color":string}
  | {"kind":"logo","text":string}
  | {"kind":"neon","text":string}
>}. No markdown.`;

  const user = opts.prompt;
  let raw: string;
  if (provider === 'openai') {
    raw = await chatOpenAI(opts, system, user);
  } else if (provider === 'anthropic') {
    raw = await chatAnthropic(opts, system, user);
  } else {
    raw = await chatOllama(opts, system, user);
  }

  try {
    const parsed = JSON.parse(stripFences(raw)) as {
      style?: StylePresetId;
      title?: string;
      objects?: Array<{ kind: string; color?: string; text?: string }>;
    };
    const style = parsed.style ?? opts.style ?? guessStyle(opts.prompt);
    const project = createEmptyProject({
      name: parsed.title ?? truncate(opts.prompt, 48),
      width: 640,
      height: 360,
      fps: 24,
      style,
    });
    project.frames[0].duration = 1800;
    project.meta = { description: `Generated from prompt: ${opts.prompt}`, tags: ['generated'] };
    for (const obj of parsed.objects ?? [{ kind: 'logo', text: 'PS' }]) {
      if (obj.kind === 'ball') addBall(project, obj.color ?? '#1A1A1A');
      else if (obj.kind === 'neon') addNeonTitle(project, obj.text ?? 'NEON');
      else addInkLogo(project, obj.text ?? 'PS');
    }
    if ((parsed.objects ?? []).length === 0) addInkLogo(project, 'PS');
    return project;
  } catch {
    return templateFromPrompt(opts.prompt, opts.style);
  }
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

function guessStyle(prompt: string): StylePresetId {
  const p = prompt.toLowerCase();
  if (p.includes('neon') || p.includes('glow')) return 'neon';
  if (p.includes('pixel')) return 'pixel-art';
  if (p.includes('paint') || p.includes('landscape')) return 'painterly';
  if (p.includes('ball') || p.includes('squash')) return 'flat-vector';
  return 'inked-cartoon';
}

function templateFromPrompt(prompt: string, style?: StylePresetId): PaintProject {
  const s = style ?? guessStyle(prompt);
  const project = createEmptyProject({
    name: truncate(prompt, 48),
    width: 640,
    height: 360,
    fps: 24,
    style: s,
  });
  project.frames[0].duration = 1800;
  project.meta = { description: `Template generation for: ${prompt}`, tags: ['generated', 'template'] };
  const p = prompt.toLowerCase();
  if (p.includes('ball') || p.includes('bounce') || p.includes('squash')) addBall(project, '#1A1A1A');
  else if (s === 'neon' || p.includes('neon')) addNeonTitle(project, extractTitle(prompt));
  else addInkLogo(project, extractTitle(prompt));
  return project;
}

function extractTitle(prompt: string): string {
  const m = prompt.match(/["']([^"']+)["']/);
  if (m) return m[1].slice(0, 12);
  const words = prompt.split(/\s+/).filter(Boolean);
  return (words[0] ?? 'PS').slice(0, 8).toUpperCase();
}

function addBall(project: PaintProject, color: string): void {
  const layer = project.layers[0];
  layer.objects.push({
    type: 'shape',
    id: uid('floor'),
    shape: 'rect',
    x: 40,
    y: 300,
    w: 560,
    h: 14,
    fill: { color: project.palette[0]?.hex ?? '#1A1A1A' },
  });
  layer.objects.push({
    type: 'shape',
    id: uid('ball'),
    shape: 'ellipse',
    x: -36,
    y: -36,
    w: 72,
    h: 72,
    fill: { color },
    shadow: { color: 'rgba(0,0,0,0.25)', blur: 10, offsetX: 0, offsetY: 6 },
    transform: { x: 320, y: 100 },
    keyframes: [
      { t: 0, transform: { x: 320, y: 90, scaleX: 0.85, scaleY: 1.2 }, easing: 'easeInCubic' },
      { t: 300, transform: { x: 320, y: 270, scaleX: 1.4, scaleY: 0.55 }, easing: 'easeOutCubic' },
      { t: 700, transform: { x: 320, y: 110, scaleX: 0.9, scaleY: 1.15 }, easing: 'easeInCubic' },
      { t: 1100, transform: { x: 320, y: 270, scaleX: 1.35, scaleY: 0.6 }, easing: 'easeOutCubic' },
      { t: 1800, transform: { x: 320, y: 90, scaleX: 0.85, scaleY: 1.2 }, easing: 'easeOutCubic' },
    ],
  });
}

function addInkLogo(project: PaintProject, text: string): void {
  const layer = project.layers[0];
  const points = strokeFromPolyline([
    { x: 180, y: 260 },
    { x: 200, y: 120 },
    { x: 280, y: 140 },
    { x: 300, y: 200 },
    { x: 220, y: 210 },
  ]);
  const curve = sampleCubicBezier(
    { x: 340, y: 130, p: 0.3 },
    { x: 420, y: 80, p: 0.9 },
    { x: 400, y: 240, p: 0.9 },
    { x: 480, y: 270, p: 0.25 },
    28,
  );
  layer.objects.push({
    type: 'stroke',
    id: uid('ink1'),
    writeOnMs: 700,
    brush: {
      kind: 'ink',
      size: 14,
      color: '#1A1A1A',
      opacity: 1,
      pressureWidth: 0.85,
      smoothing: 3,
      taper: 0.35,
    },
    points,
  });
  layer.objects.push({
    type: 'stroke',
    id: uid('ink2'),
    writeOnMs: 900,
    brush: {
      kind: 'ink',
      size: 12,
      color: '#1A1A1A',
      opacity: 1,
      pressureWidth: 0.9,
      smoothing: 3,
      taper: 0.4,
    },
    points: curve,
  });
  layer.objects.push({
    type: 'text',
    id: uid('label'),
    text: text.toUpperCase(),
    x: 320,
    y: 330,
    fontSize: 22,
    fontWeight: 800,
    align: 'center',
    fill: { color: '#1A1A1A' },
    keyframes: [
      { t: 0, transform: { opacity: 0 }, easing: 'easeOutCubic' },
      { t: 900, transform: { opacity: 1 }, easing: 'easeOutCubic' },
    ],
  });
}

function addNeonTitle(project: PaintProject, text: string): void {
  const layer = project.layers[0];
  layer.objects.push({
    type: 'particles',
    id: uid('sparks'),
    x: 320,
    y: 180,
    count: 40,
    life: 900,
    spread: 360,
    speed: 120,
    size: 3,
    color: '#FAD400',
    gravity: 30,
    seed: 3,
  });
  layer.objects.push({
    type: 'shape',
    id: uid('ring'),
    shape: 'ellipse',
    x: 220,
    y: 80,
    w: 200,
    h: 200,
    stroke: { color: '#FAD400', width: 6 },
    shadow: { color: '#FAD400', blur: 20, offsetX: 0, offsetY: 0 },
    keyframes: [
      { t: 0, transform: { scaleX: 0.85, scaleY: 0.85, opacity: 0.7 }, easing: 'easeOutCubic' },
      { t: 900, transform: { scaleX: 1.1, scaleY: 1.1, opacity: 1 }, easing: 'easeInOutCubic' },
      { t: 1800, transform: { scaleX: 0.85, scaleY: 0.85, opacity: 0.7 }, easing: 'easeInOutCubic' },
    ],
  });
  layer.objects.push({
    type: 'text',
    id: uid('neon'),
    text: text.toUpperCase(),
    x: 320,
    y: 195,
    fontSize: 56,
    fontWeight: 900,
    align: 'center',
    fill: { color: '#FFFFFF' },
    shadow: { color: '#00F0FF', blur: 16, offsetX: 0, offsetY: 0 },
  });
}

async function chatOpenAI(opts: GenerateOptions, system: string, user: string): Promise<string> {
  const base = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const key = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY (or --api-key) required for openai provider');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI-compatible error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

async function chatAnthropic(opts: GenerateOptions, system: string, user: string): Promise<string> {
  const key = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY (or --api-key) required for anthropic provider');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text ?? '';
}

async function chatOllama(opts: GenerateOptions, system: string, user: string): Promise<string> {
  const base = (opts.baseUrl ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? 'llama3.2',
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? '';
}
