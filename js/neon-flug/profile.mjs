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
    100 + Math.min(150, (s.duets || 0) * 20 + (s.rescues || 0) * 30);
  const updated = { ...p, xp: p.xp + gained, missions: p.missions + 1 };
  return {
    profile: updated,
    gained,
    unlocked: Object.keys(MODULES).filter(
      (k) => MODULES[k].xp > p.xp && MODULES[k].xp <= updated.xp,
    ),
  };
}
export function rank(xp) {
  return 1 + Math.floor(Math.max(0, Number(xp) || 0) / 200);
}
