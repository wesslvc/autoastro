import jpeg from "jpeg-js";
import type { CatalogEntry } from "../catalog.js";
import { equatorial, round } from "../astro.js";
import { logger } from "../logger.js";
import type { CoreStatus, Frame, MountState, NinaAdapter } from "./types.js";

/**
 * Adapter for the N.I.N.A. "Advanced API" plugin (v2, REST, default port 1888).
 * The web app never talks to hardware directly: N.I.N.A. stays the only controller.
 * Endpoint names follow the plugin's published OpenAPI document (api_spec.yaml).
 */

interface ApiEnvelope<T = unknown> {
  Response: T;
  Error: string;
  StatusCode: number;
  Success: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Info = Record<string, any>;

const FAST_MS = 2500;
const SLOW_MS = 180_000;

export class RealNina implements NinaAdapter {
  private base: string;
  private target: CatalogEntry | null = null;
  private solver: CoreStatus["solver"] = { state: "idle", message: "대기 중", errorArcmin: null };
  private stopped = false;
  private gotoRunning = false;

  private capturing = false;
  private captureRun = 0;
  private exposureSec = 3;
  private gain = 252;
  private binning = 1;
  private frameCount = 0;
  private exposureStart = 0;
  private frameVersion = 0;
  private lastFrame: Frame | null = null;
  private lastHist: number[] = new Array(64).fill(0);
  private log: { time: string; message: string }[] = [];

  constructor(url: string) {
    this.base = url.replace(/\/+$/, "");
  }

  private addLog(message: string) {
    this.log.unshift({ time: new Date().toISOString(), message });
    this.log.length = Math.min(this.log.length, 12);
  }

  private async call<T = unknown>(path: string, query: Record<string, string | number | boolean> = {}, timeoutMs = FAST_MS): Promise<ApiEnvelope<T>> {
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
    const res = await fetch(`${this.base}${path}${qs ? `?${qs}` : ""}`, { signal: AbortSignal.timeout(timeoutMs) });
    const json = (await res.json()) as ApiEnvelope<T>;
    return json;
  }

  private async info(path: string): Promise<Info | null> {
    try {
      const r = await this.call<Info>(path);
      return r.Success && r.Response ? r.Response : null;
    } catch {
      return null;
    }
  }

  async getStatus(): Promise<CoreStatus> {
    const [mount, camera, focuser] = await Promise.all([
      this.info("/equipment/mount/info"),
      this.info("/equipment/camera/info"),
      this.info("/equipment/focuser/info"),
    ]);
    const reachable = mount !== null || camera !== null || focuser !== null;
    const mountOk = !!mount && mount.Connected !== false;
    const cameraOk = !!camera && camera.Connected !== false;
    const focuserOk = !!focuser && focuser.Connected !== false;

    const slewing = !!mount?.Slewing;
    const parked = !!mount?.AtPark;
    const tracking = !!mount?.TrackingEnabled && !parked;
    let state: MountState = "idle";
    if (parked) state = "parked";
    else if (slewing) state = "slewing";
    else if (this.stopped) state = "stopped";
    else if (tracking) state = "tracking";

    const exposing = camera?.CameraState === "Exposing" || !!camera?.IsExposing;
    const period = Math.max(this.exposureSec, 0.5) * 1000;
    const progress = this.capturing && exposing ? Math.min(1, (Date.now() - this.exposureStart) / period) : 0;

    return {
      connected: reachable && (mountOk || cameraOk),
      mock: false,
      mount: {
        connected: mountOk,
        state,
        raHours: round(Number(mount?.RightAscension ?? 0), 4),
        decDegrees: round(Number(mount?.Declination ?? 0), 3),
        altitude: round(Number(mount?.Altitude ?? 0), 1),
        azimuth: round(Number(mount?.Azimuth ?? 0), 1),
        slewing,
        parked,
        tracking,
      },
      camera: {
        connected: cameraOk,
        model: camera?.Name ?? camera?.DisplayName,
        temperatureC: round(Number(camera?.Temperature ?? 0), 1),
        capturing: this.capturing,
        exposureSec: this.exposureSec,
        gain: this.capturing ? this.gain : Number(camera?.Gain ?? this.gain),
        binning: Number(camera?.BinX ?? this.binning),
        frameCount: this.frameCount,
        exposureProgress: progress,
      },
      focuser: { connected: focuserOk, position: Number(focuser?.Position ?? 0) },
      solver: { ...this.solver },
      target: this.target,
      frameVersion: this.frameVersion,
      serverTime: new Date().toISOString(),
      log: this.log,
    };
  }

  async goto(entry: CatalogEntry, altitude: number): Promise<string | null> {
    if (altitude <= 0) return `${entry.name}은(는) 지금 지평선 아래에 있어 GoTo할 수 없습니다.`;
    if (this.gotoRunning) return "이미 GoTo가 진행 중입니다.";
    try {
      const mount = await this.info("/equipment/mount/info");
      if (!mount) return "N.I.N.A. 마운트에 연결되어 있지 않습니다.";
      await this.stopCaptureLoop();
      if (mount.AtPark) {
        const r = await this.call<string>("/equipment/mount/unpark", {}, 30_000);
        if (!r.Success) return `파킹 해제 실패: ${r.Error}`;
        this.addLog("파킹 해제");
      }
      const eq = equatorial(entry, new Date());
      this.stopped = false;
      this.target = entry;
      this.solver = { state: "solving", message: "슬루 및 플레이트솔빙 중...", errorArcmin: null };
      this.gotoRunning = true;
      this.addLog(`GoTo + 센터링 시작: ${entry.name}`);
      void this.runCenter(entry, eq.raHours * 15, eq.decDegrees);
      return null;
    } catch (err) {
      logger.error({ err }, "N.I.N.A. goto failed");
      return "N.I.N.A.에 연결할 수 없습니다.";
    }
  }

  /** Slew + center is one long-running API call; track its outcome in the background. */
  private async runCenter(entry: CatalogEntry, raDeg: number, decDeg: number) {
    try {
      const r = await this.call<string>(
        "/equipment/mount/slew",
        { ra: raDeg, dec: decDeg, center: true, waitForResult: true },
        SLOW_MS,
      );
      if (this.stopped) return;
      if (r.Success && r.Response !== "Slew failed") {
        this.solver = { state: "centered", message: "센터링 완료", errorArcmin: null };
        this.addLog(`센터링 완료: ${entry.name}`);
      } else {
        this.solver = { state: "failed", message: r.Error || "센터링 실패", errorArcmin: null };
        this.addLog(`센터링 실패: ${r.Error || "알 수 없는 오류"}`);
      }
    } catch (err) {
      if (!this.stopped) {
        logger.error({ err }, "N.I.N.A. slew/center failed");
        this.solver = { state: "failed", message: "N.I.N.A. 응답 없음", errorArcmin: null };
        this.addLog("센터링 중 N.I.N.A. 응답 없음");
      }
    } finally {
      this.gotoRunning = false;
    }
  }

  async startCapture(exposureSec: number, gain: number, binning: number): Promise<string | null> {
    const mount = await this.info("/equipment/mount/info");
    if (mount?.AtPark) return "마운트가 파킹 상태입니다. 먼저 대상으로 GoTo 하세요.";
    if (this.gotoRunning || mount?.Slewing) return "슬루 중에는 촬영을 시작할 수 없습니다.";
    if (!(await this.info("/equipment/camera/info"))) return "N.I.N.A. 카메라에 연결되어 있지 않습니다.";
    await this.stopCaptureLoop();
    this.exposureSec = exposureSec;
    this.gain = gain;
    this.binning = binning;
    this.frameCount = 0;
    this.capturing = true;
    this.stopped = false;
    const run = ++this.captureRun;
    this.addLog(`촬영 시작: ${exposureSec}초, 게인 ${gain}`);
    void this.captureLoop(run);
    return null;
  }

  private async captureLoop(run: number) {
    try {
      await this.call("/equipment/camera/set-binning", { binning: `${this.binning}x${this.binning}` }).catch(() => undefined);
      while (this.capturing && run === this.captureRun) {
        this.exposureStart = Date.now();
        const res = await fetch(
          `${this.base}/equipment/camera/capture?${new URLSearchParams({
            duration: String(this.exposureSec),
            gain: String(this.gain),
            stream: "true",
            waitForResult: "true",
            quality: "85",
            save: "false",
            imageType: "SNAPSHOT",
            targetName: this.target?.name ?? "",
          })}`,
          { signal: AbortSignal.timeout(this.exposureSec * 1000 + 60_000) },
        );
        if (run !== this.captureRun) return;
        const type = res.headers.get("content-type") ?? "";
        if (!type.startsWith("image/")) {
          const body = (await res.json().catch(() => null)) as ApiEnvelope | null;
          throw new Error(body?.Error || `촬영 실패 (${res.status})`);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        this.lastFrame = { contentType: type, body: buf };
        this.lastHist = type.includes("jpeg") || type.includes("jpg") ? this.jpegHistogram(buf) : this.lastHist;
        this.frameCount += 1;
        this.frameVersion += 1;
      }
    } catch (err) {
      if (run === this.captureRun) {
        logger.error({ err }, "N.I.N.A. capture failed");
        this.addLog(`촬영 중단: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
        this.capturing = false;
      }
    }
  }

  private jpegHistogram(buf: Buffer): number[] {
    try {
      const { data } = jpeg.decode(buf, { useTArray: true });
      const bins = new Array<number>(64).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i]! * 299 + data[i + 1]! * 587 + data[i + 2]! * 114) / 1000;
        bins[Math.min(63, Math.floor(lum / 4))]! += 1;
      }
      return bins;
    } catch {
      return this.lastHist;
    }
  }

  private async stopCaptureLoop() {
    if (!this.capturing) return;
    this.capturing = false;
    this.captureRun += 1;
    await this.call("/equipment/camera/abort-exposure").catch(() => undefined);
  }

  async stopCapture() {
    if (this.capturing) this.addLog("촬영 정지");
    await this.stopCaptureLoop();
  }

  async emergencyStop() {
    this.stopped = true;
    this.capturing = false;
    this.captureRun += 1;
    this.solver = { state: "idle", message: "긴급 정지됨", errorArcmin: null };
    this.addLog("긴급 정지: 슬루와 촬영을 중지합니다");
    // Fire both stop commands in parallel; either may fail if that device is not connected.
    await Promise.allSettled([
      this.call("/equipment/mount/slew/stop"),
      this.call("/equipment/camera/abort-exposure"),
    ]);
  }

  async park() {
    await this.stopCaptureLoop();
    this.solver = { state: "idle", message: "파킹 중...", errorArcmin: null };
    this.addLog("파킹 시작");
    try {
      await this.call("/equipment/mount/park", {}, 60_000);
    } catch (err) {
      logger.error({ err }, "N.I.N.A. park failed");
      this.addLog("파킹 요청 실패");
    }
  }

  latestFrame(): Frame | null {
    return this.lastFrame;
  }

  histogram(): number[] {
    return this.lastHist;
  }
}
