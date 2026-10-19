/** Pure local readiness assessment. It never reads files or contacts a client. */
import { MCP_LAUNCHER } from './claude_assist_launch.mjs';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function nodeCheck(version) {
  // Accept a complete stable Node version, not an optimistic parseInt('v???').
  if (typeof version !== 'string') return ['unknown', 'Die lokale Node-Version ist nicht nachgewiesen.'];
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match || !match.slice(1).every(part => Number.isSafeInteger(Number(part)))) {
    return ['unknown', 'Die lokale Node-Version ist keine vollständige stabile Versionsangabe.'];
  }
  if (Number(match[1]) < 22) return ['failed', 'Der Helfer benötigt mindestens Node 22.'];
  return ['passed', 'Die geprüfte lokale Node-Version erfüllt mindestens Version 22.'];
}

function configCheck(config, state) {
  if (state !== 'available') return ['unknown', 'Die lokale MCP-Konfiguration ist nicht verlässlich lesbar.'];
  if (config === undefined || config === null) return ['unknown', 'Die lokale MCP-Konfiguration fehlt.'];
  if (!isObject(config)) return ['failed', 'Die geparste MCP-Konfiguration muss ein JSON-Objekt sein.'];
  if (config.mcpServers === undefined) return ['unknown', 'In der lokalen Konfiguration fehlt der MCP-Servereintrag.'];
  if (!isObject(config.mcpServers)) return ['failed', 'mcpServers muss ein JSON-Objekt sein.'];
  const server = config.mcpServers['luxestyle-assist'];
  if (server === undefined) return ['unknown', 'Der lokale MCP-Eintrag luxestyle-assist fehlt.'];
  if (!isObject(server) || server.type !== 'stdio' || server.command !== 'node'
    || !Array.isArray(server.args) || server.args.length !== 2
    || server.args[0] !== '-e' || server.args[1] !== MCP_LAUNCHER) {
    return ['failed', 'Der vorhandene MCP-Eintrag startet nicht den vorgesehenen LuxeStyle-Helfer.'];
  }
  const env = server.env;
  if (!isObject(env)) {
    return ['unknown', 'Die explizit bereinigte Node-Startumgebung ist nicht nachgewiesen.'];
  }
  const nodeKeys = ['NODE_OPTIONS', 'NODE_PATH'];
  if (nodeKeys.some(key => Object.hasOwn(env, key) && env[key] !== '')) {
    return ['failed', 'Die Node-Startumgebung enthält nicht freigegebene Ladeoptionen.'];
  }
  if (Object.keys(server).some(key => !['type', 'command', 'args', 'env'].includes(key))) {
    return ['unknown', 'Zusätzliche Optionen im Helfereintrag sind nicht geprüft; der lokale Standardstart ist damit nicht belegt.'];
  }
  if (Object.keys(env).some(key => !nodeKeys.includes(key))) {
    return ['unknown', 'Zusätzliche Variablen in der Helfer-Startumgebung sind nicht geprüft.'];
  }
  if (nodeKeys.some(key => !Object.hasOwn(env, key))) {
    return ['unknown', 'Die explizit bereinigte Node-Startumgebung ist unvollständig.'];
  }
  return ['passed', 'Der lokale MCP-Eintrag verweist auf den vorgesehenen stdio-Helfer; ein Client-Start ist damit nicht bestätigt.'];
}

/**
 * Inspect evidence supplied by the caller. `ready` means local prerequisites
 * only; it never proves that Claude Code has loaded or connected the server.
 * Unknown evidence is preserved, including an absent/unreadable journal.
 */
export function inspectReadiness(input = {}) {
  const evidence = isObject(input) ? input : {};
  const checks = [], nextSteps = [];
  function add(id, result, nextStep) {
    const [state, reason] = result;
    checks.push({ id, state, reason });
    if (state !== 'passed') nextSteps.push(nextStep);
  }
  add('node', nodeCheck(evidence.nodeVersion), 'Eine vollständige lokale Node-Version prüfen und bei Bedarf Node 22 oder neuer bereitstellen.');
  add('mcp_config', configCheck(evidence.config, evidence.configState), 'Die lokale .mcp.json lesen und nur den Eintrag luxestyle-assist auf den vorgesehenen stdio-Befehl prüfen; andere Server erhalten.');
  add('cli', evidence.cliPresent === true
    ? ['passed', 'Die lokale Helferdatei ist nachgewiesen.']
    : ['unknown', 'Die lokale Helferdatei ist nicht nachgewiesen.'],
  'automation/claude-assist.mjs aus dem geprüften Branch lokal bereitstellen und erneut prüfen.');
  add('slash_command', evidence.commandPresent === true
    ? ['passed', 'Die lokale Slash-Command-Datei ist nachgewiesen.']
    : ['unknown', 'Die lokale Slash-Command-Datei ist nicht nachgewiesen.'],
  '.claude/commands/luxestyle-assist.md aus dem geprüften Branch lokal bereitstellen und erneut prüfen.');
  add('lock', evidence.lockState === 'absent'
    ? ['passed', 'Es wurde kein lokaler Schreib-Lock festgestellt.']
    : evidence.lockState === 'present'
      ? ['failed', 'Ein lokaler Schreib-Lock ist vorhanden.']
      : ['unknown', 'Der lokale Schreib-Lock-Zustand ist unbekannt.'],
  'Den lokalen Lock und seinen laufenden Vorgang prüfen; einen vorhandenen Lock nicht blind löschen.');
  add('repository', evidence.repoState === 'matched'
    ? ['passed', 'Die geprüfte lokale Repository-Zuordnung stimmt überein.']
    : evidence.repoState === 'mismatch'
      ? ['failed', 'Die lokale Repository-Zuordnung weicht vom vorgesehenen Projekt ab.']
      : ['unknown', 'Die lokale Repository-Zuordnung ist unbekannt.'],
  'Die lokale Repository-Zuordnung mit allengchour-glitch/aban-news-landing abgleichen; bei Abweichung keine Aufgaben übernehmen.');
  add('history', evidence.historyState === 'available'
    ? ['passed', 'Die vorhandene lokale Übergabehistorie ist lesbar.']
    : ['unknown', 'Eine lesbare bestehende Übergabehistorie ist nicht nachgewiesen.'],
  'Die bestehende Übergabehistorie gezielt auffinden und prüfen; keine fehlende oder beschädigte Historie durch ein leeres Journal ersetzen.');
  const state = checks.some(check => check.state === 'failed') ? 'blocked'
    : checks.some(check => check.state === 'unknown') ? 'unknown' : 'ready';
  return { state, checks, nextSteps };
}
