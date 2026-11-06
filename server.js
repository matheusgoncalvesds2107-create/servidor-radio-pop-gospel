const http = require("http");
const { URL } = require("url");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const PANEL_TOKEN = process.env.POP_GOSPEL_PANEL_TOKEN || process.env.PANEL_TOKEN || "";
const RADIO_NAME = "Radio Pop Gospel";

let sourceSocket = null;
let sourceConnectedAt = null;
let currentTrack = "";
let totalBytes = 0;
let listeners = new Set();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  const json = (status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify(data));
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  if (path === "/" || path === "/health" || path === "/api/health") {
    return json(200, {
      status: "online",
      radio: RADIO_NAME,
      service: "servidor-radio-pop-gospel",
      sourceConnected: Boolean(sourceSocket && sourceSocket.readyState === WebSocket.OPEN),
      listeners: listeners.size,
      receivingAudio: Boolean(sourceSocket && sourceSocket.readyState === WebSocket.OPEN),
      currentTrack: currentTrack || null,
      totalBytes
    });
  }

  if (path === "/radio.mp3" || path === "/stream" || path === "/pop-gospel/radio.mp3") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "icy-name": RADIO_NAME,
      "icy-genre": "Gospel Pop"
    });
    if (req.method === "HEAD") return res.end();

    listeners.add(res);
    req.on("close", () => listeners.delete(res));
    return;
  }

  if (path === "/" && req.method === "GET") {
    const fs = require("fs");
    const indexPath = require("path").join(__dirname, "public", "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache"
      });
      return res.end(fs.readFileSync(indexPath));
    }
  }

  return json(404, { status: "error", error: "Rota nao encontrada" });
});

const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: 0
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const acceptedPaths = new Set(["/source-ws", "/pop-gospel/source-ws"]);

  if (!acceptedPaths.has(url.pathname)) {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    return socket.destroy();
  }

  if (!PANEL_TOKEN) {
    socket.write("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    return socket.destroy();
  }

  const suppliedToken = req.headers["x-pop-gospel-token"] || req.headers["x-panel-token"];
  if (typeof suppliedToken !== "string" || suppliedToken !== PANEL_TOKEN) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    return socket.destroy();
  }

  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit("connection", ws, req);
  });
});

function broadcast(chunk) {
  for (const response of listeners) {
    if (!response.destroyed && !response.writableEnded) {
      const ok = response.write(chunk);
      // If a listener is slow, Node's response stream will apply backpressure.
      if (!ok) response.once("drain", () => {});
    }
  }
}

wss.on("connection", ws => {
  if (sourceSocket && sourceSocket !== ws) {
    try { sourceSocket.close(4000, "Outra fonte conectou"); } catch {}
  }

  sourceSocket = ws;
  sourceConnectedAt = new Date().toISOString();
  currentTrack = "Radio Pop Gospel • AO VIVO";

  ws.on("message", (data, isBinary) => {
    if (sourceSocket !== ws || !isBinary) return;
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (!chunk.length) return;
    totalBytes += chunk.length;
    broadcast(chunk);
  });

  const clearSource = () => {
    if (sourceSocket === ws) {
      sourceSocket = null;
      sourceConnectedAt = null;
      currentTrack = "";
    }
  };

  ws.on("close", clearSource);
  ws.on("error", clearSource);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`${RADIO_NAME}: servidor independente ativo na porta ${PORT}`);
  console.log("Audio publico: /radio.mp3");
  console.log("WebSocket de origem: /source-ws");
});
