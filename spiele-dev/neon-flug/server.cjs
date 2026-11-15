// Lokale Vorschau mit den tatsächlichen _headers-Regeln, keine Veröffentlichung.
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const rules = [];
let current;
for (const line of fs
  .readFileSync(path.join(ROOT, "_headers"), "utf8")
  .split("\n")) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  if (!/^\s/.test(line)) {
    current = { pattern: line.trim(), lines: [] };
    rules.push(current);
  } else if (current) current.lines.push(line.trim());
}
function headersFor(url) {
  const headers = {};
  for (const rule of rules) {
    const expression =
      "^" +
      rule.pattern
        .split("*")
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*") +
      "$";
    if (!new RegExp(expression).test(url)) continue;
    for (const line of rule.lines) {
      if (line.startsWith("! ")) {
        delete headers[line.slice(2).toLowerCase()];
        continue;
      }
      const split = line.indexOf(":");
      if (split > 0)
        headers[line.slice(0, split).toLowerCase()] = line
          .slice(split + 1)
          .trim();
    }
  }
  return headers;
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
};
const server = http.createServer((req, res) => {
  let url;
  try {
    url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  let file = url === "/" ? "/neon-flug.html" : url;
  if (file.endsWith("/")) file += "index.html";
  else if (!path.extname(file)) file += ".html";
  file = path.resolve(ROOT, "." + file);
  if (
    !file.startsWith(ROOT + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404);
    res.end("Nicht gefunden");
    return;
  }
  res.writeHead(200, {
    ...headersFor(url),
    "Content-Type": mime[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
server.listen(Number(process.env.PORT) || 8099, "0.0.0.0", () =>
  console.log(
    "Neon-Flug-Vorschau: http://localhost:" +
      (Number(process.env.PORT) || 8099) +
      "/neon-flug",
  ),
);
