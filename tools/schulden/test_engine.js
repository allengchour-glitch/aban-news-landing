const E = require(process.argv[2] || __dirname + "/engine.js");
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };
// 1. Annuitätenformel: 10'000 zu 12 %, Rate 300 → n = -ln(1-0.01*10000/300)/ln(1.01) = 40.7 → Monat 41
let r = E.simuliere([{name:"A",betrag:10000,zins:12,rate:300}], {strategie:"tilgen", monate:120});
ok(r.schuldenfrei === 41, `Einzelschuld schuldenfrei in Monat ${r.schuldenfrei} (Formel: 41)`);
// Zinssumme = 40 volle Raten + Rest - 10000
// 2. Lawine zahlt nie mehr Zins als Schneeball (viele Zufallsfälle)
let schlechter = 0;
for (let k = 0; k < 500; k++) {
  const S = Array.from({length: 2 + (k % 4)}, (_, i) => ({name:"S"+i, betrag: 500 + Math.random()*20000, zins: Math.random()*15, rate: 0}));
  S.forEach(d => d.rate = Math.max(30, d.betrag * (0.01 + d.zins/1200) * (1 + Math.random())));
  const o = {strategie:"tilgen", extra: 100 + Math.random()*500, monate: 600};
  const l = E.simuliere(S, {...o, methode:"lawine"}), s = E.simuliere(S, {...o, methode:"schneeball"});
  if (l.zinsen > s.zinsen + 0.01) schlechter++;
}
ok(schlechter === 0, `Lawine nie teurer als Schneeball (500 Zufallsfälle, Ausreisser: ${schlechter})`);
// 3. Break-even ohne Steuer ≈ effektiver Schuldzins 12 % nominal monatlich = 12.68 % effektiv
const eins = [{name:"A",betrag:10000,zins:12,rate:300}];
let be = E.breakEven(eins, {extra:200, monate:120});
ok(Math.abs(be - 12.68) < 0.25, `Break-even ${be.toFixed(2)} % (erwartet ≈ 12.68 %)`);
// 4. Mit 30 % Schuldzinsabzug sinkt die Schwelle auf ≈ effektiven 8.4 %-Zins = 8.73 %
be = E.breakEven(eins, {extra:200, monate:120, steuer:0.3});
ok(Math.abs(be - 8.73) < 0.35, `Break-even mit Steuerabzug ${be.toFixed(2)} % (erwartet ≈ 8.73 %)`);
// 5. Gegenprobe: Rate deckt die Zinsen nicht → Problem erkannt, nie schuldenfrei ohne Extra
r = E.simuliere([{name:"Kreditkarte",betrag:5000,zins:12,rate:40}], {strategie:"tilgen", monate:120});
ok(r.problem === "Kreditkarte" && r.schuldenfrei === null, `Rate unter Zins erkannt (${r.problem})`);
// 6. Geldfluss erhalten: Investieren mit 0 % Rendite und 0 % Zins = gleiches Vermögen wie Tilgen
const nz = [{name:"A",betrag:6000,zins:0,rate:200},{name:"B",betrag:3000,zins:0,rate:100}];
const a = E.simuliere(nz, {strategie:"tilgen", extra:150, rendite:0, monate:60}).vermoegen;
const b = E.simuliere(nz, {strategie:"investieren", extra:150, rendite:0, monate:60}).vermoegen;
ok(Math.abs(a - b) < 0.01, `Ohne Zins und Rendite gleiches Vermögen (${a.toFixed(2)} / ${b.toFixed(2)})`);
