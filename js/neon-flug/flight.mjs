import {
  frameTime,
  PresentationClock,
  predictPilot,
  SnapshotGate,
} from "./timing.mjs";
import {
  ROLES,
  MODULES,
  nickname,
  loadout,
  profile,
  award,
  rank,
  levelProgress,
} from "./profile.mjs";
import { GAME, findRooms, advertise, publicSession } from "./directory.mjs";
import {
  VERSION,
  LEVELS,
  FLIGHT_LIMIT,
  HEIGHT_LIMIT,
  duration,
  eventsFor,
  createState,
  start,
  step,
  dash,
  clamp,
  snapshot,
  validSnapshot,
  routeCache,
  eventX,
} from "./core.mjs";
import { FlightView } from "./hybrid-view.mjs";
import { FlightAudio } from "./audio.mjs";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search),
  isStation = parent !== window && params.get("station") === "1";
let storage = true;
function read(key, fallback) {
  try {
    const x = JSON.parse(localStorage.getItem(key));
    return x ?? fallback;
  } catch {
    storage = false;
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    storage = false;
    return false;
  }
}
let settings = {
  music: 35,
  effects: 55,
  quality: "auto",
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  ...read("aether-settings", {}),
};
if (settings.renderProfile !== "fast-v1") {
  settings.quality = "auto";
  settings.renderProfile = "fast-v1";
}
let records = read("aether-records", { best: [0, 0, 0], medals: [0, 0, 0] });
if (!Array.isArray(records.best) || !Array.isArray(records.medals))
  records = { best: [0, 0, 0], medals: [0, 0, 0] };
let pilotProfile = profile(read("aether-pilot", {}));
let pilotSetups = [loadout(pilotProfile), loadout(null)],
  pilotNames = [pilotProfile.name, "Mitspieler"];
let cancelScan = null,
  stopAdvert = null,
  scanId = 0,
  xpMessage = "",
  previousNotice = "",
  resonanceSound = false,
  didLevelUp = false;
function helloPacket() {
  return { t: "hello", name: pilotProfile.name, setup: loadout(pilotProfile) };
}
function newState(level = 0) {
  try {
    sessionStorage.removeItem("aether-last-result");
  } catch {}
  return createState(level, pilotSetups, {
    mode: $("flightMode").value,
    training,
  });
}
function refreshProfile() {
  $("pilotRank").textContent = "Level " + rank(pilotProfile.xp);
  $("profileProgress").textContent =
    `${pilotProfile.name} · Level ${rank(pilotProfile.xp)} · ${pilotProfile.xp} XP · ${pilotProfile.missions} abgeschlossene Kapitel`;
  const progress = levelProgress(pilotProfile.xp);
  $("levelProgressFill").style.width = progress.ratio * 100 + "%";
  $("levelProgressText").textContent =
    `${Math.max(0, progress.next - pilotProfile.xp)} XP bis Level ${progress.level + 1}`;
  $("pilotName").value = pilotProfile.name;
  $("pilotRole").value = pilotProfile.role;
  $("roleDetail").textContent = ROLES[pilotProfile.role].tag;
  const select = $("pilotModule");
  select.replaceChildren();
  for (const [id, m] of Object.entries(MODULES)) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = m.name + (m.xp > pilotProfile.xp ? ` · ab ${m.xp} XP` : "");
    o.disabled = m.xp > pilotProfile.xp;
    select.append(o);
  }
  select.value = pilotProfile.mod;
  $("moduleDetail").textContent = MODULES[pilotProfile.mod].tag;
}
function latestProfile() {
  const saved = profile(read("aether-pilot", pilotProfile));
  return profile({
    ...saved,
    xp: Math.max(saved.xp, pilotProfile.xp),
    missions: Math.max(saved.missions, pilotProfile.missions),
    claimed: [...new Set([...saved.claimed, ...pilotProfile.claimed])],
  });
}
function saveProfile() {
  pilotProfile = profile({
    ...latestProfile(),
    name: $("pilotName").value,
    role: $("pilotRole").value,
    mod: $("pilotModule").value,
  });
  write("aether-pilot", pilotProfile);
  if (session && canEquip()) {
    if (host) applyEquipment(local, loadout(pilotProfile), pilotProfile.name);
    else
      send({
        t: "equipment",
        setup: loadout(pilotProfile),
        name: pilotProfile.name,
      });
  }
  refreshProfile();
}
function canEquip() {
  return (
    ["briefing", "resultScreen"].includes(screen) &&
    ["briefing", "result", "failed", "victory"].includes(state.phase)
  );
}
function applyEquipment(i, setup, name) {
  pilotSetups[i] = loadout(setup);
  pilotNames[i] = nickname(name);
  if (state.phase === "briefing")
    Object.assign(state.players[i], pilotSetups[i]);
  stageReady = [false, false];
  updateReadyLabels();
  sendSnapshot();
}
$("upgradeBtn").onclick = () => {
  refreshProfile();
  $("hangar").showModal();
};
$("hangarBtn").onclick = () => {
  refreshProfile();
  $("hangar").showModal();
};
for (const id of ["pilotName", "pilotRole", "pilotModule"])
  $(id).addEventListener("change", saveProfile);
function stopScan() {
  scanId++;
  if (cancelScan) {
    cancelScan();
    cancelScan = null;
  }
  $("refreshRooms").disabled = false;
}
function searchRooms() {
  stopScan();
  show("matchScreen");
  const id = scanId;
  $("roomList").replaceChildren();
  $("refreshRooms").disabled = true;
  $("matchStatus").textContent =
    "Erreichbare öffentliche Flüge werden gesucht …";
  let count = 0;
  cancelScan = findRooms({
    found: (r) => {
      if (id !== scanId || screen !== "matchScreen") return;
      count++;
      const li = document.createElement("li");
      li.className = "room-item";
      const info = document.createElement("div"),
        name = document.createElement("strong"),
        detail = document.createElement("span");
      name.textContent = r.name;
      detail.textContent = r.full
        ? "2 / 2 Piloten · im Flug"
        : "1 / 2 Piloten · wartet auf dich";
      info.append(name, detail);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "secondary";
      b.textContent = r.full ? "Besetzt" : "Mitfliegen →";
      b.disabled = r.full;
      b.onclick = () => connect(false, r.code);
      li.append(info, b);
      $("roomList").append(li);
    },
    done: () => {
      if (id !== scanId || screen !== "matchScreen") return;
      $("refreshRooms").disabled = false;
      $("matchStatus").textContent = count
        ? `${count} erreichbare öffentliche Flüge gefunden.`
        : "Kein erreichbarer Flug gefunden. Öffne einen öffentlichen Raum oder lade einen Freund ein. Eine eingeschränkte Verbindung kann die Suche verhindern.";
    },
  });
}
$("findBtn").onclick = searchRooms;
$("refreshRooms").onclick = searchRooms;
$("publicHostBtn").onclick = () => connect(true, undefined, true);
let view;
try {
  view = new FlightView($("scene"));
} catch (error) {
  $("fatalText").textContent = error.message;
  $("fatal").hidden = false;
  $("boot").hidden = true;
  throw error;
}
const audio = new FlightAudio(settings);
const presentationClock = new PresentationClock();
const snapshotGate = new SnapshotGate();
let session = null,
  host = true,
  local = 0,
  training = false,
  connected = false,
  hello = false,
  state = createState(),
  screen = "menu",
  stageReady = [false, false],
  lobbyReady = [false, false],
  input = {
    axis: 0,
    vertical: 0,
    target: null,
    targetY: null,
    rescue: false,
    fire: false,
  },
  remoteInput = {
    axis: 0,
    vertical: 0,
    target: null,
    targetY: null,
    rescue: false,
    fire: false,
  },
  seq = 0,
  lastRemoteSeq = -1,
  lastSnapshot = performance.now(),
  snapshotSerial = 0,
  lastLobbySync = 0,
  lastSent = 0,
  stageKey = "",
  storedKey = "",
  dashSerial = 0,
  lastDashSerial = 0,
  netLost = false,
  pendingPause = false,
  lastSoundTime = 0,
  networkTimer = null,
  lastInputAt = performance.now();
const held = new Set();
let portraitAllowed = false;
let pointer = null,
  prevPhase = "",
  oldRings = [0, 0],
  oldHp = [3, 3],
  lastPanelFrame = 0,
  lastFrame = performance.now(),
  accumulator = 0,
  hudElapsed = 0,
  previousScores = [0, 0, 0],
  trainingGuide = false,
  rescueHeld = false,
  fireHeld = false,
  stick = { x: 0, y: 0, vertical: 0, axis: 0 };
const screens = [
  "menu",
  "matchScreen",
  "lobby",
  "briefing",
  "pauseScreen",
  "resultScreen",
];
function show(name) {
  screen = name;
  if (name === "menu") {
    refreshProfile();
    const unlocked = Math.min(2, Number(records.unlocked) || 0);
    $("levelPicker").hidden = unlocked === 0;
    for (const o of $("startChapter").options)
      o.disabled = Number(o.value) > unlocked;
    $("startChapter").value = String(
      Math.min(unlocked, Number(records.next) || 0),
    );
  }
  for (const id of screens) $(id).hidden = id !== name;
  $("hud").hidden = name !== "game" && name !== "pauseScreen";
  $("trainingLabel").hidden = !training;
  $("connectionLabel").textContent = training
    ? "TRAINING · AUTOPILOT"
    : session
      ? connected
        ? "VERBUNDEN · 2 PILOTEN"
        : "VERBINDUNG WIRD AUFGEBAUT"
      : "ONLINE-KOOP · 2 SPIELER";
  updateRotate();
}
function updateRotate() {
  const inFlight = ["game", "pauseScreen", "briefing"].includes(screen);
  $("rotateHint").hidden = !(
    !portraitAllowed &&
    navigator.maxTouchPoints > 0 &&
    innerHeight > innerWidth &&
    inFlight
  );
  if (!$("rotateHint").hidden && state.phase === "playing")
    requestPause("Bitte dreht eure Geräte ins Querformat.");
}
function send(data) {
  if (session && connected) session.send({ v: VERSION, ...data });
}
function sendSnapshot(fast = false) {
  if (!host || !connected) return;
  const packet = {
    v: VERSION,
    t: "state",
    seq: ++snapshotSerial,
    s: snapshot(state),
    ready: stageReady,
    training: false,
    setups: pilotSetups,
    names: pilotNames,
  };
  if (fast && session.sendFast) session.sendFast(packet);
  else session.send(packet);
}
function saveSettings() {
  write("aether-settings", settings);
  document.body.classList.toggle("reduced-motion", !!settings.reduced);
  view.reduced = !!settings.reduced;
  view.quality(settings.quality);
  if (view.warning) {
    settings.quality = "auto";
    $("quality").value = "auto";
    write("aether-settings", settings);
    $("storageNotice").textContent = view.warning;
    return;
  }
  $("storageNotice").textContent = storage
    ? "Einstellungen und Bestwerte werden auf diesem Gerät gespeichert."
    : "Dein Browser erlaubt keine Speicherung. Spielen funktioniert trotzdem.";
}
function enableAudio() {
  audio.unlock();
}
function toggleAudio() {
  enableAudio();
  audio.enabled = !audio.enabled;
  $("soundState").textContent = audio.enabled ? " AN" : " AUS";
  $("soundBtn").setAttribute(
    "aria-label",
    audio.enabled ? "Ton ausschalten" : "Ton einschalten",
  );
  if (!audio.enabled) audio.silence();
  else audio.unlock();
}
$("soundBtn").onclick = toggleAudio;
for (const [id, key] of [
  ["musicVolume", "music"],
  ["effectsVolume", "effects"],
]) {
  $(id).value = settings[key];
  $(id).oninput = () => {
    settings[key] = Number($(id).value);
    saveSettings();
  };
}
$("quality").value = settings.quality;
$("quality").onchange = () => {
  settings.quality = $("quality").value;
  saveSettings();
};
$("reduceMotion").checked = settings.reduced;
$("reduceMotion").onchange = () => {
  settings.reduced = $("reduceMotion").checked;
  saveSettings();
};
$("settingsBtn").onclick = () => {
  if (state.phase === "playing") requestPause("Einstellungen werden geändert.");
  $("settings").showModal();
};
$("creditsBtn").onclick = (e) => {
  e.preventDefault();
  $("credits").showModal();
};
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => $(b.dataset.close).close()));
function release() {
  held.clear();
  input = {
    axis: 0,
    vertical: 0,
    target: null,
    targetY: null,
    rescue: false,
    fire: false,
  };
  pointer = null;
  rescueHeld = false;
  fireHeld = false;
  stick.axis = stick.vertical = 0;
  $("touchStick").hidden = true;
}
function closeSession() {
  snapshotSerial = 0;
  snapshotGate.reset();
  presentationClock.reset();
  stopScan();
  if (stopAdvert) {
    stopAdvert();
    stopAdvert = null;
  }
  if (session) {
    const old = session;
    session = null;
    old.close();
  }
  clearInterval(networkTimer);
  networkTimer = null;
  connected = false;
  hello = false;
  netLost = false;
  remoteInput = {
    axis: 0,
    vertical: 0,
    target: null,
    targetY: null,
    rescue: false,
    fire: false,
  };
  lastRemoteSeq = -1;
  lastDashSerial = 0;
  dashSerial = 0;
  seq = 0;
}
function exit() {
  try {
    sessionStorage.removeItem("aether-last-result");
  } catch {}
  release();
  audio.silence();
  closeSession();
  training = false;
  state = createState();
  prevPhase = "";
  stageKey = "";
  storedKey = "";
  trainingGuide = false;
  show("menu");
  if (isStation) parent.postMessage("mini-back", location.origin);
}
document.querySelectorAll(".exitBtn").forEach((b) => (b.onclick = exit));
$("joinToggle").onclick = () => {
  $("joinForm").hidden = !$("joinForm").hidden;
  if (!$("joinForm").hidden) $("roomInput").focus();
};
$("joinForm").onsubmit = (e) => {
  e.preventDefault();
  const code = $("roomInput").value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return;
  connect(false, code);
};
$("hostBtn").onclick = () => connect(true);
function setLobbyStatus(text) {
  $("lobbyStatus").textContent = text;
}
function lobbyUI() {
  for (let i = 0; i < 2; i++)
    $("pilot" + i + "Name").textContent =
      pilotNames[i] + " · " + ROLES[pilotSetups[i].role].name;
  $("lobbyMode").textContent =
    state.mode === "shoot"
      ? "NEON-SCHIESSEN · 60 SEKUNDEN"
      : "KLASSISCHE KAMPAGNE · 3 KAPITEL";
  const s = host ? lobbyReady : [lobbyReady[0], lobbyReady[1]];
  $("pilot0Status").textContent = s[0]
    ? "Bereit"
    : host || connected
      ? "Im Hangar"
      : "Verbindet …";
  $("pilot1Status").textContent = s[1]
    ? "Bereit"
    : connected
      ? "Im Hangar"
      : "Wartet auf Mitspieler";
  $("readyBtn").disabled = !connected || !hello || lobbyReady[local];
  $("readyBtn").textContent = lobbyReady[local]
    ? "Bereit · wartet auf Partner"
    : "Bereit zum Abflug →";
  $("pilot0Status").parentElement.parentElement.classList.toggle("ready", s[0]);
  $("pilot1Status").parentElement.parentElement.classList.toggle("ready", s[1]);
  if (connected && hello)
    setLobbyStatus("Ihr seid verbunden. Bestätigt beide eure Bereitschaft.");
}
function connect(asHost, code, publicRoom = false) {
  enableAudio();
  closeSession();
  training = false;
  host = asHost;
  local = asHost ? 0 : 1;
  lobbyReady = [false, false];
  stageReady = [false, false];
  pilotSetups = asHost
    ? [loadout(pilotProfile), loadout(null)]
    : [loadout(null), loadout(pilotProfile)];
  pilotNames = asHost
    ? [pilotProfile.name, "Mitspieler"]
    : ["Mitspieler", pilotProfile.name];
  state = newState();
  stageKey = "";
  storedKey = "";
  previousScores = [0, 0, 0];
  show("lobby");
  $("roomCode").textContent = "····";
  $("readyBtn").disabled = true;
  setLobbyStatus(
    asHost ? "Dein Raum wird geöffnet …" : "Dein Partner wird gesucht …",
  );
  try {
    if (!window.MP)
      throw Error("Das Verbindungsmodul fehlt. Bitte lade die Seite erneut.");
    session = asHost
      ? publicRoom
        ? publicSession()
        : window.MP.host(GAME)
      : window.MP.join(GAME, code);
  } catch (e) {
    setLobbyStatus(e.message);
    return;
  }
  lastInputAt = performance.now();
  const own = session;
  if (publicRoom && asHost)
    stopAdvert = advertise(own, () => ({
      name: pilotProfile.name,
      full: connected || screen !== "lobby",
    }));
  $("roomCode").textContent = own.code;
  session.onMessage((m) => {
    if (session !== own) return;
    try {
      receive(m);
    } catch (error) {
      console.error(
        "Koop-Nachricht konnte nicht verarbeitet werden:",
        error.message,
      );
    }
  });
  session.onStatus((st) => {
    if (session !== own) return;
    if (st === "waiting") {
      $("roomCode").textContent = own.code;
      setLobbyStatus(
        "Raum geöffnet. Teile den Link und warte auf deinen Partner.",
      );
    } else if (st === "suche") {
      setLobbyStatus("Ein anderer Vermittlungs-Server wird versucht …");
    } else if (st === "connected") {
      connected = true;
      netLost = false;
      hello = false;
      send(helloPacket());
      lobbyUI();
      updateReadyLabels();
      if (state.phase === "paused") {
        $("pauseReason").textContent =
          "Verbindung wiederhergestellt. Bestätigt beide „Weiter“. ";
        stageReady = [false, false];
      }
    } else if (st === "lost" || st === "closed") {
      connected = false;
      netLost = true;
      release();
      if (screen === "lobby") {
        setLobbyStatus(
          st === "closed"
            ? "Verbindung nicht möglich. Prüft den Code oder erstellt einen neuen Raum."
            : "Verbindung wird wiederhergestellt …",
        );
        $("readyBtn").disabled = true;
      } else if (["result", "failed", "victory"].includes(state.phase)) {
        show("resultScreen");
        updateReadyLabels();
      } else {
        if (host && state.phase === "playing") state.phase = "paused";
        show("pauseScreen");
        $("pauseReason").textContent =
          st === "closed"
            ? "Die Verbindung wurde beendet. Kehrt zum Hangar zurück und erstellt einen neuen Raum."
            : "Verbindung unterbrochen. Euer Flug wartet auf euch.";
        $("resumeBtn").disabled = true;
      }
      audio.silence();
    }
  });
  own.ready
    .then(() => {
      if (session !== own) return;
      connected = true;
      send(helloPacket());
      lobbyUI();
    })
    .catch((e) => {
      if (session !== own) return;
      setLobbyStatus(
        e.message || "Verbindung fehlgeschlagen. Erstelle einen neuen Raum.",
      );
      $("readyBtn").disabled = true;
    });
  networkTimer = setInterval(() => {
    if (session !== own || !connected) return;
    const now = performance.now();
    if (!hello && now - lastLobbySync > 150) send(helloPacket());
    if (host) {
      if (state.phase === "playing" && screen === "game") sendSnapshot(true);
      else if (now - lastLobbySync > 150) {
        if (screen === "lobby")
          send({
            t: "lobby",
            ready: lobbyReady,
            names: pilotNames,
            setups: pilotSetups,
            mode: state.mode,
          });
        else sendSnapshot();
      }
    }
    if (now - lastLobbySync > 150) lastLobbySync = now;
  }, 50);
}
function receive(m) {
  if (!m || m.v !== VERSION || typeof m.t !== "string") return;
  if (m.t === "hello") {
    if (screen === "lobby") {
      pilotSetups[1 - local] = loadout(m.setup);
      pilotNames[1 - local] = nickname(m.name);
    }
    hello = true;
    send({
      t: "welcome",
      name: pilotProfile.name,
      setup: loadout(pilotProfile),
    });
    lobbyUI();
    if (host && screen !== "lobby") sendSnapshot();
    return;
  }
  if (m.t === "welcome") {
    if (screen === "lobby") {
      pilotSetups[1 - local] = loadout(m.setup);
      pilotNames[1 - local] = nickname(m.name);
    }
    hello = true;
    lobbyUI();
    return;
  }
  if (host) {
    if (m.t === "equipment" && canEquip()) {
      applyEquipment(1, m.setup, m.name);
      return;
    }
    if (m.t === "ready" && screen === "lobby") {
      lobbyReady[1] = true;
      lobbyUI();
      tryLobbyStart();
    } else if (
      m.t === "input" &&
      Number.isInteger(m.seq) &&
      m.seq > lastRemoteSeq &&
      m.seq - lastRemoteSeq < 100000
    ) {
      lastRemoteSeq = m.seq;
      lastInputAt = performance.now();
      remoteInput = {
        axis: Number.isFinite(m.axis) ? clamp(m.axis, -1, 1) : 0,
        target: Number.isFinite(m.target)
          ? clamp(m.target, -FLIGHT_LIMIT, FLIGHT_LIMIT)
          : null,
        vertical: Number.isFinite(m.vertical) ? clamp(m.vertical, -1, 1) : 0,
        targetY: Number.isFinite(m.targetY)
          ? clamp(m.targetY, -HEIGHT_LIMIT, HEIGHT_LIMIT)
          : null,
        rescue: m.rescue === true,
        fire: m.fire === true,
      };
      if (Number.isInteger(m.dash) && m.dash > lastDashSerial) {
        lastDashSerial = m.dash;
        dash(state, 1);
      }
    } else if (m.t === "pause" && state.phase === "playing")
      pause(
        m.reason === "hidden"
          ? "Dein Partner ist gerade nicht im Spiel."
          : "Dein Partner hat den Flug pausiert.",
      );
    else if (m.t === "stageReady" && m.key === key()) {
      stageReady[1] = true;
      tryAdvance();
      updateReadyLabels();
    }
  } else {
    if (
      m.t === "lobby" &&
      Array.isArray(m.ready) &&
      m.ready.length === 2 &&
      screen === "lobby"
    ) {
      if (Array.isArray(m.names) && m.names.length === 2)
        pilotNames = m.names.map(nickname);
      if (Array.isArray(m.setups) && m.setups.length === 2)
        pilotSetups = m.setups.map(loadout);
      if (["classic", "shoot"].includes(m.mode)) {
        state.mode = m.mode;
        $("flightMode").value = m.mode;
      }
      lobbyReady = m.ready.map(Boolean);
      lobbyUI();
    } else if (m.t === "state" && validSnapshot(m.s)) {
      if (!snapshotGate.accept(m.seq)) return;
      if (Array.isArray(m.setups) && m.setups.length === 2)
        pilotSetups = m.setups.map(loadout);
      if (Array.isArray(m.names) && m.names.length === 2)
        pilotNames = m.names.map(nickname);
      lastSnapshot = performance.now();
      const old = state;
      state = {
        ...m.s,
        players: m.s.players.map((p) => ({ ...p })),
        events: [...m.s.events],
      };
      if (Array.isArray(m.ready) && m.ready.length === 2)
        stageReady = m.ready.map(Boolean);
      if (
        old.phase !== state.phase ||
        old.level !== state.level ||
        old.runId !== state.runId ||
        screen === "lobby"
      )
        phaseUI();
      else updateReadyLabels();
    }
  }
}
function tryLobbyStart() {
  if (host && connected && hello && lobbyReady.every(Boolean)) {
    stageReady = [false, false];
    state = newState(
      clamp(
        Number($("startChapter").value) || 0,
        0,
        Math.min(2, Number(records.unlocked) || 0),
      ),
    );
    phaseUI();
    sendSnapshot();
  }
}
$("readyBtn").onclick = () => {
  enableAudio();
  lobbyReady[local] = true;
  if (host) tryLobbyStart();
  else send({ t: "ready" });
  lobbyUI();
};
function inviteURL() {
  const u = new URL(location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("room", session?.code || "");
  if (params.get("mp") === "local") u.searchParams.set("mp", "local");
  return u.href;
}
$("copyBtn").onclick = async () => {
  try {
    await navigator.clipboard.writeText(inviteURL());
    setLobbyStatus("Einladungslink kopiert. Schicke ihn deinem Partner.");
  } catch {
    setLobbyStatus("Kopiere diesen Link: " + inviteURL());
  }
};
$("shareBtn").onclick = async () => {
  if (!navigator.share) return $("copyBtn").click();
  try {
    await navigator.share({
      title: "Aether Run – flieg mit mir",
      url: inviteURL(),
    });
  } catch {}
};
function key() {
  return `${state.runId}:${state.level}:${state.phase}`;
}
function stageConfirm() {
  enableAudio();
  if (state.phase === "victory") return exit();
  if (!training && (!connected || netLost)) return;
  stageReady[local] = true;
  if (host) tryAdvance();
  else send({ t: "stageReady", key: key() });
  updateReadyLabels();
}
for (const id of ["launchBtn", "nextBtn", "resumeBtn"])
  $(id).onclick = stageConfirm;
function updateReadyLabels() {
  const ready = stageReady[local],
    other = stageReady[1 - local];
  $("upgradeBtn").disabled = ready;
  $("launchBtn").disabled = ready;
  $("nextBtn").disabled =
    state.phase !== "victory" &&
    (ready || (!training && (!connected || netLost)));
  $("resumeBtn").disabled = ready || (!training && (!connected || netLost));
  $("briefReady").textContent = training
    ? "Training mit Autopilot. Kein Kampagnenfortschritt."
    : ready
      ? "Du bist bereit. Warte auf deinen Partner."
      : other
        ? "Dein Partner ist bereit. Ihr könnt starten."
        : "Beide Piloten müssen bestätigen.";
  $("resultReady").textContent = training
    ? "Training beendet. Bestwerte bleiben unverändert."
    : state.phase === "victory"
      ? "Flug beendet. Du kannst zum Hangar zurück."
      : !connected || netLost
        ? "Partner nicht verbunden. Euer Ergebnis bleibt erhalten."
        : ready
          ? "Dein Partner bestätigt noch …"
          : other
            ? "Dein Partner ist bereit."
            : "Gemeinsam geht es weiter.";
}
function tryAdvance() {
  if (!host) return;
  if (training) stageReady[1] = true;
  if (!stageReady.every(Boolean)) return;
  const phase = state.phase;
  stageReady = [false, false];
  if (phase === "briefing") {
    start(state);
    release();
  } else if (phase === "paused") {
    state.phase = "playing";
    release();
    audio.unlock();
  } else if (["result", "failed", "victory"].includes(phase)) {
    if (training || phase === "victory") {
      exit();
      return;
    }
    state = newState(phase === "failed" ? state.level : state.level + 1);
    release();
  }
  phaseUI();
  sendSnapshot();
}
function pause(reason) {
  if (state.phase !== "playing") return;
  state.phase = "paused";
  stageReady = [false, false];
  release();
  $("pauseReason").textContent = reason;
  phaseUI();
  sendSnapshot();
  audio.silence();
}
function requestPause(reason) {
  if (host) pause(reason);
  else if (connected && state.phase === "playing") {
    send({ t: "pause", reason: document.hidden ? "hidden" : "manual" });
    release();
  }
}
$("pauseBtn").onclick = () =>
  requestPause("Der Flug ist für euch beide pausiert.");
$("trainingBtn").onclick = () => {
  enableAudio();
  closeSession();
  host = true;
  local = 0;
  training = true;
  connected = false;
  pilotSetups = [loadout(pilotProfile), loadout(null)];
  pilotNames = [pilotProfile.name, "Autopilot"];
  state = newState();
  stageReady = [false, false];
  storedKey = "";
  stageKey = "";
  trainingGuide = true;
  phaseUI();
};
async function storeResult() {
  if (
    training ||
    !["result", "victory"].includes(state.phase) ||
    storedKey === key()
  )
    return;
  storedKey = key();
  const result = snapshot(state);
  const save = () => {
    const progress = award(latestProfile(), result);
    const persisted = write("aether-pilot", progress.profile);
    // Nur Fortschritt übernehmen: eine während des Wartens gewählte Rolle bleibt erhalten.
    pilotProfile = profile({
      ...pilotProfile,
      xp: progress.profile.xp,
      missions: progress.profile.missions,
      claimed: progress.profile.claimed,
    });
    return { ...progress, persisted };
  };
  let progress;
  try {
    progress = navigator.locks
      ? await navigator.locks.request("aether-rewards", save)
      : save();
  } catch {
    // Web Locks können vom Browser gesperrt sein. Derselbe idempotente Speicherschritt
    // funktioniert weiter; ohne LocalStorage bleiben die Kennungen für diese Sitzung.
    progress = save();
  }
  const message =
    (progress.leveledUp ? `LEVEL UP · LEVEL ${progress.level} · ` : ``) +
    (progress.gained
      ? `+${progress.gained} Flug-XP · Level ${rank(progress.profile.xp)}`
      : "Belohnung bereits gespeichert") +
    (progress.breakdown
      ? ` · Abschluss ${progress.breakdown.completion} / Team ${progress.breakdown.team} / Sammeln ${progress.breakdown.collection} / Drohnen ${progress.breakdown.combat}`
      : "") +
    (progress.unlocked.length
      ? " · Neu: " + progress.unlocked.map((k) => MODULES[k].name).join(", ")
      : "") +
    (progress.persisted
      ? ""
      : " · Nur für diese Sitzung: Browser-Speicher nicht verfügbar.");
  const completed = { message, leveledUp: !!progress.leveledUp };
  const freshRecords = read("aether-records", records);
  if (Array.isArray(freshRecords.best) && Array.isArray(freshRecords.medals))
    records = freshRecords;

  if (result.mode === "shoot") {
    records.shootBest = Math.max(records.shootBest || 0, result.score);
    write("aether-records", records);
    return completed;
  }
  if (state.runId === result.runId) previousScores[result.level] = result.score;
  records.best[result.level] = Math.max(
    Number(records.best[result.level]) || 0,
    result.score,
  );
  records.medals[result.level] = Math.max(
    Number(records.medals[result.level]) || 0,
    result.medal || 1,
  );
  records.unlocked = Math.max(
    Number(records.unlocked) || 0,
    Math.min(2, result.level + 1),
  );
  records.next = result.level === 2 ? 0 : result.level + 1;
  write("aether-records", records);
  if (
    isStation &&
    progress.gained > 0 &&
    state.runId === result.runId &&
    result.phase === "victory"
  )
    parent.postMessage(
      JSON.stringify({
        t: "stationDone",
        score: Math.min(
          500,
          Math.floor(previousScores.reduce((a, b) => a + b, 0) / 100),
        ),
        win: 1,
      }),
      location.origin,
    );
  return completed;
}
function phaseUI() {
  const l = LEVELS[state.level];
  if (stageKey !== key()) {
    previousNotice = "";
    stageKey = key();
    oldRings = state.players.map((p) => p.rings);
    oldHp = state.players.map((p) => p.hp);
    if (state.phase === "playing") audio.unlock();
  }
  if (state.phase === "briefing") {
    try {
      sessionStorage.removeItem("aether-last-result");
    } catch {}
    $("chapterLabel").textContent =
      `KAPITEL 0${state.level + 1} / 03${training ? " · TRAINING" : ""}`;
    $("chapterName").textContent =
      l.name.toLowerCase().replace(/^./, (c) => c.toUpperCase()) + ".";
    $("chapterSubtitle").textContent =
      state.mode === "shoot"
        ? "60 Sekunden überleben. Drohnen mit F oder FEUER treffen (zwei Treffer). Wärme im Blick behalten. Ringe und Rettung bleiben aktiv."
        : l.subtitle;
    if (state.mode === "shoot") {
      $("chapterLabel").textContent =
        "NEON-SCHIESSEN" + (training ? " · TRAINING" : "");
      $("chapterName").textContent = "Drohnenflug.";
    }
    show("briefing");
  } else if (state.phase === "playing") show("game");
  else if (state.phase === "paused") {
    show("pauseScreen");
    audio.silence();
  } else if (["result", "failed", "victory"].includes(state.phase)) {
    try {
      sessionStorage.setItem(
        "aether-last-result",
        JSON.stringify(snapshot(state)),
      );
    } catch {}
    const resultKey = key();
    if (storedKey !== key()) xpMessage = "Belohnung wird gespeichert …";
    storeResult().then((completed) => {
      if (
        !completed ||
        key() !== resultKey ||
        screen !== "resultScreen" ||
        training ||
        state.phase === "failed"
      )
        return;
      xpMessage = completed.message;
      didLevelUp = completed.leveledUp;
      $("xpResult").textContent = xpMessage;
      $("xpResult").classList.toggle("level-up", didLevelUp);
      $("resultBest").textContent = (
        state.mode === "shoot"
          ? records.shootBest || 0
          : records.best[state.level] || 0
      ).toLocaleString("de-CH");
    });
    $("upgradeBtn").hidden = training;
    const fail = state.phase === "failed",
      win = state.phase === "victory";
    $("resultTag").textContent = fail
      ? "IHR HABT EUCH NICHT VERLOREN"
      : win
        ? "ALLE DREI LEUCHTFEUER AKTIVIERT"
        : "LEUCHTFEUER AKTIVIERT";
    $("resultTitle").innerHTML = fail
      ? "Neuer Anlauf.<br>Zusammen."
      : win
        ? "Drei Lichter.<br>Ein Team."
        : "Ein Licht.<br>Dank euch.";
    $("medal").textContent = fail ? "↻" : "✦".repeat(state.medal || 1);
    $("medal").setAttribute(
      "aria-label",
      fail ? "Erneut versuchen" : `${state.medal || 1} von 3 Sternen`,
    );
    $("resultDescription").textContent = fail
      ? "Fliegt näher zusammen. Mit E oder „Retten“ bringt ihr einen ausgefallenen Partner zurück."
      : win
        ? "Ihr habt die Schlucht durchquert, den Sturm bezwungen und den Nachtkern entzündet. Zusammen."
        : l.subtitle + " Das nächste Kapitel wartet.";
    $("xpResult").classList.toggle(
      "level-up",
      didLevelUp && !training && !fail,
    );
    $("xpResult").textContent = training
      ? "Training · keine Flug-XP"
      : fail
        ? "Ein neuer Anlauf zählt. Eure Ausrüstung bleibt erhalten."
        : xpMessage;
    $("resultScore").textContent = state.score.toLocaleString("de-CH");
    $("resultRings").textContent = state.players.reduce(
      (n, p) => n + p.rings,
      0,
    );
    $("resultBest").textContent = training
      ? "—"
      : (state.mode === "shoot"
          ? records.shootBest || 0
          : records.best[state.level] || 0
        ).toLocaleString("de-CH");
    $("nextBtn").textContent =
      training || win
        ? "Zurück zum Hangar →"
        : fail
          ? "Gemeinsam erneut versuchen →"
          : "Nächstes Leuchtfeuer →";
    $("resultCombo").textContent =
      "Beste Kette ×" +
      state.bestCombo +
      (state.mode === "shoot" ? " · " + state.kills + " Drohnen" : "");
    if (state.mode === "shoot" && !fail) {
      $("resultTag").textContent = "NEON-SCHIESSEN · FLUG ABGESCHLOSSEN";
      $("resultTitle").textContent = "Drohnenflug geschafft.";
      $("resultDescription").textContent =
        "60 Sekunden gemeinsam überlebt. Zwei Treffer je Drohne; Abschüsse geben zusätzliche Flug-XP.";
    }
    show("resultScreen");
    audio.effect(fail ? "hit" : "win");
  }
  updateReadyLabels();
  prevPhase = state.phase;
}
function triggerDash() {
  enableAudio();
  if (state.phase !== "playing") return;
  if (host) {
    if (dash(state, local)) audio.effect("dash");
  } else {
    dashSerial++;
    sendInput();
  }
}
function sendInput() {
  if (!host && connected)
    send({
      t: "input",
      seq: ++seq,
      axis: input.axis,
      vertical: input.vertical,
      targetY: input.targetY,
      fire: input.fire,
      target: input.target,
      rescue: input.rescue,
      dash: dashSerial,
    });
}
$("dashBtn").onclick = triggerDash;
$("fireBtn").onpointerdown = (e) => {
  e.preventDefault();
  $("fireBtn").setPointerCapture(e.pointerId);
  fireHeld = true;
  enableAudio();
};
for (const n of ["pointerup", "pointercancel", "lostpointercapture"])
  $("fireBtn").addEventListener(n, () => {
    fireHeld = false;
  });
$("rescueBtn").onpointerdown = (e) => {
  e.preventDefault();
  $("rescueBtn").setPointerCapture(e.pointerId);
  input.rescue = true;
  rescueHeld = true;
};
for (const n of ["pointerup", "pointercancel", "lostpointercapture"])
  $("rescueBtn").addEventListener(n, () => {
    input.rescue = false;
    rescueHeld = false;
  });
addEventListener("keydown", (e) => {
  if (
    e.target.closest("input,select,button") ||
    $("settings").open ||
    $("hangar").open ||
    $("credits").open
  )
    return;
  const k = e.key.toLowerCase();
  if (["arrowleft", "arrowright", " ", "arrowup", "arrowdown"].includes(k))
    e.preventDefault();
  if (e.repeat) return;
  held.add(k);
  if (k === " ") triggerDash();
  if (k === "escape" || k === "p") {
    if (state.phase === "playing")
      requestPause("Der Flug ist für euch beide pausiert.");
  }
  if (k === "m") toggleAudio();
});
addEventListener("keyup", (e) => {
  held.delete(e.key.toLowerCase());
});
const canvas = $("scene");
canvas.addEventListener(
  "webglcontextlost",
  (e) => {
    e.preventDefault();
    requestPause("Die Grafikverbindung eines Piloten wurde unterbrochen.");
    $("fatalText").textContent =
      "Die Grafikverbindung wurde unterbrochen. Lade das Spiel neu und verbinde dich erneut mit deinem Partner.";
    $("fatal").hidden = false;
    audio.silence();
  },
  true,
);
// Relativer Zwei-Achsen-Stick: Aufsetzen versetzt den Gleiter nicht.
canvas.addEventListener("pointerdown", (e) => {
  if (state.phase !== "playing" || pointer !== null) return;
  pointer = e.pointerId;
  canvas.setPointerCapture(pointer);
  stick = { x: e.clientX, y: e.clientY, axis: 0, vertical: 0 };
  const pad = $("touchStick");
  pad.hidden = false;
  pad.style.left = e.clientX + "px";
  pad.style.top = e.clientY + "px";
  pad.firstElementChild.style.transform = "translate(0px, 0px)";
});
canvas.addEventListener("pointermove", (e) => {
  if (pointer !== e.pointerId || state.phase !== "playing") return;
  const dx = e.clientX - stick.x,
    dy = e.clientY - stick.y;
  const length = Math.max(44, Math.hypot(dx, dy));
  stick.axis = dx / length;
  stick.vertical = -dy / length;
  $("touchStick").firstElementChild.style.transform =
    `translate(${stick.axis * 35}px, ${-stick.vertical * 35}px)`;
});
for (const n of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(n, (e) => {
    if (pointer !== e.pointerId) return;
    pointer = null;
    stick.axis = stick.vertical = 0;
    input.target = input.targetY = null;
    $("touchStick").hidden = true;
  });
addEventListener("blur", () => {
  release();
  if (state.phase === "playing")
    requestPause("Ein Pilot hat das Spielfenster verlassen.");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    release();
    if (state.phase === "playing")
      requestPause("Ein Pilot hat das Spielfenster verlassen.");
    audio.silence();
  }
});
addEventListener("resize", updateRotate);
addEventListener("beforeunload", () => closeSession());
$("portraitBtn").onclick = () => {
  portraitAllowed = true;
  updateRotate();
};
$("rotateBtn").onclick = async () => {
  try {
    await document.documentElement.requestFullscreen();
    await window.screen.orientation?.lock?.("landscape");
  } catch {}
};
let noticeTimer = 0;
function notice(text) {
  $("notice").textContent = text;
  $("notice").style.opacity = 1;
  noticeTimer = 2;
}
function autopilot() {
  const soon = eventsFor(state).filter(
    (e) => e.t > state.t && e.t < state.t + 1.2,
  );
  let target =
    state.players[0].hp === 0
      ? state.players[0].x
      : (soon.find((e) => e.type === "ring")?.x ?? 2);
  const duet = soon.find((e) => e.type === "duet");
  if (duet && state.players[0].hp > 0) target = state.players[0].x < 0 ? 7 : -7;
  if (state.players[0].dash > 0 && state.players[1].cooldown <= 0)
    dash(state, 1);
  const hazard = soon.find((e) => e.type === "hazard");
  if (hazard && Math.abs(target - eventX(hazard, state.t)) < 2.5)
    target = target < 0 ? 5 : -5;
  const goal = soon.find(
    (e) => e.type === "ring" || e.type === "duet" || e.type === "drone",
  );
  if (state.mode === "shoot" && goal?.type === "drone") target = goal.x;
  remoteInput = {
    axis: 0,
    target,
    targetY: state.players[0].hp === 0 ? state.players[0].y : goal?.y || 0,
    rescue: state.players[0].hp === 0,
    fire: state.mode === "shoot",
  };
}
function hud(dt) {
  const over = state.overdrive > 0;
  document.body.classList.toggle("overdrive", over);
  $("resonanceFill").style.width = (over ? 100 : state.resonance) + "%";
  $("resonanceValue").textContent = over
    ? "OVERDRIVE " + Math.ceil(state.overdrive) + "s"
    : Math.floor(state.resonance) + "%";
  const noticeKey =
    state.notice +
    ":" +
    state.duets +
    ":" +
    state.syncs +
    ":" +
    state.rescues +
    ":" +
    state.bonuses +
    ":" +
    state.feedbackSerial;
  if (state.notice && noticeKey !== previousNotice) {
    notice(state.notice);
    previousNotice = noticeKey;
    if (state.notice === "ZWILLINGSSCHUB" || state.notice === "RESONANZFLUG")
      audio.effect("rescue");
  }

  const p = state.players[local],
    q = state.players[1 - local];
  $("hudChapter").textContent =
    state.mode === "shoot"
      ? "NEON-SCHIESSEN · " + state.kills + " DROHNEN"
      : `0${state.level + 1} / ${LEVELS[state.level].name}`;
  const progress = Math.min(100, (state.t / duration(state)) * 100);
  $("distance").textContent =
    String(Math.floor(progress)).padStart(2, "0") + "%";
  $("progressFill").style.width = progress + "%";
  $("comboValue").textContent = "KETTE ×" + state.combo;
  $("fireBtn").hidden = state.mode !== "shoot";
  $("heatValue").hidden = state.mode !== "shoot";
  $("heatValue").textContent = p.overheated
    ? "ÜBERHITZT · ABKÜHLEN"
    : "WÄRME " + Math.round(p.heat * 100) + "%";
  $("fireBtn").setAttribute(
    "aria-label",
    p.overheated ? "Waffe kühlt ab" : "Feuern (F gedrückt halten)",
  );
  $("score").textContent = state.score.toLocaleString("de-CH");
  $("youLabel").textContent = local === 0 ? "DU" : "PARTNER";
  $("partnerLabel").textContent = local === 1 ? "DU" : "PARTNER";
  for (let i = 0; i < 2; i++) {
    $("hp" + i).textContent =
      state.players[i].hp > 0
        ? "◆ ".repeat(state.players[i].hp) +
          "◇ ".repeat(3 - state.players[i].hp)
        : "RETTEN " + Math.ceil(state.players[i].down) + "s";
    if (state.players[i].rings > oldRings[i]) {
      audio.effect("ring");
    }
    if (state.players[i].hp < oldHp[i]) {
      audio.effect("hit");
      view.burst(state.players[i].x, 0xff6655, state.players[i].y);
    }
    if (state.players[i].hp > oldHp[i]) {
      audio.effect("rescue");
      notice("WIEDER ZUSAMMEN");
    }
    oldRings[i] = state.players[i].rings;
    oldHp[i] = state.players[i].hp;
  }
  const fullCooldown =
    ROLES[p.role].cooldown -
    (p.mod === "coil" ? 1.2 : p.mod === "capacitor" ? 0.7 : 0);
  $("dashFill").style.width =
    Math.max(0, 1 - p.cooldown / fullCooldown) * 100 + "%";
  $("dashText").textContent =
    p.cooldown > 0 ? Math.ceil(p.cooldown) + "s" : "DASH";
  $("dashBtn").disabled = p.cooldown > 0 || p.hp <= 0;
  const help = q.hp <= 0 || p.hp <= 0;
  $("rescueNotice").hidden = !help;
  if (help)
    $("rescueNotice").textContent =
      p.hp <= 0
        ? `Dein Partner kann dich retten. Noch ${Math.ceil(p.down)} Sekunden.`
        : `Flieg zum Partner und halte E / RETTEN · ${Math.floor((q.rescue / ROLES[p.role].rescue) * 100)}%`;
  if (noticeTimer > 0) {
    noticeTimer -= dt;
    if (noticeTimer <= 0) $("notice").style.opacity = 0;
  }
  if (trainingGuide && state.t > 1) {
    trainingGuide = false;
    if (!state.notice)
      notice(
        navigator.maxTouchPoints > 0
          ? "STICK: LINKS / RECHTS / HOCH / RUNTER"
          : "WASD / PFEILE · HOCH / RUNTER",
      );
  }
}
function frame(now) {
  const elapsed = frameTime((now - lastFrame) / 1000),
    dt = elapsed.seconds;
  lastFrame = now;
  if (elapsed.stalled && state.phase === "playing" && state.t > 1)
    requestPause("Ein Gerät hat kurz ausgesetzt. Der Flug wartet auf euch.");
  input.axis =
    (held.has("arrowright") || held.has("d") ? 1 : 0) -
    (held.has("arrowleft") || held.has("a") ? 1 : 0);
  input.vertical =
    (held.has("arrowup") || held.has("w") ? 1 : 0) -
    (held.has("arrowdown") || held.has("s") ? 1 : 0);
  if (pointer !== null) {
    input.axis = stick.axis;
    input.vertical = stick.vertical;
  }
  if (input.axis) input.target = null;
  if (input.vertical) input.targetY = null;
  input.fire = held.has("f") || fireHeld;
  input.rescue = held.has("e") || rescueHeld;
  if (training) autopilot();
  if (
    host &&
    !training &&
    connected &&
    state.phase === "playing" &&
    now - lastInputAt > 2500
  )
    pause("Dein Partner sendet gerade keine Eingaben. Euer Flug wartet.");
  if (
    host &&
    state.phase === "playing" &&
    (training || (connected && !netLost))
  ) {
    accumulator += dt;
    while (accumulator >= 1 / 60) {
      step(state, [input, remoteInput], 1 / 60);
      accumulator -= 1 / 60;
    }
  } else accumulator = 0;
  if (!host && now - lastSent > 50) {
    sendInput();
    lastSent = now;
  }
  if (
    state.phase !== prevPhase &&
    screen !== "menu" &&
    screen !== "lobby" &&
    screen !== "matchScreen"
  ) {
    stageReady = [false, false];
    phaseUI();
    sendSnapshot();
  }
  if (screen === "game" || screen === "pauseScreen") {
    hudElapsed += dt;
    if (hudElapsed >= 0.05) {
      hud(hudElapsed);
      hudElapsed = 0;
    }
  } else document.body.classList.remove("overdrive");
  audio.update(screen === "game" && state.phase === "playing", state.level);
  let renderState = state;
  if (!host && state.phase === "playing") {
    renderState = {
      ...state,
      t: Math.min(
        duration(state),
        presentationClock.sample(state, lastSnapshot, now),
      ),
      players: state.players.map((p, i) =>
        i === local ? predictPilot(p, input, (now - lastSnapshot) / 1000) : p,
      ),
    };
  }
  if (
    screen !== "menu" &&
    screen !== "lobby" &&
    (screen === "game" || now - lastPanelFrame > 250)
  ) {
    view.update(renderState, local, screen, dt);
    lastPanelFrame = now;
  }
  requestAnimationFrame(frame);
}
if (navigator.maxTouchPoints > 0)
  $("controlHint").textContent = "STICK: 4 RICHTUNGEN · DASH / RETTEN / FEUER";
saveSettings();
show("menu");
try {
  const result = JSON.parse(sessionStorage.getItem("aether-last-result"));
  if (
    !params.has("room") &&
    validSnapshot(result) &&
    ["result", "victory", "failed"].includes(result.phase)
  ) {
    state = result;
    training = result.training;
    phaseUI();
  }
} catch {}
$("boot").hidden = true;
requestAnimationFrame(frame);
if (params.get("room") && /^[A-Z]{4}$/i.test(params.get("room"))) {
  $("joinForm").hidden = false;
  $("roomInput").value = params.get("room").toUpperCase();
}
// Testzugriff nur bei ausdrücklichem Debug-Parameter; kein abweichender Spielmodus.
if (params.get("debug") === "1")
  window.__flight = {
    state: () => snapshot(state),
    input: () => ({ ...input }),
    pilot: () => profile(pilotProfile),
    helloAgain: () => send(helloPacket()),
    replayResult: async (result) => {
      if (
        !validSnapshot(result) ||
        !["result", "victory"].includes(result.phase)
      )
        throw Error("Ungültiges Ergebnis");
      state = result;
      training = result.training;
      storedKey = "";
      phaseUI();
    },
    graphics: () => ({
      calls: view.renderer.info.render.calls,
      triangles: view.renderer.info.render.triangles,
      pixelRatio: view.renderer.getPixelRatio(),
      width: view.renderer.domElement.width,
      height: view.renderer.domElement.height,
      backend:
        view.backend ||
        (() => {
          const gl = view.renderer.getContext(),
            ext = gl.getExtension("WEBGL_debug_renderer_info");
          return ext
            ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER);
        })(),
    }),
    role: () => ({
      host,
      local,
      connected,
      hello,
      screen,
      ready: stageReady,
      netLost,
      lastFrame,
      accumulator,
      remoteInput,
    }),
    setInput: (v) => {
      input = { ...input, ...v };
    },
    simulate: (seconds) => {
      if (!host) throw Error("Nur Host");
      for (let t = 0; t < seconds; t += 1 / 60) {
        const e = eventsFor(state).find(
          (e) =>
            (e.type === "hazard" || e.type === "drone") &&
            !state.destroyed.includes(e.id) &&
            e.t > state.t &&
            e.t < state.t + 1.3,
        );
        step(
          state,
          state.players.map((p) => ({ target: e ? (e.x >= 0 ? -8 : 8) : p.x })),
          1 / 60,
        );
      }
      phaseUI();
      sendSnapshot();
    },
    hit: async (i) => {
      const { hit } = await import("./core.mjs");
      state.players[i].inv = 0;
      hit(state, i);
      sendSnapshot();
    },
    pause: () => requestPause("Testpause"),
    disconnect: () => closeSession(),
  };
