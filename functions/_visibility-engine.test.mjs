// Node-Test der Visibility-Engine: node functions/_visibility-engine.test.mjs
import { analyze, normInput, sanitizeField, buildPrompts } from "./_visibility-engine.mjs";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}

// 1) Vollständige Eingabe
const r1 = analyze({ branche: "Steuerberatung", ort: "Bern", firma: "Klartext Kanzlei",
                     leistungen: "Steuererklärung, Buchhaltung" });
console.log("\nTest 1 — volle Eingabe:");
check("ok=true", r1.ok === true);
check("Prompts vorhanden", r1.prompts.length >= 5, "n=" + r1.prompts.length);
check("max 12 Prompts", r1.prompts.length <= 12, "n=" + r1.prompts.length);
check("Prompt nennt Branche+Ort", r1.prompts.some((p) => p.includes("Steuerberatung") && p.includes("Bern")));
check("Prompt nennt Leistung", r1.prompts.some((p) => p.includes("Steuererklärung")));
check("6 Maßnahmen", r1.massnahmen.length === 6, "n=" + r1.massnahmen.length);
check("Anleitung vorhanden", r1.anleitung.length >= 4);
check("Rubrik vorhanden", r1.rubrik.length >= 3);
check("Hinweis ehrlich (keine Garantie)", /keine Garantie/i.test(r1.hinweis));
check("leistungen als Array geparst", r1.input.leistungen.length === 2, JSON.stringify(r1.input.leistungen));

// 2) Nur Branche, kein Ort
const r2 = analyze({ branche: "Friseur" });
console.log("\nTest 2 — nur Branche:");
check("ok=true", r2.ok === true);
check("Prompts ohne ' in '", r2.prompts.every((p) => !/ in undefined/.test(p)));
check("kein Ort-Artefakt", r2.prompts.some((p) => p.includes("Friseur")));

// 3) Leere Eingabe -> Fehler
const r3 = analyze({});
console.log("\nTest 3 — leer:");
check("ok=false", r3.ok === false);
check("Fehlermeldung", typeof r3.error === "string" && r3.error.length > 0);

// 4) Sicherheit: XSS/Markup wird entschärft
console.log("\nTest 4 — Sanitizing:");
check("entfernt < >", sanitizeField('<script>alert(1)</script>') === "script alert(1) /script");
check("trimmt Whitespace", sanitizeField("  viel   Raum  ") === "viel Raum");
check("deckelt Länge auf 80", sanitizeField("x".repeat(200)).length === 80);
check("nicht-String -> leer", sanitizeField(42) === "");

// 5) Leistungen-Cap
console.log("\nTest 5 — Limits:");
const many = analyze({ branche: "Test", leistungen: "a,b,c,d,e,f,g,h" });
check("max 5 Leistungen", many.input.leistungen.length === 5, "n=" + many.input.leistungen.length);

// 6) Determinismus
console.log("\nTest 6 — Determinismus:");
const a = JSON.stringify(buildPrompts(normInput({ branche: "Bäckerei", ort: "Belp" })));
const b = JSON.stringify(buildPrompts(normInput({ branche: "Bäckerei", ort: "Belp" })));
check("gleiche Eingabe -> gleiche Prompts", a === b);

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
