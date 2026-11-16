// Offene Flüge, keine globale oder erfundene Spielerzahl.
import { nickname } from "./profile.mjs";
export const GAME = "aether-v4";
const CHANNEL = "aban-aether-v4-directory";
export function advertise(session, getInfo) {
  if (!window.MP.localMode) {
    session.info = { n: nickname(getInfo().name), p: 1 };
    const t = setInterval(() => {
      session.info = { n: nickname(getInfo().name), p: getInfo().full ? 2 : 1 };
    }, 500);
    return () => clearInterval(t);
  }
  const bc = new BroadcastChannel(CHANNEL);
  const publish = () => {
    const i = getInfo();
    bc.postMessage({
      t: "room",
      code: session.code,
      name: nickname(i.name),
      full: !!i.full,
    });
  };
  bc.onmessage = (e) => {
    if (e.data?.t === "query") publish();
  };
  const t = setInterval(publish, 700);
  publish();
  return () => {
    clearInterval(t);
    bc.close();
  };
}
export function findRooms({ found, done }) {
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    done();
  };
  if (!window.MP.localMode) {
    const s = window.MP.suche(GAME, {
      fund: (r) => {
        if (!closed && /^[A-Z]{4}$/.test(r.code))
          found({
            code: r.code,
            name: nickname(r.name),
            full: r.voll || r.spieler >= 2,
          });
      },
      fertig: finish,
    });
    return () => {
      closed = true;
      s.abbrechen();
    };
  }
  const bc = new BroadcastChannel(CHANNEL),
    seen = new Set();
  bc.onmessage = (e) => {
    const r = e.data;
    if (
      closed ||
      r?.t !== "room" ||
      typeof r.code !== "string" ||
      !/^[A-Z]{4}$/.test(r.code) ||
      seen.has(r.code)
    )
      return;
    seen.add(r.code);
    found({ code: r.code, name: nickname(r.name), full: r.full === true });
  };
  bc.postMessage({ t: "query" });
  const timer = setTimeout(() => {
    bc.close();
    finish();
  }, 1500);
  return () => {
    closed = true;
    clearTimeout(timer);
    bc.close();
  };
}
export function publicSession() {
  return window.MP.localMode
    ? window.MP._hostFixed(GAME, window.MP.makeCode())
    : window.MP.hostPublic(GAME);
}
