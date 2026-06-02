import { Hono } from "hono";
import type { AuthEnv } from "../middleware/require-user";
import { requireUser } from "../middleware/require-user";

const watch = new Hono<AuthEnv>();

type CamType = "normal" | "360";

export type WatchCam = {
  id: string;
  label: string;
  sub: string;
  type: CamType;
  hlsUrl: string | null;
};

const CAM_DEFS: Omit<WatchCam, "hlsUrl">[] = [
  { id: "cam1", label: "Тайз",       sub: "CAM 01 · 360°", type: "360" },
  { id: "cam2", label: "Үзэгчид",    sub: "CAM 02 · 360°", type: "360" },
  { id: "cam3", label: "Панорама",   sub: "CAM 03 · 360°", type: "360" },
  { id: "cam4", label: "Хөгжимчид",  sub: "CAM 04 · 360°", type: "360" },
];

watch.get("/token", requireUser, (c) => {
  const cams: WatchCam[] = CAM_DEFS.map((cam) => ({
    ...cam,
    hlsUrl: process.env[`AWS_IVS_${cam.id.toUpperCase()}_URL`] ?? null,
  }));
  return c.json({ ok: true, data: { cams } } as const);
});

export default watch;
