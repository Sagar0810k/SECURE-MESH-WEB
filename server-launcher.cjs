// Tiny custom Next.js server launcher: logs every request (method, url,
// status, duration) to a log file while keeping the app production-ready.
const http = require("http");
const fs = require("fs");
const next = require("next");

const LOG = process.env.SERVER_LOG || "C:\\Users\\offic\\AppData\\Local\\Temp\\opencode\\secure-mesh-server.log";
const log = (line) => fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${line}\n`);

async function main() {
  const app = next({ production: true });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = http.createServer((req, res) => {
    const started = Date.now();
    const onEnd = () => log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - started}ms)`);
    const origEnd = res.end.bind(res);
    res.end = (chunk, ...args) => {
      const r = origEnd(chunk, ...args);
      onEnd();
      return r;
    };
    void handle(req, res);
  });

  server.listen(3000, "0.0.0.0", () => {
    log("server listening on http://localhost:3000");
    console.log("server started on 3000");
  });

  const onTerm = (signal) => {
    log(`server shutting down (${signal})`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on("SIGINT", () => onTerm("SIGINT"));
  process.on("SIGTERM", () => onTerm("SIGTERM"));
}

main().catch((err) => {
  log(`server error: ${err && err.stack ? err.stack : String(err)}`);
  console.error(err);
  process.exit(1);
});
