/** Paint Studio project format v2 — shared by editor, CLI, and agents. */

export type BlendMode =
  | 'source-over'
  | 'destination-out'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeOutElastic'
  | 'easeOutBounce';

export type BrushKind =
  | 'ink'
  | 'pencil'
  | 'marker'
  | 'airbrush'
  | 'charcoal'
  | 'neon'
  | 'watercolor';

export type StylePresetId =
  | 'flat-vector'
  | 'inked-cartoon'
  | 'pixel-art'
  | 'painterly'
  | 'neon';

export interface Vec2 {
  x: number;
  y: number;
}

export interface ColorStop {
  offset: number;
  color: string;
}

export interface GradientFill {
  type: 'linear' | 'radial';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: ColorStop[];
}

export interface ShadowStyle {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface StrokeStyle {
  color: string;
  width: number;
  opacity?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  dash?: number[];
}

export interface FillStyle {
  color?: string;
  gradient?: GradientFill;
  opacity?: number;
}

export interface Transform2D {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
}

export interface Keyframe {
  /** Time in milliseconds from project start */
  t: number;
  transform: Partial<Transform2D>;
  easing?: EasingName;
}

export interface StrokePoint {
  x: number;
  y: number;
  /** 0–1 pressure; defaults to 0.5 */
  p?: number;
  /** Optional velocity hint for width modulation */
  v?: number;
}

export interface BrushSettings {
  kind: BrushKind;
  size: number;
  color: string;
  opacity: number;
  /** How strongly pressure affects width (0–1) */
  pressureWidth?: number;
  /** How strongly pressure affects opacity (0–1) */
  pressureOpacity?: number;
  /** Catmull-Rom / Chaikin smoothing passes */
  smoothing?: number;
  /** Taper start/end of stroke (0–1 of length) */
  taper?: number;
  /** Softness for airbrush/watercolor (0–1) */
  softness?: number;
  /** Spacing for stamp brushes as fraction of size */
  spacing?: number;
  blendMode?: BlendMode;
}

/** Expressive vector stroke — preferred agent authoring primitive */
export interface StrokeObject {
  type: 'stroke';
  id: string;
  brush: BrushSettings;
  points: StrokePoint[];
  /** 0–1 reveal progress for write-on animation */
  reveal?: number;
  /** If set, reveal animates 0→1 over this many ms from t=0 (or object start) */
  writeOnMs?: number;
  transform?: Partial<Transform2D>;
  keyframes?: Keyframe[];
}

export interface ShapeObject {
  type: 'shape';
  id: string;
  shape: 'rect' | 'ellipse' | 'line' | 'polygon' | 'path';
  /** Geometry in local space before transform */
  x: number;
  y: number;
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  r?: number;
  points?: Vec2[];
  path?: string;
  fill?: FillStyle;
  stroke?: StrokeStyle;
  shadow?: ShadowStyle;
  cornerRadius?: number;
  transform?: Partial<Transform2D>;
  keyframes?: Keyframe[];
}

export interface TextObject {
  type: 'text';
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fill?: FillStyle;
  stroke?: StrokeStyle;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  shadow?: ShadowStyle;
  letterSpacing?: number;
  transform?: Partial<Transform2D>;
  keyframes?: Keyframe[];
}

export interface ParticleEmitterObject {
  type: 'particles';
  id: string;
  x: number;
  y: number;
  count: number;
  life: number;
  spread: number;
  speed: number;
  size: number;
  color: string;
  gravity?: number;
  /** Seed for deterministic particle placement */
  seed?: number;
  transform?: Partial<Transform2D>;
  keyframes?: Keyframe[];
}

export type DrawObject = StrokeObject | ShapeObject | TextObject | ParticleEmitterObject;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  opacity: number;
  blendMode: BlendMode;
  objects: DrawObject[];
}

export interface Frame {
  id: string;
  name?: string;
  /** Duration in milliseconds */
  duration: number;
  /** Optional onion / hold note */
  label?: string;
}

export interface PaletteColor {
  id: string;
  name?: string;
  hex: string;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation?: number;
}

export interface CameraKeyframe {
  t: number;
  camera: Partial<CameraState>;
  easing?: EasingName;
}

export interface StylePresetRef {
  id: StylePresetId;
  /** Optional overrides applied on top of preset defaults */
  palette?: string[];
}

export interface PaintProject {
  /** Format version */
  version: 2;
  name: string;
  width: number;
  height: number;
  /** Frames per second for playback / export timing hints */
  fps: number;
  background: string;
  style?: StylePresetRef;
  palette: PaletteColor[];
  layers: Layer[];
  frames: Frame[];
  camera?: CameraState;
  cameraKeyframes?: CameraKeyframe[];
  meta?: {
    author?: string;
    created?: string;
    description?: string;
    tags?: string[];
  };
}

export interface RenderOptions {
  /** Absolute time in ms; if omitted, uses frame index */
  timeMs?: number;
  frameIndex?: number;
  /** Show onion skin ghosts */
  onionSkin?: { prev: number; next: number; opacity: number };
  /** Override camera */
  camera?: CameraState;
  /** Pixel art nearest-neighbor feel */
  imageSmoothing?: boolean;
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
}

export type CanvasFactory = (width: number, height: number) => CanvasLike;
