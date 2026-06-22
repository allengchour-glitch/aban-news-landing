#!/usr/bin/env node
/*
 * zweites_gehirn.mjs — "Zweites Gehirn" (second brain) automated QA gate.
 *
 * Encodes the bug-classes the manual 2tes-Gehirn review agents have caught while
 * building the self-contained browser tools (see SHARED-MEMORY.md, Tool #1..#n):
 *   - inline <script> syntax errors
 *   - unguarded navigator.clipboard.writeText (TypeError on some browsers)
 *   - JSON.stringify written into a <script> context without < escaping
 *     (">/script>" injection) — the FAQ-Schema bug
 *   - innerHTML built from a raw filename / user value without esc() — XSS
 *   - {} used as a lookup map with user-controlled keys instead of
 *     Object.create(null) — the "__proto__" dedup bug
 *   - new Array(<variable>) / pool allocation without a size guard — OOM/freeze
 *   - crypto rejection sampling without a range-vs-2^32 guard — infinite loop
 *
 * Pure Node stdlib, no deps. Exit code 0 = ok (warnings allowed),
 * non-zero only on HARD failures (syntax error / missing inline script).
 *
 * Usage:
 *   node tools/zweites_gehirn.mjs            # scan all tool pages (root + en/fr/it)
 *   node tools/zweites_gehirn.mjs a.html b/  # scan specific files/dirs
 *   node tools/zweites_gehirn.mjs --strict   # treat warnings as failures too
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LANGS = ["", "en", "fr", "it"];
const SKIP_DIRS = new Set(["node_modules", ".git", "dropship", "social", "reels",
  "data", "functions", "video-prototypes", "automation", "tools", "assets", "js", "css", "products", "pages"]);

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const targets = args.filter(a => !a.startsWith("--"));

function isToolPage(html) {
  // A self-contained tool page has its own inline behaviour <script> (not just the announce include).
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return scripts.some(m => m[1].trim().length > 40);
}
function innerScript(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  let best = "";
  for (const m of scripts) if (m[1].length > best.length) best = m[1];
  return best;
}
function collectFiles() {
  if (targets.length) {
    const out = [];
    for (const t of targets) {
      const p = path.join(ROOT, t);
      if (!fs.existsSync(p)) continue;
      if (fs.statSync(p).isDirectory()) {
        for (const f of fs.readdirSync(p)) if (f.endsWith(".html")) out.push(path.join(p, f));
      } else if (p.endsWith(".html")) out.push(p);
    }
    return out;
  }
  const out = [];
  for (const lang of LANGS) {
    const dir = lang ? path.join(ROOT, lang) : ROOT;
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".html")) continue;
      if (!lang && SKIP_DIRS.has(f.replace(/\.html$/, ""))) continue;
      out.push(path.join(dir, f));
    }
  }
  return out;
}

const HARD = [], WARN = [];
function hard(file, msg) { HARD.push(`${path.relative(ROOT, file)}: ${msg}`); }
function warn(file, msg) { WARN.push(`${path.relative(ROOT, file)}: ${msg}`); }

function checkSyntax(file, js) {
  try { new Function(js); return true; }
  catch (e) { hard(file, `inline <script> syntax error: ${e.message}`); return false; }
}

function checkClipboard(file, js) {
  // writeText must be feature-guarded somewhere in the same script
  if (/\.clipboard\.writeText\s*\(/.test(js)) {
    if (!/navigator\.clipboard\s*&&\s*navigator\.clipboard\.writeText/.test(js)
        && !/navigator\.clipboard\s*&&\s*[\w$]*\.?writeText/.test(js))
      warn(file, "navigator.clipboard.writeText used without a feature guard (TypeError risk)");
    if (!/execCommand\(\s*["']copy["']\s*\)/.test(js))
      warn(file, "clipboard copy without an execCommand fallback");
  }
}
function checkScriptInjection(file, js) {
  // writing JSON/HTML that may contain "</script>" into a script context
  if (/JSON\.stringify/.test(js) && /<\\?\/script>|<\/script>/.test(js)) {
    if (!/\\u003c/.test(js) && !/replace\([^)]*<[^)]*\\u003c/.test(js))
      warn(file, "JSON.stringify near a <script> wrapper without \\u003c escaping (</script> injection risk)");
  }
}
function checkInnerHtmlXss(file, js) {
  // innerHTML assignments built with concatenation that include a likely user value
  const lines = js.split(/\n/);
  lines.forEach((ln, i) => {
    if (/\.innerHTML\s*=\s*[^;]*\+/.test(ln)) {
      const usesEsc = /esc\(|xmlEsc\(|encodeURI|toLocaleString|String\(/.test(ln);
      const usesUserish = /\.value|\.name|\.files|f\.name|dataTransfer/.test(ln);
      if (usesUserish && !usesEsc)
        warn(file, `line ~${i + 1}: innerHTML concatenates a user value (.value/.name) without esc() — XSS risk`);
    }
  });
}
function checkProtoMap(file, js) {
  // object-literal used as a Set/Map with dynamic keys → __proto__ trap
  if (/\bseen\s*=\s*\{\s*\}/.test(js) && /seen\[/.test(js)
      && !/Object\.create\(null\)/.test(js))
    warn(file, "object literal {} used as a lookup map with dynamic keys — use Object.create(null) (__proto__ trap)");
}
function checkArrayOom(file, js) {
  // new Array(var) or Array(var).fill without an obvious numeric cap nearby
  const m = js.match(/new Array\(\s*([a-zA-Z_$][\w$]*)\s*\)/);
  if (m) {
    const v = m[1];
    if (!new RegExp(`${v}\\s*>\\s*\\d`).test(js) && !new RegExp(`Math\\.min\\([^)]*${v}`).test(js))
      warn(file, `new Array(${v}) without a size guard — OOM/freeze risk for large input`);
  }
}
function checkCryptoRange(file, js) {
  // rejection sampling: getRandomValues + % needs a 2^32/range guard
  if (/getRandomValues/.test(js) && /%\s*[a-zA-Z_$]/.test(js)) {
    if (!/0x100000000|4294967296|2\s*\*\*\s*32/.test(js))
      warn(file, "getRandomValues + modulo without a 2^32 range bound — bias/loop risk");
  }
}

const files = collectFiles().filter(f => {
  try { return isToolPage(fs.readFileSync(f, "utf8")); } catch { return false; }
});

let scanned = 0;
for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const js = innerScript(html);
  if (!js || js.trim().length < 40) { warn(file, "no substantial inline <script> found"); continue; }
  scanned++;
  if (!checkSyntax(file, js)) continue;
  checkClipboard(file, js);
  checkScriptInjection(file, js);
  checkInnerHtmlXss(file, js);
  checkProtoMap(file, js);
  checkArrayOom(file, js);
  checkCryptoRange(file, js);
}

console.log(`== Zweites Gehirn ==  Tool-Seiten gescannt: ${scanned}`);
console.log(`  HARTE Probleme: ${HARD.length} | Hinweise: ${WARN.length}`);
for (const h of HARD) console.log("  ✗ " + h);
for (const w of WARN.slice(0, 60)) console.log("  · " + w);
if (WARN.length > 60) console.log(`  … +${WARN.length - 60} weitere Hinweise`);

const fail = HARD.length > 0 || (STRICT && WARN.length > 0);
process.exit(fail ? 1 : 0);
