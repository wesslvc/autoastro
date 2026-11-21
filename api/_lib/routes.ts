import { Router, type IRouter } from "express";
import {
  GetTargetParams,
  SearchTargetsQueryParams,
  StartCaptureBody,
  StartGotoBody,
} from "./schemas";
import { searchCatalog, findEntry, type CatalogEntry } from "./catalog";
import { altitudeCurve, skyPosition } from "./astro";
import { nina } from "./nina";

const router: IRouter = Router();

const PRESETS = [
  { id: "nebula", name: "성운 3초 / 게인 252", exposureSec: 3, gain: 252, binning: 1 },
  { id: "galaxy", name: "은하 5초 / 게인 300", exposureSec: 5, gain: 300, binning: 1 },
  { id: "cluster", name: "성단 1초 / 게인 150", exposureSec: 1, gain: 150, binning: 1 },
  { id: "planet", name: "행성 짧은 노출", exposureSec: 0.01, gain: 200, binning: 1 },
  { id: "moon", name: "달 아주 짧은 노출", exposureSec: 0.002, gain: 50, binning: 1 },
];

function toTarget(entry: CatalogEntry, withCurve = false) {
  const now = new Date();
  const pos = skyPosition(entry, now);
  return {
    id: entry.id,
    name: entry.name,
    catalogId: entry.catalogId,
    type: entry.type,
    constellation: entry.constellation,
    magnitude: entry.magnitude,
    raHours: Math.round(pos.raHours * 10000) / 10000,
    decDegrees: Math.round(pos.decDegrees * 1000) / 1000,
    altitude: pos.altitude,
    azimuth: pos.azimuth,
    aboveHorizon: pos.altitude > 0,
    ...(withCurve ? { altitudeCurve: altitudeCurve(entry, now) } : {}),
  };
}

/** Status with the target's live altitude/azimuth filled in. */
async function status() {
  const s = await nina.getStatus();
  const entry = s.target;
  return { ...s, target: entry ? toTarget(entry) : null };
}

router.get("/status", async (_req, res) => {
  res.json(await status());
});

router.get("/targets", (req, res) => {
  const { q } = SearchTargetsQueryParams.parse(req.query);
  res.json(searchCatalog(q).slice(0, 30).map((e) => toTarget(e)));
});

router.get("/targets/:targetId", (req, res) => {
  const { targetId } = GetTargetParams.parse(req.params);
  const entry = findEntry(targetId);
  if (!entry) {
    res.status(404).json({ error: "대상을 찾을 수 없습니다." });
    return;
  }
  res.json(toTarget(entry, true));
});

router.post("/goto", async (req, res) => {
  const parsed = StartGotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "잘못된 요청입니다." });
    return;
  }
  const entry = findEntry(parsed.data.targetId);
  if (!entry) {
    res.status(400).json({ error: "대상을 찾을 수 없습니다." });
    return;
  }
  const err = await nina.goto(entry, skyPosition(entry, new Date()).altitude);
  if (err) {
    res.status(400).json({ error: err });
    return;
  }
  res.json(await status());
});

router.post("/capture/start", async (req, res) => {
  const parsed = StartCaptureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "노출 시간 또는 게인 값이 올바르지 않습니다." });
    return;
  }
  const { exposureSec, gain, binning } = parsed.data;
  const err = await nina.startCapture(exposureSec, gain, binning ?? 1);
  if (err) {
    res.status(400).json({ error: err });
    return;
  }
  res.json(await status());
});

router.post("/capture/stop", async (_req, res) => {
  await nina.stopCapture();
  res.json(await status());
});

router.get("/presets", (_req, res) => {
  res.json(PRESETS);
});

router.post("/emergency-stop", async (_req, res) => {
  await nina.emergencyStop();
  res.json(await status());
});

router.post("/park", async (_req, res) => {
  await nina.park();
  res.json(await status());
});

router.get("/image/histogram", async (_req, res) => {
  res.json({ bins: await nina.histogram() });
});

router.get("/image/latest", async (_req, res) => {
  const frame = await nina.latestFrame();
  if (!frame) {
    res.status(404).json({ error: "아직 촬영된 이미지가 없습니다." });
    return;
  }
  res.set("Cache-Control", "no-store");
  res.type(frame.contentType).send(frame.body);
});

export default router;
