import * as Astronomy from "astronomy-engine";
import type { CatalogEntry } from "./catalog";

const lat = Number(process.env["OBSERVER_LAT"] ?? 37.5665);
const lon = Number(process.env["OBSERVER_LON"] ?? 126.978);
const observer = new Astronomy.Observer(lat, lon, 30);

export interface SkyPosition {
  raHours: number;
  decDegrees: number;
  altitude: number;
  azimuth: number;
}

/** Equatorial position (J2000 for catalog objects, of-date for solar-system bodies). */
export function equatorial(entry: CatalogEntry, date: Date): { raHours: number; decDegrees: number } {
  if (entry.body) {
    const eq = Astronomy.Equator(entry.body as Astronomy.Body, date, observer, false, true);
    return { raHours: eq.ra, decDegrees: eq.dec };
  }
  return { raHours: entry.raHours, decDegrees: entry.decDegrees };
}

export function horizontal(raHours: number, decDegrees: number, date: Date) {
  const h = Astronomy.Horizon(date, observer, raHours, decDegrees, "normal");
  return { altitude: round(h.altitude, 1), azimuth: round(h.azimuth, 1) };
}

export function skyPosition(entry: CatalogEntry, date: Date): SkyPosition {
  const eq = equatorial(entry, date);
  return { ...eq, ...horizontal(eq.raHours, eq.decDegrees, date) };
}

export function altitudeCurve(entry: CatalogEntry, from: Date) {
  const out: { hoursFromNow: number; altitude: number }[] = [];
  for (let h = 0; h <= 12; h++) {
    const d = new Date(from.getTime() + h * 3600_000);
    out.push({ hoursFromNow: h, altitude: skyPosition(entry, d).altitude });
  }
  return out;
}

export function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
