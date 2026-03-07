import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createPortfolioDataProvider } from "./src/data-provider.js";
import { buildDashboardSpec } from "./src/agent/build-dashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/api/runQuery", async (req, res) => {
  try {
    const { name, params = {} } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'name'" });
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const dataProvider = createPortfolioDataProvider({ page, pageSize: pageSize + 1 });
    const result = await dataProvider.runQuery({ name, params });
    const rows = Array.isArray(result) ? result : [result];

    res.json({
      data: rows.slice(0, pageSize),
      hasMore: rows.length > pageSize,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/generateSpec", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await buildDashboardSpec({ prompt: prompt.trim() });
    res.json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    res.status(status).json({ error: message });
  }
});

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Reporting portfolio example listening on http://localhost:${port}`);
});
