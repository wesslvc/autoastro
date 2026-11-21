import express from "express";
import router from "./_lib/routes";

const app = express();
app.use(express.json());
app.use("/api", router);
// Express 5 forwards rejected async handlers here.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

export default app;
