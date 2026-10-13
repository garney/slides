import "dotenv/config";
import http from "node:http";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.js";
import { ensureSchema } from "./db/pool.js";
import { registerRoutes } from "./routes/api.js";
import { registerMcpRoutes } from "./mcp/routes.js";
import { ensureAssetsBucket } from "./services/s3-assets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, "../client");
const clientDist = path.resolve(__dirname, "../dist/client");
const isProd = process.env.NODE_ENV === "production";

async function start() {
  await ensureSchema();
  if (config.assets.enabled) {
    try {
      await ensureAssetsBucket();
      console.log(`Asset storage bucket ready: ${config.assets.bucket}`);
    } catch (err) {
      console.warn("Asset storage not ready:", err instanceof Error ? err.message : err);
    }
  }

  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));
  registerRoutes(app);
  if (config.mcp.enabled) {
    registerMcpRoutes(app);
    console.log("MCP Streamable HTTP mounted at /mcp");
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    const message = err instanceof Error ? err.message : "Server error";
    res.status(400).json({ error: message });
  });

  const server = http.createServer(app);

  if (isProd) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/mcp")) {
        next();
        return;
      }
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.join(clientRoot, "vite.config.js"),
      server: {
        middlewareMode: true,
        hmr: {
          server,
          path: "/vite-hmr",
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  server.listen(config.port, () => {
    console.log(`slides listening on http://localhost:${config.port}`);
    if (!config.supabase.enabled) {
      console.warn("Supabase auth disabled - set SUPABASE_URL and SUPABASE_ANON_KEY before deploy");
    }
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
