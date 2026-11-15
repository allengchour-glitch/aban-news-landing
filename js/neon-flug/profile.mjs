export const ROLES = {
  navigator: {
    name: "Navigator",
    tag: "Präzise Linien. Schnelle Richtungswechsel.",
    speed: 15.5,
    rescue: 2,
    dash: 0.6,
    cooldown: 6,
  },
  medic: {
    name: "Retter",
    tag: "Holt Partner schneller zurück in den Flug.",
    speed: 14,
    rescue: 1.25,
    dash: 0.6,
    cooldown: 6,
  },
  pulse: {
    name: "Impuls",
    tag: "Längerer Dash. Schnell wieder einsatzbereit.",
    speed: 14,
    rescue: 2,
    dash: 0.8,
    cooldown: 5.4,
  },
};
export const MODULES = {
  none: {
    name: "Basisausrüstung",
    xp: 0,
    tag: "Alle Rollen sind sofort spielbar.",
  },
  capacitor: {
    name: "Kondensator",
    xp: 100,
    tag: "Dash lädt 0,7 Sekunden schneller.",
  },
  focus: {
    name: "Fokusfeld",
    xp: 250,
    tag: "Energieringe lassen sich leichter einsammeln.",
  },
  anchor: {
    name: "Rettungsanker",
    xp: 450,
    tag: "Gerettete Partner kommen mit vollem Schild zurück.",
  },
};
Object.assign(MODULES, {
  resonance: {
    name: "Resonanzkern",
    xp: 700,
    tag: "Team-Manöver laden 25 % mehr Resonanz.",
  },
  vector: {
    name: "Vektordüsen",
    xp: 1000,
    tag: "Schnellerer Seitenwechsel zwischen Fluglinien.",
  },
  guard: {
    name: "Schutzmatrix",
    xp: 1400,
    tag: "Nach einem Treffer länger geschützt.",
  },
  coil: {
    name: "Schubspule",
    xp: 1900,
    tag: "Dash lädt 1,2 Sekunden schneller.",
  },
  link: {
    name: "Teamkanal",
    xp: 2500,
    tag: "Nähe zum Partner lädt euren Dash noch schneller.",
  },
  savior: {
    name: "Rettungsimpuls",
    xp: 3200,
    tag: "Gerettete Partner erhalten länger Schutz.",
  },
});
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
];
export function levelProgress(xp) {
  const level = rank(xp),
    base =
      level <= 10 ? LEVEL_THRESHOLDS[level - 1] : 3200 + (level - 10) * 500,
    next = level < 10 ? LEVEL_THRESHOLDS[level] : base + 500;
  return {
    level,
    base,
    next,
    ratio: Math.max(0, Math.min(1, (xp - base) / (next - base))),
  };
}
export function nickname(s) {
  return typeof s === "string"
    ? s
        .normalize("NFKC")
        .replace(/[\u0000-\u001f\u007f<>]/g, "")
        .trim()
        .slice(0, 18) || "Pilot"
    : "Pilot";
}
export function loadout(v) {
  return {
    role: Object.hasOwn(ROLES, v?.role) ? v.role : "navigator",
    mod: Object.hasOwn(MODULES, v?.mod) ? v.mod : "none",
  };
}
export function profile(v) {
  const xp = Number.isFinite(v?.xp)
    ? Math.max(0, Math.min(1e8, Math.floor(v.xp)))
    : 0;
  const setup = loadout(v);
  return {
    name: nickname(v?.name),
    xp,
    role: setup.role,
    mod: MODULES[setup.mod].xp <= xp ? setup.mod : "none",
    missions: Number.isInteger(v?.missions) ? Math.max(0, v.missions) : 0,
  };
}
export function award(v, s) {
  const p = profile(v);
  if (!s || !["result", "victory"].includes(s.phase))
    return { profile: p, gained: 0, unlocked: [] };
  const gained =
    100 +
    Math.min(150, (s.duets || 0) * 20 + (s.rescues || 0) * 30) +
    Math.min(100, (s.bonuses || 0) * 10);
  const updated = { ...p, xp: p.xp + gained, missions: p.missions + 1 };
  return {
    profile: updated,
    gained,
    leveledUp: rank(updated.xp) > rank(p.xp),
    level: rank(updated.xp),
    unlocked: Object.keys(MODULES).filter(
      (k) => MODULES[k].xp > p.xp && MODULES[k].xp <= updated.xp,
    ),
  };
}
export function rank(xp) {
  xp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  if (xp >= 3200) return 10 + Math.floor((xp - 3200) / 500);
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++)
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  return level;
}
