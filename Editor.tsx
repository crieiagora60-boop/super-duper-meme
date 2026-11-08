import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Play, Pause, SkipBack, Plus, Type, Download, Sparkles, Wand2, Layers, Clock, Puzzle, Plug,
  Trash2, Eye, EyeOff, Search, Upload, Zap, FileBox, SlidersHorizontal, ImageUp,
} from "lucide-react";
import { CATEGORIES, EFFECTS, EFFECT_MAP, combine, type FxOut } from "@/lib/effects";
import { parseFfx } from "@/lib/ffx";

type AppliedFx = { uid: string; fxId: string; amount: number };
type Layer = {
  id: string; name: string; kind: "video" | "image" | "text";
  src?: string; text?: string; color?: string;
  effects: AppliedFx[]; opacity: number; x: number; y: number; scale: number; rot: number; visible: boolean;
};
type Key = { t: number; speed: number };
type Pack = { id: string; name: string; desc: string; kind: "builtin" | "file"; effectIds?: string[]; remap?: Key[]; size?: number };

const uid = () => Math.random().toString(36).slice(2, 9);
const RATIOS = { "9:16": [720, 1280], "16:9": [1280, 720], "1:1": [1000, 1000] } as const;
type Ratio = keyof typeof RATIOS;

const fxByName = (n: string) => EFFECTS.find((e) => e.name.toLowerCase() === n.toLowerCase())?.id;
const BUILTIN_EXT: Pack[] = [
  { id: "x1", name: "Auto Cor Cinema", desc: "Teal & Orange + Film Look", kind: "builtin", effectIds: [fxByName("Lumetri Teal & Orange")!, fxByName("Film Look")!] },
  { id: "x2", name: "Velocity Edit", desc: "Rampa 1x → 0.2x → 2x", kind: "builtin", remap: [{ t: 0, speed: 1 }, { t: 1, speed: 0.2 }, { t: 2, speed: 2 }, { t: 3, speed: 1 }] },
  { id: "x3", name: "Pacote Glitch", desc: "Digital Glitch + RGB Split", kind: "builtin", effectIds: [fxByName("Digital Glitch")!, fxByName("RGB Split Suave")!] },
  { id: "x4", name: "Shake Pack", desc: "Camera Shake + Zoom Pulse", kind: "builtin", effectIds: [fxByName("Camera Shake Pro")!, fxByName("Zoom Pulse")!] },
  { id: "x5", name: "Cinema 2.39", desc: "Barras + vinheta", kind: "builtin", effectIds: [fxByName("Cinematic Bars 2.39")!, fxByName("Vignette")!] },
  { id: "x6", name: "Neon Dreams", desc: "Glow roxo + verde", kind: "builtin", effectIds: [fxByName("Neon Glow Roxo")!, fxByName("Deep Glow Suave")!] },
  { id: "x7", name: "Retro VHS", desc: "VHS + Scanlines", kind: "builtin", effectIds: [fxByName("VHS")!, fxByName("Scanlines CRT Suave")!] },
  { id: "x8", name: "Night Ops", desc: "Visão noturna", kind: "builtin", effectIds: [fxByName("Night Vision")!] },
  { id: "x9", name: "Câmera Lenta Suave", desc: "0.3x constante", kind: "builtin", remap: [{ t: 0, speed: 0.3 }] },
  { id: "x10", name: "Noir Clássico", desc: "Preto e branco dramático", kind: "builtin", effectIds: [fxByName("Noir")!] },
];

function speedAt(keys: Key[], t: number) {
  const k = [...keys].sort((a, b) => a.t - b.t);
  const first = k[0];
  if (!first) return 1;
  if (t <= first.t) return first.speed;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]!, b = k[i + 1]!;
    if (t >= a.t && t <= b.t) return a.speed + (b.speed - a.speed) * ((t - a.t) / (b.t - a.t || 1));
  }
  return k[k.length - 1]!.speed;
}

function useLandscape() {
  const [land, setLand] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(orientation: landscape) and (min-width: 700px)");
    const f = () => setLand(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return land;
}

export default function Editor() {
  const land = useLandscape();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [remapOn, setRemapOn] = useState(false);
  const [keys, setKeys] = useState<Key[]>([{ t: 0, speed: 1 }]);
  const [baseSpeed, setBaseSpeed] = useState(1);
  const [twixtor, setTwixtor] = useState({ on: false, blur: 0.6 });
  const [enhance, setEnhance] = useState({ on: false, strength: 0.6 });
  const [extensions, setExtensions] = useState<Pack[]>(BUILTIN_EXT);
  const [plugins, setPlugins] = useState<Pack[]>([]);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLCanvasElement | null>(null);
  const pixRef = useRef<HTMLCanvasElement | null>(null);
  const media = useRef(new Map<string, HTMLVideoElement | HTMLImageElement>());
  const state = useRef({ layers, playing, time, duration, remapOn, keys, baseSpeed, twixtor, enhance, ratio });
  state.current = { layers, playing, time, duration, remapOn, keys, baseSpeed, twixtor, enhance, ratio };

  const selected = layers.find((l) => l.id === sel) ?? null;
  const updateLayer = (id: string, p: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const master = () => {
    for (const l of state.current.layers) {
      const m = media.current.get(l.id);
      if (l.kind === "video" && m instanceof HTMLVideoElement) return m;
    }
    return null;
  };

  // ---------- render loop ----------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = state.current;
      const [W, H] = RATIOS[s.ratio];
      const cv = canvasRef.current;
      if (!cv) { raf = requestAnimationFrame(draw); return; }
      if (cv.width !== W) { cv.width = W; cv.height = H; }
      if (!frameRef.current) frameRef.current = document.createElement("canvas");
      if (!pixRef.current) pixRef.current = document.createElement("canvas");
      const fc = frameRef.current;
      if (fc.width !== W || fc.height !== H) { fc.width = W; fc.height = H; }

      // tempo
      const speed = (s.remapOn ? speedAt(s.keys, s.time) : 1) * s.baseSpeed;
      const m = master();
      let t = s.time;
      if (m) {
        const rate = Math.min(4, Math.max(0.0625, speed));
        if (Math.abs(m.playbackRate - rate) > 0.01) m.playbackRate = rate;
        if (s.playing && m.paused) m.play().catch(() => {});
        if (!s.playing && !m.paused) m.pause();
        t = m.currentTime;
        if (m.ended && s.playing) { setPlaying(false); }
      } else if (s.playing) {
        t = s.time + dt * speed;
        if (t >= s.duration) { t = 0; }
      }
      // sincroniza outros vídeos
      for (const l of s.layers) {
        const v = media.current.get(l.id);
        if (v instanceof HTMLVideoElement && v !== m) {
          v.playbackRate = m ? m.playbackRate : 1;
          if (Math.abs(v.currentTime - t) > 0.3 && v.duration && t < v.duration) v.currentTime = t;
          if (s.playing && v.paused) v.play().catch(() => {});
          if (!s.playing && !v.paused) v.pause();
        }
      }
      if (Math.abs(t - s.time) > 0.01) setTime(t);

      const ctx = fc.getContext("2d")!;
      ctx.save();
      ctx.globalAlpha = 1; ctx.filter = "none"; ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.restore();

      for (const l of s.layers) {
        if (!l.visible) continue;
        const fx: FxOut = combine(l.effects.map((a) => EFFECT_MAP.get(a.fxId)?.build(a.amount) ?? {}));
        drawLayer(ctx, l, fx, W, H, t, s.enhance);
      }

      const out = cv.getContext("2d")!;
      out.save();
      out.globalAlpha = s.twixtor.on ? 1 - s.twixtor.blur * 0.85 : 1;
      out.drawImage(fc, 0, 0);
      out.restore();
      raf = requestAnimationFrame(draw);
    };

    const drawLayer = (ctx: CanvasRenderingContext2D, l: Layer, fx: FxOut, W: number, H: number, t: number, en: { on: boolean; strength: number }) => {
      ctx.save();
      const seed = Math.floor(t * 30);
      const rnd = (n: number) => (Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1;
      const sh = fx.shake ?? 0;
      ctx.translate(W / 2 + l.x + rnd(1) * sh, H / 2 + l.y + rnd(2) * sh);
      ctx.rotate(((l.rot + (fx.rotate ?? 0) * (sh ? rnd(3) : 1)) * Math.PI) / 180);
      const pulse = 1 + (fx.pulse ?? 0) * Math.abs(Math.sin(t * Math.PI * 2));
      const sc = l.scale * (fx.zoom ?? 1) * pulse;
      ctx.scale(sc * (fx.mirror ? -1 : 1), sc * (fx.flipV ? -1 : 1));
      ctx.globalAlpha = l.opacity;
      let filter = fx.filter?.trim() || "";
      if (fx.rgb) filter += ` drop-shadow(${fx.rgb}px 0 0 rgba(255,0,80,.75)) drop-shadow(${-fx.rgb}px 0 0 rgba(0,230,255,.75))`;
      if (en.on) filter += ` contrast(${1 + en.strength * 0.15}) saturate(${1 + en.strength * 0.25}) url(#we-sharpen)`;
      else if (fx.sharpen) filter += " url(#we-sharpen)";
      ctx.filter = filter.trim() || "none";

      if (l.kind === "text") {
        ctx.fillStyle = l.color ?? "#fff";
        ctx.font = `700 ${Math.round(W * 0.09)}px "Space Grotesk", sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(l.text ?? "", 0, 0);
      } else {
        const el = media.current.get(l.id);
        if (el) {
          const sw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
          const shh = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
          if (sw && shh) {
            const k = Math.max(W / sw, H / shh);
            const dw = sw * k, dh = shh * k;
            if (fx.pixel && fx.pixel > 1) {
              const pc = pixRef.current!;
              pc.width = Math.max(1, Math.round(dw / fx.pixel)); pc.height = Math.max(1, Math.round(dh / fx.pixel));
              pc.getContext("2d")!.drawImage(el, 0, 0, pc.width, pc.height);
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(pc, -dw / 2, -dh / 2, dw, dh);
              ctx.imageSmoothingEnabled = true;
            } else ctx.drawImage(el, -dw / 2, -dh / 2, dw, dh);
          }
        }
      }
      ctx.restore();

      // overlays
      ctx.save();
      if (fx.tint) { ctx.globalCompositeOperation = "overlay"; ctx.fillStyle = fx.tint; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
      if (fx.glitch) {
        const n = Math.round(3 + fx.glitch * 10);
        for (let i = 0; i < n; i++) {
          if (Math.abs(rnd(i + 10)) > 0.5 + (1 - Math.min(1, fx.glitch)) * 0.4) continue;
          const y = Math.abs(rnd(i + 20)) * H, h = 4 + Math.abs(rnd(i + 30)) * 40 * fx.glitch;
          ctx.drawImage(ctx.canvas, 0, y, W, h, rnd(i + 40) * 60 * fx.glitch, y, W, h);
        }
      }
      if (fx.scan) { ctx.fillStyle = `rgba(0,0,0,${0.25 * fx.scan})`; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2); }
      if (fx.vignette) {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, fx.vignette)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (fx.letterbox) { const b = (W > H ? H : W) * fx.letterbox; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b); }
      ctx.restore();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------- ações ----------
  const importMedia = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const id = uid();
      const src = URL.createObjectURL(f);
      const isVideo = f.type.startsWith("video");
      if (isVideo) {
        const v = document.createElement("video");
        v.src = src; v.muted = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
        v.onloadedmetadata = () => { if (!master() || master() === v) setDuration(v.duration || 10); };
        media.current.set(id, v);
      } else {
        const img = new Image(); img.src = src; media.current.set(id, img);
      }
      setLayers((ls) => [...ls, { id, name: f.name, kind: isVideo ? "video" : "image", src, effects: [], opacity: 1, x: 0, y: 0, scale: 1, rot: 0, visible: true }]);
      setSel(id);
    });
    toast.success("Mídia importada");
  };

  const addText = () => {
    const id = uid();
    setLayers((ls) => [...ls, { id, name: "Texto", kind: "text", text: "WORDER", color: "#7CFFB2", effects: [], opacity: 1, x: 0, y: 0, scale: 1, rot: 0, visible: true }]);
    setSel(id);
  };

  const addEffects = useCallback((ids: string[]) => {
    const target = sel ?? layers[layers.length - 1]?.id;
    if (!target) { toast.error("Importe uma mídia primeiro"); return; }
    setLayers((ls) => ls.map((l) => (l.id === target ? { ...l, effects: [...l.effects, ...ids.filter(Boolean).map((fxId) => ({ uid: uid(), fxId, amount: 0.5 }))] } : l)));
    setSel(target);
  }, [sel, layers]);

  const seek = (t: number) => {
    const m = master();
    if (m) m.currentTime = t;
    for (const v of media.current.values()) if (v instanceof HTMLVideoElement) v.currentTime = Math.min(t, v.duration || t);
    setTime(t);
  };

  const applyPack = (p: Pack) => {
    if (p.effectIds?.length) addEffects(p.effectIds);
    if (p.remap) { setKeys(p.remap); setRemapOn(true); }
    if (!p.effectIds?.length && !p.remap) { toast.info(`"${p.name}" registrado — sem efeitos reconhecidos`); return; }
    toast.success(`${p.name} aplicado`);
  };

  const importPack = async (files: FileList | null, target: "ext" | "plug") => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const ext = f.name.split(".").pop()?.toLowerCase();
      const pack: Pack = { id: uid(), name: f.name, desc: `.${ext} · ${(f.size / 1024).toFixed(1)} KB`, kind: "file", size: f.size };
      try {
        if (ext === "ffx") {
          const r = await parseFfx(f);
          pack.effectIds = r.effectIds;
          pack.desc = r.found.length ? `Preset AE: ${r.found.join(", ")}` : "Preset AE (nenhum efeito reconhecido)";
        } else if (ext === "json") {
          const j = JSON.parse(await f.text());
          const names: string[] = j.effects ?? [];
          pack.effectIds = names.map((n) => fxByName(n)).filter(Boolean) as string[];
          if (Array.isArray(j.remap)) pack.remap = j.remap;
        }
      } catch { /* formato livre: apenas registra */ }
      (target === "ext" ? setExtensions : setPlugins)((ps) => [pack, ...ps]);
      toast.success(`${f.name} importado`);
    }
  };

  const importFfxDirect = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const r = await parseFfx(files[0]);
    if (!r.effectIds.length) { toast.error("Nenhum efeito compatível encontrado no .ffx"); return; }
    addEffects(r.effectIds);
    toast.success(`FFX aplicado: ${r.found.join(", ")}`);
  };

  const upscale = () => {
    const fc = frameRef.current;
    if (!fc || !layers.length) { toast.error("Importe uma mídia primeiro"); return; }
    const c = document.createElement("canvas");
    c.width = fc.width * 4; c.height = fc.height * 4;
    const x = c.getContext("2d")!;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.filter = "contrast(1.06) saturate(1.08) url(#we-sharpen)";
    x.drawImage(fc, 0, 0, c.width, c.height);
    c.toBlob((b) => { if (b) download(b, `worder-upscale-4x-${c.width}x${c.height}.png`); }, "image/png");
    toast.success(`Quadro ampliado 4x (${c.width}×${c.height})`);
  };

  const exportVideo = async () => {
    const cv = canvasRef.current;
    if (!cv || !layers.length) { toast.error("Nada para exportar"); return; }
    const stream = cv.captureStream(30);
    const m = master() as (HTMLVideoElement & { captureStream?: () => MediaStream }) | null;
    try { m?.captureStream?.().getAudioTracks().forEach((tr) => stream.addTrack(tr)); } catch { /* sem áudio */ }
    const mime = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => { download(new Blob(chunks, { type: mime || "video/webm" }), `worder-effect.${mime.includes("mp4") ? "mp4" : "webm"}`); setExporting(false); toast.success("Vídeo exportado"); };
    setExporting(true);
    seek(0);
    rec.start();
    setPlaying(true);
    const stopAt = () => {
      const t = m ? m.currentTime : state.current.time;
      if ((m && m.ended) || t >= state.current.duration - 0.05 || !state.current.playing) { rec.stop(); setPlaying(false); }
      else setTimeout(stopAt, 100);
    };
    setTimeout(stopAt, 300);
  };

  // ---------- UI ----------
  const tabs = land ? (["ajustes", "tempo", "ia", "ext", "plug"] as const) : (["efeitos", "ajustes", "tempo", "ia", "ext", "plug"] as const);
  const [tab, setTab] = useState<string>("efeitos");
  const activeTab = (tabs as readonly string[]).includes(tab) ? tab : tabs[0];

  const panelProps = { selected, updateLayer, setLayers, keys, setKeys, remapOn, setRemapOn, baseSpeed, setBaseSpeed, twixtor, setTwixtor, enhance, setEnhance, time, extensions, plugins, applyPack, importPack, upscale, importFfxDirect, addEffects };

  const preview = (
    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-stage p-2">
      <canvas ref={canvasRef} className="max-h-full max-w-full rounded-md shadow-glow" style={{ aspectRatio: `${RATIOS[ratio][0]} / ${RATIOS[ratio][1]}` }} />
      {!layers.length && (
        <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-brand p-4 shadow-glow"><Upload className="h-7 w-7 text-primary-foreground" /></div>
          <span className="text-sm font-medium">Toque para importar vídeo ou imagem</span>
          <span className="text-xs text-muted-foreground">520 efeitos · Time Remap · Twixtor · IA</span>
          <input type="file" accept="video/*,image/*" multiple hidden onChange={(e) => importMedia(e.target.files)} />
        </label>
      )}
      {exporting && <div className="absolute top-3 rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">● Exportando…</div>}
    </div>
  );

  const transport = (
    <div className="flex items-center gap-2 border-y bg-panel px-3 py-2">
      <IconBtn onClick={() => seek(0)} label="Início"><SkipBack className="h-4 w-4" /></IconBtn>
      <button aria-label={playing ? "Pausar" : "Reproduzir"} onClick={() => setPlaying((p) => !p)} className="rounded-full bg-primary p-2 text-primary-foreground shadow-glow">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{fmt(time)} / {fmt(duration)}</span>
      <div className="ml-auto flex gap-1">
        {(Object.keys(RATIOS) as Ratio[]).map((r) => (
          <button key={r} onClick={() => setRatio(r)} className={`rounded px-2 py-1 font-mono text-[10px] ${ratio === r ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>{r}</button>
        ))}
      </div>
    </div>
  );

  const timeline = (
    <Timeline layers={layers} sel={sel} setSel={setSel} time={time} duration={duration} seek={seek} keys={remapOn ? keys : []}
      onToggle={(id) => updateLayer(id, { visible: !layers.find((l) => l.id === id)?.visible })}
      onDelete={(id) => { setLayers((ls) => ls.filter((l) => l.id !== id)); media.current.delete(id); if (sel === id) setSel(null); }} />
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <svg width="0" height="0" className="absolute">
        <filter id="we-sharpen"><feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" preserveAlpha="true" /></filter>
      </svg>
      <header className="flex items-center gap-2 border-b bg-panel px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand"><Zap className="h-4 w-4 text-primary-foreground" /></div>
        <h1 className="text-base font-bold tracking-tight"><span className="text-brand">Worder</span> Effect</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <label className="flex cursor-pointer items-center gap-1 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> Mídia
            <input type="file" accept="video/*,image/*" multiple hidden onChange={(e) => importMedia(e.target.files)} />
          </label>
          <IconBtn onClick={addText} label="Texto"><Type className="h-4 w-4" /></IconBtn>
          <button onClick={exportVideo} disabled={exporting} className="flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>
      </header>

      {land ? (
        <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_300px] grid-rows-[1fr_200px]">
          <aside className="row-span-1 min-h-0 overflow-hidden border-r bg-panel"><EffectsLibrary onPick={(id) => addEffects([id])} /></aside>
          <main className="flex min-h-0 flex-col">{preview}{transport}</main>
          <aside className="row-span-2 flex min-h-0 flex-col border-l bg-panel">
            <TabBar tabs={tabs} active={activeTab} setTab={setTab} />
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3"><Panel tab={activeTab} {...panelProps} /></div>
          </aside>
          <section className="col-span-2 min-h-0 overflow-hidden border-t bg-panel">{timeline}</section>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 basis-[42%] flex-col">{preview}</div>
          {transport}
          <div className="h-28 shrink-0 overflow-hidden bg-panel">{timeline}</div>
          <TabBar tabs={tabs} active={activeTab} setTab={setTab} />
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-panel p-3">
            {activeTab === "efeitos" ? <EffectsLibrary onPick={(id) => addEffects([id])} /> : <Panel tab={activeTab} {...panelProps} />}
          </div>
        </div>
      )}
    </div>
  );
}

function download(b: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return <button aria-label={label} title={label} onClick={onClick} className="rounded-md bg-secondary p-1.5 text-secondary-foreground hover:bg-accent">{children}</button>;
}

const TAB_INFO: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  efeitos: { label: "Efeitos", icon: Sparkles },
  ajustes: { label: "Ajustes", icon: SlidersHorizontal },
  tempo: { label: "Tempo", icon: Clock },
  ia: { label: "Topaz IA", icon: Wand2 },
  ext: { label: "Extensões", icon: Puzzle },
  plug: { label: "Plugins", icon: Plug },
};

function TabBar({ tabs, active, setTab }: { tabs: readonly string[]; active: string; setTab: (t: string) => void }) {
  return (
    <nav className="flex shrink-0 overflow-x-auto scrollbar-thin border-y bg-panel-2">
      {tabs.map((t) => {
        const info = TAB_INFO[t]!; const I = info.icon;
        return (
          <button key={t} onClick={() => setTab(t)} className={`flex min-w-16 flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium ${active === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            <I className="h-4 w-4" />{info.label}
          </button>
        );
      })}
    </nav>
  );
}

function EffectsLibrary({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const list = useMemo(() => EFFECTS.filter((e) => (cat === "Todos" || e.category === cat) && e.name.toLowerCase().includes(q.toLowerCase())), [q, cat]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="flex items-center gap-2 rounded-md border bg-secondary px-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar em ${EFFECTS.length} efeitos`} className="w-full bg-transparent py-1.5 text-sm outline-none" />
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${cat === c ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>{c}</button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-y-auto scrollbar-thin">
        {list.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)} className="group rounded-md border bg-card p-2 text-left hover:border-primary">
            <div className="truncate text-xs font-medium group-hover:text-primary">{e.name}</div>
            <div className="text-[10px] text-muted-foreground">{e.category}</div>
          </button>
        ))}
      </div>
      <div className="text-center text-[10px] text-muted-foreground">{list.length} efeitos</div>
    </div>
  );
}

type PanelProps = {
  tab: string; selected: Layer | null; updateLayer: (id: string, p: Partial<Layer>) => void;
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  keys: Key[]; setKeys: (k: Key[]) => void; remapOn: boolean; setRemapOn: (b: boolean) => void;
  baseSpeed: number; setBaseSpeed: (n: number) => void;
  twixtor: { on: boolean; blur: number }; setTwixtor: (t: { on: boolean; blur: number }) => void;
  enhance: { on: boolean; strength: number }; setEnhance: (t: { on: boolean; strength: number }) => void;
  time: number; extensions: Pack[]; plugins: Pack[]; applyPack: (p: Pack) => void;
  importPack: (f: FileList | null, t: "ext" | "plug") => void; upscale: () => void;
  importFfxDirect: (f: FileList | null) => void; addEffects: (ids: string[]) => void;
};

function Panel(p: PanelProps) {
  if (p.tab === "ajustes") return <Adjust {...p} />;
  if (p.tab === "tempo") return <TimePanel {...p} />;
  if (p.tab === "ia") return <AiPanel {...p} />;
  if (p.tab === "ext") return <PackPanel title="Extensões" items={p.extensions} onApply={p.applyPack} onImport={(f) => p.importPack(f, "ext")} empty="" />;
  if (p.tab === "plug") return <PackPanel title="Plugins" items={p.plugins} onApply={p.applyPack} onImport={(f) => p.importPack(f, "plug")} empty="Nenhum plugin instalado. Importe quantos quiser, em qualquer formato." />;
  return null;
}

function Slider({ label, value, min, max, step = 0.01, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-[11px] text-muted-foreground"><span>{label}</span><span className="font-mono">{value.toFixed(2)}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" />
    </label>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
      {label}
      <span className={`relative h-5 w-9 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${on ? "left-4.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-4 space-y-2"><h3 className="text-[11px] font-semibold uppercase tracking-wider text-accent">{title}</h3>{children}</div>;
}

function Adjust({ selected: l, updateLayer, setLayers, importFfxDirect }: PanelProps) {
  if (!l) return <p className="text-sm text-muted-foreground">Selecione uma camada na linha do tempo.</p>;
  const setFx = (u: string, amount: number) => setLayers((ls) => ls.map((x) => (x.id === l.id ? { ...x, effects: x.effects.map((e) => (e.uid === u ? { ...e, amount } : e)) } : x)));
  const delFx = (u: string) => setLayers((ls) => ls.map((x) => (x.id === l.id ? { ...x, effects: x.effects.filter((e) => e.uid !== u) } : x)));
  return (
    <div>
      <Section title={`Camada · ${l.name}`}>
        {l.kind === "text" && (
          <div className="flex gap-2">
            <input value={l.text} onChange={(e) => updateLayer(l.id, { text: e.target.value })} className="flex-1 rounded-md border bg-secondary px-2 py-1.5 text-sm" />
            <input type="color" value={l.color} onChange={(e) => updateLayer(l.id, { color: e.target.value })} className="h-9 w-10 rounded" />
          </div>
        )}
        <Slider label="Opacidade" value={l.opacity} min={0} max={1} onChange={(v) => updateLayer(l.id, { opacity: v })} />
        <Slider label="Escala" value={l.scale} min={0.1} max={4} onChange={(v) => updateLayer(l.id, { scale: v })} />
        <Slider label="Rotação" value={l.rot} min={-180} max={180} step={1} onChange={(v) => updateLayer(l.id, { rot: v })} suffix="°" />
        <Slider label="Posição X" value={l.x} min={-800} max={800} step={1} onChange={(v) => updateLayer(l.id, { x: v })} />
        <Slider label="Posição Y" value={l.y} min={-800} max={800} step={1} onChange={(v) => updateLayer(l.id, { y: v })} />
      </Section>
      <Section title={`Efeitos aplicados (${l.effects.length})`}>
        {!l.effects.length && <p className="text-xs text-muted-foreground">Nenhum efeito. Escolha na biblioteca.</p>}
        {l.effects.map((e) => (
          <div key={e.uid} className="rounded-md border bg-card p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-primary">{EFFECT_MAP.get(e.fxId)?.name}</span>
              <button aria-label="Remover efeito" onClick={() => delFx(e.uid)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
            </div>
            <Slider label="Intensidade" value={e.amount} min={0} max={1} onChange={(v) => setFx(e.uid, v)} />
          </div>
        ))}
      </Section>
      <Section title="Especialidade · FFX do After Effects">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary bg-secondary py-3 text-sm text-primary">
          <FileBox className="h-4 w-4" /> Importar preset .ffx nesta camada
          <input type="file" accept=".ffx" hidden onChange={(e) => importFfxDirect(e.target.files)} />
        </label>
      </Section>
    </div>
  );
}

function TimePanel({ keys, setKeys, remapOn, setRemapOn, baseSpeed, setBaseSpeed, twixtor, setTwixtor, time }: PanelProps) {
  const [ks, setKs] = useState(0.5);
  return (
    <div>
      <Section title="Velocidade">
        <Slider label="Velocidade base" value={baseSpeed} min={0.1} max={4} onChange={setBaseSpeed} suffix="x" />
      </Section>
      <Section title="Time Remap">
        <Toggle on={remapOn} onChange={setRemapOn} label="Ativar Time Remap" />
        <Slider label="Velocidade do keyframe" value={ks} min={0.1} max={4} onChange={setKs} suffix="x" />
        <button onClick={() => { setKeys([...keys.filter((k) => Math.abs(k.t - time) > 0.05), { t: time, speed: ks }].sort((a, b) => a.t - b.t)); setRemapOn(true); }}
          className="w-full rounded-md bg-accent py-2 text-sm font-medium text-accent-foreground">◆ Adicionar keyframe em {fmt(time)}</button>
        <div className="space-y-1">
          {keys.map((k, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-secondary px-2 py-1 font-mono text-xs">
              <span>◆ {fmt(k.t)}</span><span className="text-primary">{k.speed.toFixed(2)}x</span>
              <button aria-label="Remover keyframe" onClick={() => setKeys(keys.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Twixtor · Motion Blur IA">
        <Toggle on={twixtor.on} onChange={(on) => setTwixtor({ ...twixtor, on })} label="Ativar Twixtor" />
        <Slider label="Motion Blur" value={twixtor.blur} min={0} max={1} onChange={(blur) => setTwixtor({ ...twixtor, blur })} />
        <button onClick={() => { setTwixtor({ on: true, blur: 0.75 }); setKeys([{ t: 0, speed: 0.15 }]); setRemapOn(true); }}
          className="w-full rounded-md bg-brand py-2 text-sm font-semibold text-primary-foreground">Super câmera lenta (0.15x + blur)</button>
        <p className="text-[11px] text-muted-foreground">O Twixtor mistura quadros vizinhos para criar câmera lenta suave com rastro de movimento.</p>
      </Section>
    </div>
  );
}

function AiPanel({ enhance, setEnhance, upscale }: PanelProps) {
  return (
    <div>
      <Section title="Topaz IA · Enhancer">
        <Toggle on={enhance.on} onChange={(on) => setEnhance({ ...enhance, on })} label="Melhorar qualidade em tempo real" />
        <Slider label="Força" value={enhance.strength} min={0} max={1} onChange={(strength) => setEnhance({ ...enhance, strength })} />
        <p className="text-[11px] text-muted-foreground">Aumenta nitidez, contraste e cor de todo o vídeo, inclusive na exportação.</p>
      </Section>
      <Section title="Topaz IA · Upscaler 4x">
        <button onClick={upscale} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow">
          <ImageUp className="h-4 w-4" /> Ampliar quadro atual 4x
        </button>
        <p className="text-[11px] text-muted-foreground">Salva o quadro atual em 4x a resolução, com reforço de nitidez.</p>
      </Section>
    </div>
  );
}

function PackPanel({ title, items, onApply, onImport, empty }: { title: string; items: Pack[]; onApply: (p: Pack) => void; onImport: (f: FileList | null) => void; empty: string }) {
  return (
    <div>
      <Section title={`${title} (${items.length})`}>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-accent bg-secondary py-3 text-sm text-accent">
          <Upload className="h-4 w-4" /> Importar (qualquer formato)
          <input type="file" multiple hidden onChange={(e) => { onImport(e.target.files); e.target.value = ""; }} />
        </label>
        {!items.length && <p className="text-xs text-muted-foreground">{empty}</p>}
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border bg-card p-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{p.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{p.desc}</div>
            </div>
            <button onClick={() => onApply(p)} className="rounded bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">Aplicar</button>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">Arquivos .ffx e .json com lista de efeitos são aplicados automaticamente.</p>
      </Section>
    </div>
  );
}

function Timeline({ layers, sel, setSel, time, duration, seek, keys, onToggle, onDelete }: {
  layers: Layer[]; sel: string | null; setSel: (id: string) => void; time: number; duration: number; seek: (t: number) => void; keys: Key[];
  onToggle: (id: string) => void; onDelete: (id: string) => void;
}) {
  const pct = duration ? (time / duration) * 100 : 0;
  return (
    <div className="flex h-full flex-col">
      <div className="relative mx-2 mt-1 h-5">
        <input type="range" aria-label="Linha do tempo" min={0} max={duration} step={0.01} value={time} onChange={(e) => seek(+e.target.value)} className="absolute inset-0 w-full" />
        {keys.map((k, i) => <span key={i} className="pointer-events-none absolute top-0 -translate-x-1/2 text-[10px] text-accent" style={{ left: `${(k.t / duration) * 100}%` }}>◆</span>)}
      </div>
      <div className="relative min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        {!layers.length && <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><Layers className="h-4 w-4" /> Sem camadas</div>}
        {[...layers].reverse().map((l) => (
          <div key={l.id} onClick={() => setSel(l.id)} className={`flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2 text-xs ${sel === l.id ? "border-primary bg-secondary" : "bg-card"}`}>
            <button aria-label="Visibilidade" onClick={(e) => { e.stopPropagation(); onToggle(l.id); }}>{l.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}</button>
            <div className={`relative h-5 flex-1 overflow-hidden rounded ${l.kind === "text" ? "bg-accent/40" : "bg-primary/25"}`}>
              <span className="absolute inset-y-0 left-2 flex items-center truncate font-medium">{l.name}{l.effects.length ? ` · ${l.effects.length} fx` : ""}</span>
              <span className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${pct}%` }} />
            </div>
            <button aria-label="Excluir camada" onClick={(e) => { e.stopPropagation(); onDelete(l.id); }}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
