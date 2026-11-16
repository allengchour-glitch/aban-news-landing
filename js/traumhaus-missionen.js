/* Stadtauftraege: reine Zustandswechsel, ohne DOM, Uhr oder Geldauszahlung. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TraumMission = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var definitions = [
    {
      id: 'kurier', name: 'Kurier durch die Stadt', symbol: '📦', reward: 180,
      description: 'Hole ein Paket am Bahnhof ab, bringe es zum Forum und melde dich im Depot zurück.',
      stages: [
        { anchor: 'bahnhof', requirement: 'foot', holdSeconds: 0, title: 'Paket am Bahnhof abholen', action: 'Paket abholen' },
        { anchor: 'forum', requirement: 'foot', holdSeconds: 0, title: 'Paket am Forum abgeben', action: 'Paket abgeben' },
        { anchor: 'depot', requirement: 'foot', holdSeconds: 0, title: 'Lieferung im Depot melden', action: 'Lieferung bestätigen' }
      ]
    },
    {
      id: 'auto', name: 'Wagenüberführung', symbol: '🚗', reward: 240,
      description: 'Hole den Überführungsauftrag im Depot ab und bringe den Auftragswagen zur Garage.',
      stages: [
        { anchor: 'depot', requirement: 'foot', holdSeconds: 0, title: 'Auftrag im Depot abholen', action: 'Auftrag abholen' },
        { anchor: 'depot', requirement: 'missionCar', holdSeconds: 0, title: 'In den Auftragswagen einsteigen', action: 'Überführung beginnen' },
        { anchor: 'garage', requirement: 'missionCar', holdSeconds: 0, title: 'Auftragswagen zur Garage bringen', action: 'Wagen übergeben' }
      ]
    },
    {
      id: 'service', name: 'Technikdienst', symbol: '🔧', reward: 180,
      description: 'Hole Werkzeug im Depot, repariere den Technikpunkt und melde den Abschluss am Forum.',
      stages: [
        { anchor: 'depot', requirement: 'foot', holdSeconds: 0, title: 'Werkzeug im Depot holen', action: 'Werkzeug abholen' },
        { anchor: 'service', requirement: 'foot', holdSeconds: 3, title: 'Technikpunkt reparieren', action: 'Reparieren' },
        { anchor: 'forum', requirement: 'foot', holdSeconds: 0, title: 'Reparatur am Forum melden', action: 'Reparatur bestätigen' }
      ]
    },
    {
      id: 'express', name: 'Stadtexpress', symbol: '🏁', reward: 220, optionalSeconds: 240,
      description: 'Fahre über Nordstadt und Oststadt zum Motorsportpark. Vier Minuten sind ein freiwilliges Zeitziel.',
      stages: [
        { anchor: 'nordpark', requirement: 'car', holdSeconds: 0, title: 'Startpunkt am Nordpark anfahren', action: 'Startpunkt bestätigen' },
        { anchor: 'forum', requirement: 'car', holdSeconds: 0, title: 'Checkpoint in der Oststadt anfahren', action: 'Checkpoint bestätigen' },
        { anchor: 'track', requirement: 'car', holdSeconds: 0, title: 'Ziel am Motorsportpark erreichen', action: 'Ziel bestätigen' }
      ]
    }
  ];
  var byId = Object.create(null);
  definitions.forEach(function (definition) {
    definition.stages.forEach(Object.freeze);
    Object.freeze(definition.stages);
    Object.freeze(definition);
    byId[definition.id] = definition;
  });
  Object.freeze(definitions);

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }
  function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function known(id) {
    return typeof id === 'string' && own(byId, id);
  }
  function fresh() {
    return { done: {}, active: null };
  }
  function sanitize(raw) {
    var state = fresh();
    if (!record(raw)) return state;
    if (record(raw.done)) definitions.forEach(function (definition) {
      if (own(raw.done, definition.id) && raw.done[definition.id] === true) state.done[definition.id] = true;
    });
    var active = raw.active;
    if (record(active) && known(active.id) && Number.isInteger(active.step)
      && active.step >= 0 && active.step < byId[active.id].stages.length) {
      state.active = {
        id: active.id,
        step: active.step,
        elapsed: typeof active.elapsed === 'number' && Number.isFinite(active.elapsed)
          ? Math.max(0, Math.min(604800, active.elapsed)) : 0
      };
    }
    return state;
  }

  function result(state, ok, error, message) {
    return {
      state: state, ok: ok, completed: false, firstCompletion: false, reward: 0,
      missionId: state.active ? state.active.id : null, timely: null,
      error: error || null, message: message || ''
    };
  }
  function begin(raw, id) {
    var state = sanitize(raw);
    if (!known(id)) return result(state, false, 'mission_unbekannt', 'Dieser Auftrag ist nicht verfügbar.');
    if (state.active) return result(state, false, 'auftrag_aktiv', 'Schliesse zuerst den laufenden Auftrag ab oder brich ihn ab.');
    state.active = { id: id, step: 0, elapsed: 0 };
    return result(state, true);
  }
  function advance(raw, context) {
    var state = sanitize(raw), active = state.active;
    if (!active) return result(state, false, 'kein_auftrag', 'Wähle zuerst einen Auftrag.');
    var definition = byId[active.id], stage = definition.stages[active.step];
    context = record(context) ? context : {};
    if (context.anchor !== stage.anchor) return result(state, false, 'falscher_ort', 'Gehe zum markierten Auftragsort.');
    if (stage.requirement === 'foot' && context.mode !== 'foot') return result(state, false, 'zu_fuss', 'Steige aus und erledige diese Aufgabe zu Fuss.');
    if (stage.requirement !== 'foot' && context.mode !== 'car') return result(state, false, 'fahrzeug_noetig', 'Steige für diese Aufgabe in ein Auto.');
    if (stage.requirement === 'missionCar' && context.missionCar !== true) return result(state, false, 'auftragswagen_noetig', 'Benutze den markierten Auftragswagen.');
    if (stage.holdSeconds > 0 && (typeof context.heldSeconds !== 'number'
      || !Number.isFinite(context.heldSeconds) || context.heldSeconds < stage.holdSeconds)) {
      return result(state, false, 'aktion_noch_nicht_fertig', 'Die Reparatur ist noch nicht fertig.');
    }
    if (active.step + 1 < definition.stages.length) {
      active.step++;
      return result(state, true);
    }
    var first = state.done[active.id] !== true, elapsed = active.elapsed;
    state.done[active.id] = true;
    state.active = null;
    var finished = result(state, true);
    finished.completed = true;
    finished.firstCompletion = first;
    finished.reward = first ? definition.reward : 0;
    finished.missionId = definition.id;
    finished.elapsed = elapsed;
    finished.timely = definition.optionalSeconds ? elapsed <= definition.optionalSeconds : null;
    return finished;
  }
  function cancel(raw) {
    var state = sanitize(raw), id = state.active ? state.active.id : null;
    state.active = null;
    var cancelled = result(state, true);
    cancelled.missionId = id;
    return cancelled;
  }

  return { definitions: definitions, fresh: fresh, sanitize: sanitize, begin: begin, advance: advance, cancel: cancel };
});
