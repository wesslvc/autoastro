import type { CatalogEntry } from "../catalog.js";

export type MountState = "idle" | "slewing" | "tracking" | "parking" | "parked" | "stopped";
export type SolverState = "idle" | "solving" | "centered" | "failed";

export interface CoreStatus {
  connected: boolean;
  mock: boolean;
  mount: {
    connected: boolean;
    state: MountState;
    raHours: number;
    decDegrees: number;
    altitude: number;
    azimuth: number;
    slewing: boolean;
    parked: boolean;
    tracking: boolean;
  };
  camera: {
    connected: boolean;
    model?: string;
    temperatureC: number;
    capturing: boolean;
    exposureSec: number;
    gain: number;
    binning: number;
    frameCount: number;
    exposureProgress: number;
  };
  focuser: { connected: boolean; position: number };
  solver: { state: SolverState; message: string; errorArcmin: number | null };
  target: CatalogEntry | null;
  frameVersion: number;
  serverTime: string;
  log: { time: string; message: string }[];
}

export interface Frame {
  contentType: string;
  body: Buffer | string;
}

type MaybePromise<T> = T | Promise<T>;

/** Everything the REST layer needs from "N.I.N.A.", real or simulated. */
export interface NinaAdapter {
  getStatus(): MaybePromise<CoreStatus>;
  /** Returns a Korean error message on failure, null on success. */
  goto(entry: CatalogEntry, altitude: number): MaybePromise<string | null>;
  startCapture(exposureSec: number, gain: number, binning: number): MaybePromise<string | null>;
  stopCapture(): MaybePromise<void>;
  emergencyStop(): MaybePromise<void>;
  park(): MaybePromise<void>;
  latestFrame(): MaybePromise<Frame | null>;
  histogram(): MaybePromise<number[]>;
}
