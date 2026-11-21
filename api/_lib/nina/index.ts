import { logger } from "../logger.js";
import { MockNina } from "./mockNina.js";
import { RealNina } from "./realNina.js";
import type { NinaAdapter } from "./types.js";

/**
 * NINA_API_URL (e.g. http://localhost:1888/v2/api) selects the real N.I.N.A.
 * Advanced API plugin. Without it the built-in simulator is used.
 */
const url = process.env["NINA_API_URL"];

export const nina: NinaAdapter = url ? new RealNina(url) : new MockNina();

logger.info({ mode: url ? "real" : "mock", url }, "N.I.N.A. adapter selected");
