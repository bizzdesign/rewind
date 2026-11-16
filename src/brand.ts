import logo from './assets/logo-unify.svg?raw';

/**
 * Unify's look: the wordmark and the colours, taken from the Unify frontend's
 * design tokens (nextgen-frontend, libs/shared/styles, variables-v2.scss), so
 * Rewind reads as part of the product. The CSS side is src/unify.css.
 */

export const UNIFY = {
  brand: '#006bfa', // BDcolorAccentBrandDefault
  brandEmphasized: '#0040d6',
  brandStrong: '#002885',
  brandWeak: '#e8f3ff',
  navy: '#00234c', // the wordmark
  text: '#131619', // BDcolorGeneralDefaultIconPrimary
  textSecondary: '#696f74',
  divider: '#dee1e5',
  section: '#f2f4f8',
  repository: '#852edd',
  // The colour picker's palette (BDcolorColorPicker*), for accents.
  cyan: '#33ddf2',
  green: '#33d55e',
  yellow: '#fae000',
  orange: '#ffa333',
  pink: '#ff6380',
  purple: '#a16ef3',
} as const;

/** The Unify wordmark as inline SVG, drawn in `color` (the CSS colour by default). */
export const logoSvg = (color = 'currentColor') => logo.replaceAll('#00234C', color);

/** The wordmark as an image, for drawing on a canvas. */
export function logoImage(color: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the Unify logo'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(color))}`;
  });
}

/**
 * BDCore's layers and their colours. `pastel` is Unify's own token
 * (BDcolorCore*, the colour behind each type's icon); `vivid` is the same hue
 * pushed up for the story slides, `deep` the same hue darkened for highlights
 * on it (at least 3:1 against `vivid`, for large text).
 */
export type Layer = 'application' | 'business' | 'strategy' | 'motivation' | 'data' | 'technology' | 'implementation';

export const LAYERS: Record<Layer, { pastel: string; vivid: string; deep: string }> = {
  application: { pastel: '#80deea', vivid: '#00c4e0', deep: '#004e5a' }, // BDcolorCoreApplication
  business: { pastel: '#fff59d', vivid: '#ffe234', deep: '#5c4d00' }, // BDcolorCoreBusiness
  strategy: { pastel: '#ffcc80', vivid: '#ff9f1a', deep: '#7a3d00' }, // BDcolorCoreStrategy
  motivation: { pastel: '#c9b5ef', vivid: '#a57af2', deep: '#2e1470' }, // BDcolorCoreMotivation
  data: { pastel: '#a6c8ff', vivid: '#5c9bff', deep: '#0a2f75' }, // BDcolorCoreData
  technology: { pastel: '#b9f6ca', vivid: '#3fe07a', deep: '#0a5228' }, // BDcolorCoreTechnology
  implementation: { pastel: '#ffb2a8', vivid: '#ff7a6b', deep: '#7a1a10' }, // BDcolorCoreImplementation
};

/** The order slides cycle through when a colour would repeat. */
export const LAYER_ORDER: Layer[] = ['application', 'data', 'business', 'strategy', 'motivation', 'technology', 'implementation'];

/** Each BDCore type's layer, as Unify colours its icon (unify-icons-duotone-manifest.json). */
const TYPE_LAYER: Record<string, Layer> = {
  'BDCore.Application': 'application',
  'BDCore.Capability': 'strategy',
  'BDCore.Data': 'data',
  'BDCore.Goal': 'motivation',
  'BDCore.HardwareTechnology': 'technology',
  'BDCore.SoftwareTechnology': 'technology',
  'BDCore.Initiative': 'implementation',
  'BDCore.Organization': 'business',
  'BDCore.Process': 'business',
  'BDCore.Product': 'business',
};

/** A type Unify doesn't colour (or the SDK doesn't know) gets the Application colour. */
export const layerOf = (type: string | undefined): Layer => (type && TYPE_LAYER[type]) || 'application';
