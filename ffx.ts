import { BASES, EFFECTS } from "./effects";

/** Lê um preset .ffx do After Effects (formato binário RIFX) e encontra os efeitos usados. */
export async function parseFfx(file: File): Promise<{ effectIds: string[]; found: string[] }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const strings: string[] = [];
  let cur = "";
  for (const b of buf) {
    if (b >= 32 && b < 127) cur += String.fromCharCode(b);
    else {
      if (cur.length >= 4) strings.push(cur);
      cur = "";
    }
  }
  if (cur.length >= 4) strings.push(cur);
  const text = strings.join("\n").toLowerCase();

  const effectIds: string[] = [];
  const found: string[] = [];
  BASES.forEach((b, bi) => {
    const keys = [b.name, ...(b.aeMatch ?? [])].map((k) => k.toLowerCase());
    if (keys.some((k) => text.includes(k))) {
      const id = `fx-${bi}-0`;
      if (EFFECTS.some((e) => e.id === id)) {
        effectIds.push(id);
        found.push(b.name);
      }
    }
  });
  return { effectIds, found };
}
