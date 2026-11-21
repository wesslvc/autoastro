import type { CatalogEntry } from "../catalog.js";
import { horizontal, equatorial, round } from "../astro.js";
import type { CoreStatus, Frame, MountState, NinaAdapter, SolverState } from "./types.js";
import { histogram, renderFrame } from "./frame.js";

/**
 * Built-in simulation of N.I.N.A. + Advanced API plugin, so the app can be
 * developed and demoed without real equipment. All state lives in memory.
 */

interface Slew {
  fromRa: number;
  fromDec: number;
  toRa: number;
  toDec: number;
  start: number;
  duration: number;
  kind: "goto" | "park";
}

const SOLVE_MS = 3500;
const PARK_DEC = 89.9;

export class MockNina implements NinaAdapter {
  private mountState: MountState = "parked";
  private ra = 0;
  private dec = PARK_DEC;
  private slew: Slew | null = null;
  private solveStart = 0;
  private target: CatalogEntry | null = null;
  private solver: { state: SolverState; message: string; errorArcmin: number | null } = {
    state: "idle",
    message: "대기 중",
    errorArcmin: null,
  };

  private capturing = false;
  private exposureSec = 3;
  private gain = 252;
  private binning = 1;
  private frameCount = 0;
  private exposureStart = 0;
  frameVersion = 0;
  /** Target imaged in the most recent frame (used to render the preview). */
  frameTarget: CatalogEntry | null = null;
  frameStack = 0;
  frameExposure = 3;
  frameGain = 252;

  private log: { time: string; message: string }[] = [];

  constructor() {
    this.addLog("N.I.N.A. 시뮬레이터 시작 (마운트 파킹 상태)");
    setInterval(() => this.tick(), 200).unref();
  }

  private addLog(message: string) {
    this.log.unshift({ time: new Date().toISOString(), message });
    this.log.length = Math.min(this.log.length, 12);
  }

  private currentPosition(now: number) {
    if (!this.slew) return { ra: this.ra, dec: this.dec };
    const s = this.slew;
    const t = Math.min(1, Math.max(0, (now - s.start) / s.duration));
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    let dRa = s.toRa - s.fromRa;
    if (dRa > 12) dRa -= 24;
    if (dRa < -12) dRa += 24;
    return {
      ra: (s.fromRa + dRa * ease + 24) % 24,
      dec: s.fromDec + (s.toDec - s.fromDec) * ease,
    };
  }

  private tick() {
    const now = Date.now();

    if (this.slew && now >= this.slew.start + this.slew.duration) {
      const s = this.slew;
      this.ra = s.toRa;
      this.dec = s.toDec;
      this.slew = null;
      if (s.kind === "park") {
        this.mountState = "parked";
        this.addLog("파킹 완료");
      } else {
        this.mountState = "tracking";
        this.solver = { state: "solving", message: "플레이트솔빙 중...", errorArcmin: 38 };
        this.solveStart = now;
        this.addLog("슬루 완료, 플레이트솔빙 시작");
      }
    }

    if (this.solver.state === "solving") {
      const t = Math.min(1, (now - this.solveStart) / SOLVE_MS);
      this.solver.errorArcmin = round(38 * (1 - t) + 0.4 * t, 1);
      if (t >= 1) {
        this.solver = { state: "centered", message: "센터링 완료", errorArcmin: 0.4 };
        this.addLog(`센터링 완료: ${this.target?.name ?? ""}`);
      }
    }

    if (this.capturing) {
      const period = Math.max(this.exposureSec, 0.5) * 1000;
      if (now - this.exposureStart >= period) {
        this.exposureStart = now;
        this.frameCount += 1;
        this.frameVersion += 1;
        this.frameTarget = this.target;
        this.frameStack = this.frameCount;
        this.frameExposure = this.exposureSec;
        this.frameGain = this.gain;
      }
    }
  }

  getStatus(): CoreStatus {
    const now = Date.now();
    const pos = this.currentPosition(now);
    const hz = horizontal(pos.ra, pos.dec, new Date(now));
    const period = Math.max(this.exposureSec, 0.5) * 1000;
    const slewing = this.mountState === "slewing" || this.mountState === "parking";
    return {
      connected: true,
      mock: true,
      mount: {
        connected: true,
        state: this.mountState,
        raHours: round(pos.ra, 4),
        decDegrees: round(pos.dec, 3),
        altitude: hz.altitude,
        azimuth: hz.azimuth,
        slewing,
        parked: this.mountState === "parked",
        tracking: this.mountState === "tracking",
      },
      camera: {
        connected: true,
        model: "ZWO ASI585MC",
        temperatureC: round(-10 + Math.sin(now / 15000) * 0.2, 1),
        capturing: this.capturing,
        exposureSec: this.exposureSec,
        gain: this.gain,
        binning: this.binning,
        frameCount: this.frameCount,
        exposureProgress: this.capturing
          ? Math.min(1, Math.max(0, (now - this.exposureStart) / period))
          : 0,
      },
      focuser: { connected: true, position: 12450 },
      solver: { ...this.solver },
      target: this.target,
      frameVersion: this.frameVersion,
      serverTime: new Date(now).toISOString(),
      log: this.log,
    };
  }

  latestFrame(): Frame | null {
    if (this.frameVersion === 0) return null;
    return {
      contentType: "image/svg+xml",
      body: renderFrame(this.frameTarget, this.frameStack, this.frameExposure, this.frameGain),
    };
  }

  histogram(): number[] {
    return histogram(this.frameExposure, this.frameGain, this.frameStack);
  }

  /** Returns an error message (Korean) on failure. */
  goto(entry: CatalogEntry, altitude: number): string | null {
    if (altitude <= 0) {
      return `${entry.name}은(는) 지금 지평선 아래에 있어 GoTo할 수 없습니다.`;
    }
    if (this.mountState === "parking") return "파킹 중에는 GoTo할 수 없습니다.";
    const now = Date.now();
    const from = this.currentPosition(now);
    const eq = equatorial(entry, new Date(now));
    let dRa = Math.abs(eq.raHours - from.ra) * 15;
    if (dRa > 180) dRa = 360 - dRa;
    const dist = Math.hypot(dRa, eq.decDegrees - from.dec);
    this.capturing = false;
    this.target = entry;
    this.solver = { state: "idle", message: "슬루 중...", errorArcmin: null };
    this.slew = {
      fromRa: from.ra,
      fromDec: from.dec,
      toRa: eq.raHours,
      toDec: eq.decDegrees,
      start: now,
      duration: Math.min(9000, Math.max(2500, (dist / 12) * 1000)),
      kind: "goto",
    };
    this.mountState = "slewing";
    this.addLog(`GoTo 시작: ${entry.name}`);
    return null;
  }

  startCapture(exposureSec: number, gain: number, binning: number): string | null {
    if (this.mountState === "parked") return "마운트가 파킹 상태입니다. 먼저 대상으로 GoTo 하세요.";
    if (this.mountState === "slewing" || this.mountState === "parking") {
      return "슬루 중에는 촬영을 시작할 수 없습니다.";
    }
    this.exposureSec = exposureSec;
    this.gain = gain;
    this.binning = binning;
    this.frameCount = 0;
    this.exposureStart = Date.now();
    this.capturing = true;
    this.addLog(`촬영 시작: ${exposureSec}초, 게인 ${gain}`);
    return null;
  }

  stopCapture() {
    if (this.capturing) this.addLog("촬영 정지");
    this.capturing = false;
  }

  emergencyStop() {
    const now = Date.now();
    const pos = this.currentPosition(now);
    this.ra = pos.ra;
    this.dec = pos.dec;
    this.slew = null;
    this.capturing = false;
    this.mountState = "stopped";
    this.solver = { state: "idle", message: "긴급 정지됨", errorArcmin: null };
    this.addLog("긴급 정지: 슬루와 촬영을 중지했습니다");
  }

  park() {
    const now = Date.now();
    const from = this.currentPosition(now);
    this.capturing = false;
    this.solver = { state: "idle", message: "파킹 중...", errorArcmin: null };
    this.slew = {
      fromRa: from.ra,
      fromDec: from.dec,
      toRa: from.ra,
      toDec: PARK_DEC,
      start: now,
      duration: 4000,
      kind: "park",
    };
    this.mountState = "parking";
    this.addLog("파킹 시작");
  }
}


