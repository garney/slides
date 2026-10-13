import { config } from "../config/env.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function mcpAuthMiddleware(req, res, next) {
  if (!config.mcp.enabled) {
    res.status(404).json({ error: "MCP is disabled" });
    return;
  }

  const expected = config.mcp.apiKey;
  if (!expected) {
    if (config.supabase.enabled) {
      res.status(503).json({
        error: "MCP_API_KEY is required when Supabase auth is enabled",
      });
      return;
    }
    next();
    return;
  }

  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
