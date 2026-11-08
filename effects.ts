// Biblioteca de efeitos do Worder Effect: bases inspiradas em AE / Alight Motion / NodeVideo,
// cada uma com 10 variações de intensidade => 500+ efeitos renderizados em tempo real no canvas.

export type FxOut = {
  filter?: string;
  shake?: number;
  zoom?: number;
  rotate?: number;
  rgb?: number;
  vignette?: number;
  glitch?: number;
  letterbox?: number;
  pulse?: number;
  mirror?: boolean;
  flipV?: boolean;
  pixel?: number;
  sharpen?: boolean;
  tint?: string;
  scan?: number;
};

export type EffectDef = {
  id: string;
  name: string;
  category: string;
  /** a = intensidade 0..1 já multiplicada pela variação */
  build: (a: number) => FxOut;
  aeMatch?: string[] | undefined;
};

type Base = Omit<EffectDef, "id" | "build"> & { build: (a: number) => FxOut };

const B = (name: string, category: string, build: (a: number) => FxOut, aeMatch?: string[] | undefined): Base => ({ name, category, build, aeMatch });

export const BASES: Base[] = [
  // Desfoque & Nitidez
  B("Gaussian Blur", "Desfoque", (a) => ({ filter: `blur(${a * 12}px)` }), ["ADBE Gaussian Blur 2", "gaussian blur"]),
  B("Camera Lens Blur", "Desfoque", (a) => ({ filter: `blur(${a * 8}px) brightness(${1 + a * 0.15})` }), ["ADBE Camera Lens Blur", "lens blur"]),
  B("Directional Blur", "Desfoque", (a) => ({ filter: `blur(${a * 5}px)`, shake: a * 2 }), ["ADBE Motion Blur", "directional blur"]),
  B("Radial Zoom Blur", "Desfoque", (a) => ({ filter: `blur(${a * 4}px)`, zoom: 1 + a * 0.15 }), ["ADBE Radial Blur", "radial blur"]),
  B("Sharpen", "Desfoque", () => ({ sharpen: true }), ["ADBE Sharpen", "sharpen"]),
  B("Unsharp Mask", "Desfoque", (a) => ({ sharpen: true, filter: `contrast(${1 + a * 0.2})` }), ["ADBE Unsharp Mask", "unsharp"]),
  // Cor
  B("Hue/Saturation", "Cor", (a) => ({ filter: `hue-rotate(${a * 180}deg) saturate(${1 + a})` }), ["ADBE HUE SATURATION", "hue/saturation"]),
  B("Brightness & Contrast", "Cor", (a) => ({ filter: `brightness(${1 + a * 0.4}) contrast(${1 + a * 0.6})` }), ["ADBE Brightness & Contrast 2", "brightness"]),
  B("Curves", "Cor", (a) => ({ filter: `contrast(${1 + a * 0.5}) saturate(${1 + a * 0.3})` }), ["ADBE CurvesCustom", "curves"]),
  B("Levels", "Cor", (a) => ({ filter: `brightness(${1 + a * 0.2}) contrast(${1 + a * 0.4})` }), ["ADBE Easy Levels2", "levels"]),
  B("Tint", "Cor", (a) => ({ filter: `grayscale(${a})` }), ["ADBE Tint", "tint"]),
  B("Black & White", "Cor", (a) => ({ filter: `grayscale(${Math.min(1, a * 1.2)}) contrast(${1 + a * 0.3})` }), ["ADBE Black&White", "black & white"]),
  B("Sepia Film", "Cor", (a) => ({ filter: `sepia(${a}) contrast(1.1)` })),
  B("Invert", "Cor", (a) => ({ filter: `invert(${a})` }), ["ADBE Invert", "invert"]),
  B("Vibrance", "Cor", (a) => ({ filter: `saturate(${1 + a * 1.5})` }), ["ADBE Vibrance", "vibrance"]),
  B("Lumetri Teal & Orange", "Cor", (a) => ({ filter: `saturate(${1 + a * 0.6}) contrast(${1 + a * 0.25})`, tint: `rgba(0,140,160,${a * 0.18})` }), ["ADBE Lumetri", "lumetri"]),
  B("Color Overlay Roxo", "Cor", (a) => ({ tint: `rgba(150,60,255,${a * 0.35})` })),
  B("Color Overlay Verde", "Cor", (a) => ({ tint: `rgba(40,255,140,${a * 0.3})` })),
  B("Exposure", "Cor", (a) => ({ filter: `brightness(${1 + a * 0.8})` }), ["ADBE Exposure2", "exposure"]),
  B("Change to Color", "Cor", (a) => ({ filter: `hue-rotate(${a * 360}deg)` }), ["ADBE Change To Color", "change color"]),
  // Luz & Brilho
  B("Glow", "Luz", (a) => ({ filter: `brightness(${1 + a * 0.3}) saturate(${1 + a * 0.5}) drop-shadow(0 0 ${a * 18}px rgba(255,255,255,0.7))` }), ["ADBE Glo2", "glow"]),
  B("Deep Glow", "Luz", (a) => ({ filter: `brightness(${1 + a * 0.4}) drop-shadow(0 0 ${a * 30}px rgba(120,255,180,0.8))` }), ["deep glow"]),
  B("Neon Glow Roxo", "Luz", (a) => ({ filter: `drop-shadow(0 0 ${a * 20}px rgba(170,80,255,0.9)) saturate(1.4)` })),
  B("Light Leak", "Luz", (a) => ({ tint: `rgba(255,140,40,${a * 0.25})`, filter: `brightness(${1 + a * 0.2})` }), ["light leak"]),
  B("Lens Flare", "Luz", (a) => ({ filter: `brightness(${1 + a * 0.5}) contrast(0.95)`, tint: `rgba(255,240,200,${a * 0.15})` }), ["ADBE Lens Flare", "lens flare"]),
  B("Vignette", "Luz", (a) => ({ vignette: a }), ["vignette"]),
  B("Bloom", "Luz", (a) => ({ filter: `brightness(${1 + a * 0.25}) blur(${a * 0.8}px) saturate(1.3)` })),
  // Distorção
  B("Shake", "Distorção", (a) => ({ shake: a * 25 }), ["ADBE Wiggle", "shake", "wiggle"]),
  B("Camera Shake Pro", "Distorção", (a) => ({ shake: a * 40, rotate: a * 3 }), ["camera shake"]),
  B("Zoom In", "Distorção", (a) => ({ zoom: 1 + a * 0.6 }), ["zoom"]),
  B("Zoom Pulse", "Distorção", (a) => ({ pulse: a * 0.25 }), ["pulse"]),
  B("Rotate", "Distorção", (a) => ({ rotate: a * 45 }), ["ADBE Geometry2", "transform"]),
  B("Mirror", "Distorção", () => ({ mirror: true }), ["ADBE Mirror", "mirror"]),
  B("Flip Vertical", "Distorção", () => ({ flipV: true })),
  B("Mosaic / Pixelate", "Distorção", (a) => ({ pixel: Math.max(2, Math.round(a * 40)) }), ["ADBE Mosaic", "mosaic"]),
  B("Swing", "Distorção", (a) => ({ rotate: a * 8, shake: a * 6 })),
  // Glitch & Estilizar
  B("RGB Split", "Glitch", (a) => ({ rgb: a * 14 }), ["ADBE Channel Shift", "rgb split", "chromatic"]),
  B("Chromatic Aberration", "Glitch", (a) => ({ rgb: a * 8, filter: `contrast(1.05)` }), ["chromatic aberration"]),
  B("Digital Glitch", "Glitch", (a) => ({ glitch: a, rgb: a * 6 }), ["glitch"]),
  B("VHS", "Glitch", (a) => ({ scan: a, rgb: a * 4, filter: `saturate(${1 - a * 0.3}) contrast(1.1) blur(${a * 0.6}px)` }), ["vhs"]),
  B("Scanlines CRT", "Glitch", (a) => ({ scan: a })),
  B("Data Mosh", "Glitch", (a) => ({ glitch: a * 1.4, pixel: Math.max(2, Math.round(a * 10)) })),
  B("Posterize", "Estilizar", (a) => ({ filter: `contrast(${1 + a * 1.5}) saturate(${1 + a})` }), ["ADBE Posterize", "posterize"]),
  B("Cartoon", "Estilizar", (a) => ({ sharpen: true, filter: `contrast(${1 + a}) saturate(${1 + a * 0.8})` }), ["ADBE Cartoonify", "cartoon"]),
  B("Emboss", "Estilizar", (a) => ({ sharpen: true, filter: `grayscale(1) contrast(${1 + a * 2})` }), ["ADBE Emboss", "emboss"]),
  B("Find Edges", "Estilizar", (a) => ({ sharpen: true, filter: `invert(${a}) grayscale(1) contrast(3)` }), ["ADBE Find Edges", "find edges"]),
  B("Thermal Vision", "Estilizar", (a) => ({ filter: `invert(${a * 0.8}) hue-rotate(180deg) saturate(3)` })),
  B("Night Vision", "Estilizar", (a) => ({ filter: `grayscale(1) brightness(${1 + a * 0.4})`, tint: `rgba(40,255,90,${a * 0.35})`, scan: a * 0.4 })),
  B("Dreamy", "Estilizar", (a) => ({ filter: `blur(${a * 1.5}px) brightness(${1 + a * 0.15}) saturate(1.2)`, tint: `rgba(200,140,255,${a * 0.12})` })),
  // Cinema
  B("Cinematic Bars 2.39", "Cinema", (a) => ({ letterbox: 0.05 + a * 0.12 }), ["letterbox"]),
  B("Film Look", "Cinema", (a) => ({ filter: `contrast(${1 + a * 0.2}) saturate(${1 - a * 0.2}) sepia(${a * 0.2})`, vignette: a * 0.5 })),
  B("Bleach Bypass", "Cinema", (a) => ({ filter: `saturate(${1 - a * 0.6}) contrast(${1 + a * 0.5})` })),
  B("Noir", "Cinema", (a) => ({ filter: `grayscale(1) contrast(${1.2 + a})`, vignette: a })),
];

export const VARIANTS: { label: string; mult: number }[] = [
  { label: "", mult: 0.5 },
  { label: "Suave", mult: 0.25 },
  { label: "Médio", mult: 0.6 },
  { label: "Forte", mult: 0.8 },
  { label: "Extremo", mult: 1 },
  { label: "Cinema", mult: 0.4 },
  { label: "Neon", mult: 0.7 },
  { label: "Lite", mult: 0.15 },
  { label: "Pro", mult: 0.9 },
  { label: "Max", mult: 1.2 },
];

export const EFFECTS: EffectDef[] = BASES.flatMap((b, bi) =>
  VARIANTS.map((v, vi) => ({
    id: `fx-${bi}-${vi}`,
    name: v.label ? `${b.name} ${v.label}` : b.name,
    category: b.category,
    aeMatch: b.aeMatch,
    build: (a: number) => b.build(Math.max(0, a * v.mult * 2)),
  })),
);

export const EFFECT_MAP = new Map(EFFECTS.map((e) => [e.id, e]));
export const CATEGORIES = ["Todos", ...Array.from(new Set(BASES.map((b) => b.category)))];

export function combine(outs: FxOut[]): FxOut {
  const r: FxOut = { filter: "" };
  for (const o of outs) {
    if (o.filter) r.filter += " " + o.filter;
    r.shake = (r.shake ?? 0) + (o.shake ?? 0);
    r.zoom = (r.zoom ?? 1) * (o.zoom ?? 1);
    r.rotate = (r.rotate ?? 0) + (o.rotate ?? 0);
    r.rgb = (r.rgb ?? 0) + (o.rgb ?? 0);
    r.vignette = Math.max(r.vignette ?? 0, o.vignette ?? 0);
    r.glitch = (r.glitch ?? 0) + (o.glitch ?? 0);
    r.letterbox = Math.max(r.letterbox ?? 0, o.letterbox ?? 0);
    r.pulse = (r.pulse ?? 0) + (o.pulse ?? 0);
    r.scan = Math.max(r.scan ?? 0, o.scan ?? 0);
    if (o.mirror) r.mirror = true;
    if (o.flipV) r.flipV = true;
    if (o.sharpen) r.sharpen = true;
    if (o.pixel) r.pixel = Math.max(r.pixel ?? 0, o.pixel);
    if (o.tint) r.tint = o.tint;
  }
  return r;
}
