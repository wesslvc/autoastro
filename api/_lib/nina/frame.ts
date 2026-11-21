import type { CatalogEntry } from "../catalog";

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Synthetic grayscale preview frame (16:9, like the ASI585MC). */
export function renderFrame(target: CatalogEntry | null, stack: number, exposure: number, gain: number): string {
  const W = 640;
  const H = 360;
  const seed = hash(target?.id ?? "field");
  const r = rng(seed);
  const brightness = Math.min(1, 0.35 + (Math.log10(exposure * 10 + 1) * gain) / 900);
  const noiseOpacity = Math.max(0.05, 0.55 / Math.sqrt(Math.max(stack, 1)));
  const typ = target?.type ?? "";
  const isGalaxy = typ.includes("은하");
  const isNebula = typ.includes("성운") || typ.includes("잔해");

  let blobs = "";
  if (isGalaxy) {
    const rot = Math.round(r() * 180);
    blobs += `<g transform="rotate(${rot} 320 180)"><ellipse cx="320" cy="180" rx="150" ry="40" fill="url(#core)" filter="url(#blur)"/></g>`;
  } else if (isNebula) {
    for (let i = 0; i < 7; i++) {
      const cx = 200 + r() * 240;
      const cy = 110 + r() * 140;
      const rr = 50 + r() * 90;
      blobs += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rr.toFixed(0)}" fill="url(#core)" opacity="${(0.35 + r() * 0.4).toFixed(2)}" filter="url(#blur)"/>`;
    }
  } else {
    blobs += `<circle cx="320" cy="180" r="14" fill="url(#core)" filter="url(#blur)"/>`;
  }

  const starCount = typ.includes("성단") ? 260 : 150;
  let stars = "";
  for (let i = 0; i < starCount; i++) {
    const x = r() * W;
    const y = r() * H;
    const m = Math.pow(r(), 3);
    const rad = 0.5 + m * 2.6;
    const op = Math.min(1, (0.35 + m) * (0.6 + brightness));
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" opacity="${op.toFixed(2)}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<radialGradient id="core"><stop offset="0" stop-color="#fff" stop-opacity="${(0.9 * brightness).toFixed(2)}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="blur"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${stack % 997}"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="#050505"/>
${blobs}
${stars}
<rect width="${W}" height="${H}" filter="url(#noise)" opacity="${noiseOpacity.toFixed(2)}" style="mix-blend-mode:screen"/>
</svg>`;
}

/** 64-bin histogram shaped like a typical sky-background peak. */
export function histogram(exposure: number, gain: number, stack: number): number[] {
  const peak = Math.min(30, 3 + (Math.log10(exposure * 10 + 1) * gain) / 60);
  const width = Math.max(1.5, 5 / Math.sqrt(Math.max(stack, 1)) + 1);
  const bins: number[] = [];
  for (let i = 0; i < 64; i++) {
    const gauss = Math.exp(-Math.pow((i - peak) / width, 2) / 2) * 90000;
    const tail = i > peak ? 4000 * Math.exp(-(i - peak) / 12) : 0;
    bins.push(Math.round(gauss + tail + (i > 58 ? 40 : 0)));
  }
  return bins;
}
