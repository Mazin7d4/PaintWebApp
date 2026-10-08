import type { BrushSettings, PaletteColor, StylePresetId } from './types.js';

export interface StylePreset {
  id: StylePresetId;
  name: string;
  description: string;
  background: string;
  palette: PaletteColor[];
  defaultBrush: BrushSettings;
  imageSmoothing: boolean;
}

export const STYLE_PRESETS: Record<StylePresetId, StylePreset> = {
  'flat-vector': {
    id: 'flat-vector',
    name: 'Flat Vector',
    description: 'Clean shapes, hard edges, bold flat fills — great for logo motion and UI explainer clips.',
    background: '#FAFAFA',
    palette: [
      { id: 'ink', hex: '#1A1A1A', name: 'Ink' },
      { id: 'sun', hex: '#FAD400', name: 'Studio Yellow' },
      { id: 'white', hex: '#FFFFFF', name: 'White' },
      { id: 'coral', hex: '#FF5A5F', name: 'Coral' },
      { id: 'sky', hex: '#3B82F6', name: 'Sky' },
    ],
    defaultBrush: {
      kind: 'ink',
      size: 6,
      color: '#1A1A1A',
      opacity: 1,
      pressureWidth: 0.35,
      smoothing: 2,
      taper: 0.15,
    },
    imageSmoothing: true,
  },
  'inked-cartoon': {
    id: 'inked-cartoon',
    name: 'Inked Cartoon',
    description: 'Expressive tapered ink lines with warm paper — ideal for character squash/stretch and logo reveals.',
    background: '#F7F1E3',
    palette: [
      { id: 'ink', hex: '#1A1A1A', name: 'Ink' },
      { id: 'sun', hex: '#FAD400', name: 'Yellow' },
      { id: 'paper', hex: '#F7F1E3', name: 'Paper' },
      { id: 'blush', hex: '#E85D4C', name: 'Blush' },
      { id: 'teal', hex: '#0F766E', name: 'Teal' },
    ],
    defaultBrush: {
      kind: 'ink',
      size: 8,
      color: '#1A1A1A',
      opacity: 1,
      pressureWidth: 0.85,
      pressureOpacity: 0.2,
      smoothing: 3,
      taper: 0.35,
    },
    imageSmoothing: true,
  },
  'pixel-art': {
    id: 'pixel-art',
    name: 'Pixel Art',
    description: 'Crisp nearest-neighbor look with a limited palette — agents should snap coords to integers.',
    background: '#0B1020',
    palette: [
      { id: 'bg', hex: '#0B1020', name: 'Night' },
      { id: 'sun', hex: '#FAD400', name: 'Yellow' },
      { id: 'white', hex: '#F4F4F5', name: 'White' },
      { id: 'pink', hex: '#F472B6', name: 'Pink' },
      { id: 'cyan', hex: '#22D3EE', name: 'Cyan' },
    ],
    defaultBrush: {
      kind: 'pencil',
      size: 2,
      color: '#FAD400',
      opacity: 1,
      pressureWidth: 0,
      smoothing: 0,
      taper: 0,
    },
    imageSmoothing: false,
  },
  painterly: {
    id: 'painterly',
    name: 'Painterly',
    description: 'Soft charcoal and watercolor edges for atmospheric landscapes and parallax scenes.',
    background: '#1C1917',
    palette: [
      { id: 'night', hex: '#1C1917', name: 'Night' },
      { id: 'gold', hex: '#EAB308', name: 'Gold' },
      { id: 'clay', hex: '#A8A29E', name: 'Clay' },
      { id: 'ember', hex: '#F97316', name: 'Ember' },
      { id: 'mist', hex: '#E7E5E4', name: 'Mist' },
    ],
    defaultBrush: {
      kind: 'watercolor',
      size: 18,
      color: '#EAB308',
      opacity: 0.55,
      pressureWidth: 0.5,
      pressureOpacity: 0.6,
      smoothing: 2,
      softness: 0.7,
      taper: 0.2,
    },
    imageSmoothing: true,
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Glow strokes on deep black — particles and write-on paths look striking.',
    background: '#050505',
    palette: [
      { id: 'void', hex: '#050505', name: 'Void' },
      { id: 'sun', hex: '#FAD400', name: 'Yellow' },
      { id: 'magenta', hex: '#FF2BD6', name: 'Magenta' },
      { id: 'cyan', hex: '#00F0FF', name: 'Cyan' },
      { id: 'white', hex: '#FFFFFF', name: 'White' },
    ],
    defaultBrush: {
      kind: 'neon',
      size: 10,
      color: '#FAD400',
      opacity: 0.95,
      pressureWidth: 0.4,
      smoothing: 2,
      taper: 0.25,
      softness: 0.8,
    },
    imageSmoothing: true,
  },
};

export function getStylePreset(id: StylePresetId | undefined): StylePreset {
  return STYLE_PRESETS[id ?? 'flat-vector'];
}
