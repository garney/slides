import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { mcpAuthMiddleware } from "./auth.js";
import { createMySlidesMcpServer } from "./create-server.js";
import { InMemoryEventStore } from "./inMemoryEventStore.js";

/** @type {Map<string, { transport: StreamableHTTPServerTransport; lastActive: number }>} */
const sessions = new Map();

const MAX_SESSIONS = 50;
const SESSION_TTL_MS = 30 * 60 * 1000;

function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(pruneSessions, 60_000).unref();

/**
 * @param {import('express').Application} app
 */
export function registerMcpRoutes(app) {
  const mcpPostHandler = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];

    try {
      const session = sessionId ? sessions.get(String(sessionId)) : undefined;
      let transport;

      if (session) {
        transport = session.transport;
        session.lastActive = Date.now();
      } else if (!sessionId && isInitializeRequest(req.body)) {
        if (sessions.size >= MAX_SESSIONS) {
          res.status(503).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Too many MCP sessions" },
            id: null,
          });
          return;
        }

        const eventStore = new InMemoryEventStore();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore,
          onsessioninitialized: (sid) => {
            sessions.set(sid, { transport, lastActive: Date.now() });
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) {
            sessions.delete(sid);
          }
        };

        const server = createMySlidesMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else if (sessionId) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found" },
          id: null,
        });
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: missing MCP session" },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP POST error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  };

  const mcpSessionHandler = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId) {
      res.status(400).send("Missing session ID");
      return;
    }

    const session = sessions.get(String(sessionId));
    if (!session) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Session not found" },
        id: null,
      });
      return;
    }

    session.lastActive = Date.now();
    try {
      await session.transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP session error:", err);
      if (!res.headersSent) {
        res.status(500).send("MCP session error");
      }
    }
  };

  app.post("/mcp", mcpAuthMiddleware, mcpPostHandler);
  app.get("/mcp", mcpAuthMiddleware, mcpSessionHandler);
  app.delete("/mcp", mcpAuthMiddleware, mcpSessionHandler);
}
