#!/usr/bin/env python3
"""Build a local, read-only Obsidian view of the LuxeStyle project memory.

The repository is public and the canonical memory is maintained on a dedicated
documentation branch.  This helper therefore never creates a vault inside the
repository, never enables Obsidian Sync or Publish, and never installs a plugin.
It records hashes for three canonical Markdown files and creates a small task
overview from allowlisted fields in ``ARBEITSSTAND.json``. Raw source files are
not copied into the vault because they can contain operational or order data.

Examples:

    python3 automation/luxestyle_obsidian_vault.py build \
      --source /path/to/handoff-checkout/dropship/codex-handoff-20261018
    python3 automation/luxestyle_obsidian_vault.py check
    python3 automation/luxestyle_obsidian_vault.py build \
      --source /path/to/handoff-checkout/dropship/codex-handoff-20261018 \
      --output /safe/local/path
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


MANAGED_BY = "luxestyle_obsidian_vault.py/v1"
MEMORY_REL = Path("dropship/codex-handoff-20261018")
SOURCE_FILES = ("README.md", "PROJEKTGEDAECHTNIS.md", "TAGESPROTOKOLL.md")
WORKSTATE_FILE = "ARBEITSSTAND.json"

PUBLIC_BUSINESS_EMAILS = {"info@luxestyle.ch"}
EMAIL_RE = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
SECRET_PATTERNS = (
    (
        "private_key",
        re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    ),
    (
        "provider_token",
        re.compile(
            r"\b(?:gh[pousr]_|glpat-|xox[baprs]-|shpat_|shpss_|sk-(?:proj-)?)"
            r"[A-Za-z0-9_.-]{8,}"
        ),
    ),
    (
        "credential_assignment",
        re.compile(
            r"(?i)(?:api[_ -]?key|client[_ -]?secret|password|passwd|"
            r"access[_ -]?token|refresh[_ -]?token|authorization|bearer)"
            r"[\"' ]*[:=][\"' ]*[^\s\"']{8,}"
        ),
    ),
)


class VaultError(RuntimeError):
    """A safe, user-facing build or validation error."""


def repo_root(start: Path | None = None) -> Path:
    here = (start or Path(__file__).resolve()).resolve()
    cwd = here if here.is_dir() else here.parent
    result = subprocess.run(
        ["git", "-C", str(cwd), "rev-parse", "--show-toplevel"],
        check=True,
        capture_output=True,
        text=True,
    )
    return Path(result.stdout.strip()).resolve()


def default_output() -> Path:
    configured = os.environ.get("LUXESTYLE_OBSIDIAN_VAULT")
    if configured:
        return Path(configured).expanduser()
    data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return data_home / "luxestyle-obsidian-vault"


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def ensure_external_output(output: Path, root: Path) -> Path:
    output = output.expanduser().absolute()
    if is_within(output, root):
        raise VaultError(
            "Ausgabe liegt im öffentlichen Repository. "
            "Einen lokalen Pfad ausserhalb des Repos verwenden."
        )
    return output


def ensure_outside_any_git_repo(output: Path) -> Path:
    """Refuse a vault beneath any Git worktree, including an unrelated repo."""

    probe = output.expanduser().absolute()
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    result = subprocess.run(
        ["git", "-C", str(probe), "rev-parse", "--show-toplevel"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        git_root = Path(result.stdout.strip()).resolve()
        if is_within(output, git_root):
            raise VaultError(
                "Ausgabe liegt in einem Git-Repository. "
                "Einen lokalen Pfad ausserhalb aller Repositories verwenden."
            )
    return output


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def scan_text(text: str, label: str) -> None:
    findings: list[str] = []
    for name, pattern in SECRET_PATTERNS:
        if pattern.search(text):
            findings.append(name)
    unknown_emails = sorted(
        {match.lower() for match in EMAIL_RE.findall(text)} - PUBLIC_BUSINESS_EMAILS
    )
    if unknown_emails:
        findings.append(f"nicht_allowlistete_email:{len(unknown_emails)}")
    if findings:
        raise VaultError(f"Sicherheitsprüfung für {label} blockiert: {', '.join(findings)}")


def git_value(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def validate_canonical_clean_source(source: Path, source_repo: Path) -> None:
    try:
        relative = source.relative_to(source_repo)
    except ValueError as exc:
        raise VaultError("Quelle liegt nicht im erkannten Git-Repository") from exc
    if relative != MEMORY_REL:
        raise VaultError(
            f"Quelle muss der kanonische Handoff-Pfad {MEMORY_REL} sein"
        )

    paths = [str(relative / name) for name in (*SOURCE_FILES, WORKSTATE_FILE)]
    for path in paths:
        tracked = subprocess.run(
            ["git", "-C", str(source_repo), "ls-files", "--error-unmatch", path],
            check=False,
            capture_output=True,
            text=True,
        )
        if tracked.returncode != 0:
            raise VaultError(f"Quelle ist nicht in Git versioniert: {path}")
    status = git_value(
        source_repo,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--",
        *paths,
    )
    if status:
        raise VaultError(
            "Kanonische Quelldateien sind nicht sauber auf HEAD; zuerst committen oder zurücksetzen"
        )


def clean_cell(value: Any) -> str:
    value = "" if value is None else str(value)
    return " ".join(value.replace("|", "\\|").split())


def task_overview(workstate: dict[str, Any], source_sha: str) -> str:
    tasks = workstate.get("tasks")
    if not isinstance(tasks, list):
        raise VaultError("ARBEITSSTAND.json enthält keine Aufgabenliste")

    lines = [
        "---",
        "tags: [luxestyle, arbeitsstand, erzeugt]",
        "generated: true",
        "---",
        "# Arbeitsstand – sichere Übersicht",
        "",
        "Diese Ansicht wird lokal aus allowlisteten Feldern von `ARBEITSSTAND.json` erzeugt.",
        "Sie enthält keine Rohbelege, Kontaktfelder, Zugangsdaten oder Kundendaten.",
        "Für operative Arbeit gilt weiterhin die aktuelle versionierte Quelldatei.",
        "",
        f"- Revision: `{clean_cell(workstate.get('revision', 'unbekannt'))}`",
        f"- Aktualisiert: `{clean_cell(workstate.get('updatedAt', 'unbekannt'))}`",
        f"- Quell-SHA-256: `{source_sha}`",
        "",
        "| Aufgaben-ID | Priorität | Zustand | Titel | Letzter Beleg | Frisch prüfen |",
        "|---|---:|---|---|---|---|",
    ]
    for task in tasks:
        if not isinstance(task, dict):
            raise VaultError("ARBEITSSTAND.json enthält einen ungültigen Aufgabeneintrag")
        required = ("id", "priority", "state", "title")
        if any(key not in task for key in required):
            raise VaultError("ARBEITSSTAND.json: Pflichtfeld in Aufgabe fehlt")
        row = (
            task.get("id"),
            task.get("priority"),
            task.get("state"),
            task.get("title"),
            task.get("lastEvidenceDate", "unbekannt"),
            "ja" if task.get("requiresFreshVerification") else "nein",
        )
        lines.append("| " + " | ".join(clean_cell(value) for value in row) + " |")
    lines.append("")
    result = "\n".join(lines)
    scan_text(result, "ARBEITSSTAND-UEBERSICHT.md")
    return result


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def start_note(commit: str, branch: str, generated_at: str) -> str:
    return "\n".join(
        [
            "---",
            "tags: [luxestyle, projektgedaechtnis, lokal]",
            "---",
            "# LuxeStyle – Projektgedächtnis",
            "",
            "Lokale, lesende Obsidian-Ansicht des versionierten Projektgedächtnisses.",
            "",
            "- [[ARBEITSSTAND-UEBERSICHT]] – allowlistete Aufgabenübersicht",
            "- [[QUELLEN]] – Quellpfade, Commit und Prüfsummen",
            "- [[LOKALER-BETRIEB]] – Sicherheits- und Aktualisierungshinweise",
            "",
            f"Quelle: Branch `{branch}`, Commit `{commit}`.",
            f"Erzeugt: `{generated_at}`.",
            "",
        ]
    )


def source_note(source_repo: Path, documents: dict[str, dict[str, str]]) -> str:
    lines = [
        "---",
        "tags: [luxestyle, quellen, lokal]",
        "---",
        "# Quellen",
        "",
        "Der Vault enthält keine Rohkopien. Die aktuellen, versionierten Quelldateien bleiben",
        "massgebend und können bei Bedarf lokal im Repository geöffnet werden.",
        "",
        "| Quelle | SHA-256 | Lokaler Link |",
        "|---|---|---|",
    ]
    for name, entry in documents.items():
        path = source_repo / entry["source"]
        lines.append(
            f"| `{name}` | `{entry['sha256']}` | [im Repository öffnen]({path.resolve().as_uri()}) |"
        )
    lines.append("")
    result = "\n".join(lines)
    scan_text(result, "QUELLEN.md")
    return result


def operation_note(builder_root: Path, source: Path, output: Path) -> str:
    command = shlex.join(
        [
            "python3",
            str(builder_root / "automation" / "luxestyle_obsidian_vault.py"),
            "build",
            "--source",
            str(source),
            "--output",
            str(output),
        ]
    )
    return "\n".join(
        [
            "---",
            "tags: [luxestyle, lokal, sicherheit]",
            "---",
            "# Lokaler Betrieb",
            "",
            "Dieser Vault ist eine lokale, erzeugte Leseansicht. Die versionierten Quelldateien im",
            "Repository bleiben massgebend. Änderungen in diesem Vault nicht zurückkopieren.",
            "",
            "## Sicherheitsgrenzen",
            "",
            "- Obsidian Sync und Publish sind deaktiviert.",
            "- Community-Plugins sind deaktiviert; es wird nichts installiert.",
            "- Es gibt keine `workspace*.json`; Fensterzustände werden nicht versioniert.",
            "- Rohdateien aus dem Projektgedächtnis werden nicht in den Vault kopiert.",
            "- Die drei kanonischen Markdown-Dateien erscheinen nur als lokale Links mit Prüfsumme.",
            "- Aus `ARBEITSSTAND.json` werden nur Aufgaben-ID, Priorität, Zustand, Titel,",
            "  Belegdatum und das Frischprüfungs-Flag übernommen.",
            "- Der Builder blockiert bekannte Secret-Muster und nicht allowlistete E-Mail-Adressen.",
            "- Es gibt keinen Cloud-Sync, Hintergrunddienst, Hook, Workflow oder Deploy.",
            "",
            "## Aktualisieren",
            "",
            "Nach dem frischen Lesen des Handoff-Branches in einen neuen lokalen Zielpfad bauen:",
            "",
            "```bash",
            command,
            "```",
            "",
            "Ein vorhandener Zielpfad wird absichtlich nie ersetzt oder gelöscht. Für eine neue",
            "Revision im Befehl einen neuen `--output`-Pfad wählen und diesen danach in der",
            "lokal installierten Obsidian-App als Vault öffnen.",
            "Auf diesem Rechner ist die App nicht Teil des Builders und wird nicht installiert.",
            "",
        ]
    )


def expected_config() -> dict[str, Any]:
    return {
        "app.json": {
            "alwaysUpdateLinks": True,
            "attachmentFolderPath": "Anhaenge",
            "defaultViewMode": "preview",
            "livePreview": True,
            "newLinkFormat": "shortest",
            "promptDelete": True,
            "showUnsupportedFiles": False,
            "strictLineBreaks": False,
            "useMarkdownLinks": True,
        },
        "appearance.json": {
            "accentColor": "#8c7a66",
            "baseFontSize": 17,
            "showViewHeader": True,
            "theme": "system",
        },
        "core-plugins.json": {
            "audio-recorder": False,
            "backlink": True,
            "bookmarks": True,
            "command-palette": True,
            "file-explorer": True,
            "file-recovery": True,
            "global-search": True,
            "graph": True,
            "note-composer": True,
            "outline": True,
            "outgoing-link": True,
            "page-preview": True,
            "publish": False,
            "random-note": False,
            "sync": False,
            "tag-pane": True,
            "word-count": True,
        },
        "community-plugins.json": [],
        "graph.json": {
            "hideUnresolved": True,
            "showAttachments": False,
            "showOrphans": True,
            "showTags": True,
        },
    }


def build(builder_root: Path, source: Path, output: Path) -> dict[str, Any]:
    builder_root = builder_root.resolve()
    source = source.expanduser().resolve()
    source_repo = repo_root(source)
    output = ensure_external_output(output, builder_root)
    output = ensure_external_output(output, source_repo)
    output = ensure_outside_any_git_repo(output)
    validate_canonical_clean_source(source, source_repo)
    required = [source / name for name in (*SOURCE_FILES, WORKSTATE_FILE)]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise VaultError("Projektgedächtnis unvollständig: " + ", ".join(missing))

    copied: dict[str, dict[str, str]] = {}
    for name in SOURCE_FILES:
        path = source / name
        text = path.read_text(encoding="utf-8")
        scan_text(text, name)
        copied[name] = {
            "source": str(path.relative_to(source_repo)),
            "sha256": sha256(path),
        }

    state_path = source / WORKSTATE_FILE
    try:
        workstate = json.loads(state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise VaultError(f"ARBEITSSTAND.json ist ungültig: {exc}") from exc
    if not isinstance(workstate, dict):
        raise VaultError("ARBEITSSTAND.json muss ein Objekt enthalten")
    state_sha = sha256(state_path)
    overview = task_overview(workstate, state_sha)

    commit = git_value(source_repo, "rev-parse", "HEAD")
    branch = git_value(source_repo, "branch", "--show-current") or "detached"
    builder_commit = git_value(builder_root, "rev-parse", "HEAD")
    builder_branch = git_value(builder_root, "branch", "--show-current") or "detached"
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise VaultError(f"Vorhandenes Ziel wird nicht überschrieben oder gelöscht: {output}")

    with tempfile.TemporaryDirectory(prefix="luxestyle-obsidian-", dir=output.parent) as temp:
        stage = Path(temp) / "vault"
        stage.mkdir()
        (stage / "00-START.md").write_text(
            start_note(commit, branch, generated_at), encoding="utf-8"
        )
        (stage / "ARBEITSSTAND-UEBERSICHT.md").write_text(overview, encoding="utf-8")
        (stage / "QUELLEN.md").write_text(
            source_note(source_repo, copied), encoding="utf-8"
        )
        (stage / "LOKALER-BETRIEB.md").write_text(
            operation_note(builder_root, source, output), encoding="utf-8"
        )
        for name, config in expected_config().items():
            write_json(stage / ".obsidian" / name, config)

        manifest = {
            "managedBy": MANAGED_BY,
            "generatedAt": generated_at,
            "source": {
                "repository": str(source_repo),
                "branch": branch,
                "commit": commit,
                "memoryPath": str(source.relative_to(source_repo)),
            },
            "builder": {
                "repository": str(builder_root),
                "branch": builder_branch,
                "commit": builder_commit,
            },
            "sourceDocuments": copied,
            "workstate": {
                "source": str(state_path.relative_to(source_repo)),
                "sha256": state_sha,
                "revision": workstate.get("revision"),
                "taskCount": len(workstate.get("tasks", [])),
                "rawFileCopied": False,
            },
            "safety": {
                "cloudSync": False,
                "obsidianPublish": False,
                "communityPlugins": [],
                "customerDataCopied": False,
                "rawSourceFilesCopied": False,
                "secretScan": "passed",
            },
        }
        write_json(stage / "VAULT-MANIFEST.json", manifest)

        check(stage, source_root=builder_root, require_external=False)

        stage.rename(output)

    return manifest


def iter_files(root: Path) -> Iterable[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def check(
    output: Path,
    *,
    source_root: Path | None = None,
    require_external: bool = True,
) -> dict[str, Any]:
    output = output.expanduser().absolute()
    if not output.is_dir():
        raise VaultError(f"Vault fehlt: {output}")
    if source_root is not None and require_external:
        ensure_external_output(output, source_root)
        ensure_outside_any_git_repo(output)

    manifest_path = output / "VAULT-MANIFEST.json"
    if not manifest_path.is_file():
        raise VaultError("VAULT-MANIFEST.json fehlt")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise VaultError(f"VAULT-MANIFEST.json ist ungültig: {exc}") from exc
    if manifest.get("managedBy") != MANAGED_BY:
        raise VaultError("Vault ist nicht von diesem Builder verwaltet")

    config = expected_config()
    for name, expected in config.items():
        path = output / ".obsidian" / name
        if not path.is_file():
            raise VaultError(f"Obsidian-Konfiguration fehlt: {name}")
        actual = json.loads(path.read_text(encoding="utf-8"))
        if actual != expected:
            raise VaultError(f"Obsidian-Konfiguration abweichend: {name}")

    forbidden = list((output / ".obsidian").glob("workspace*.json"))
    plugin_dir = output / ".obsidian" / "plugins"
    if forbidden or plugin_dir.exists():
        raise VaultError("Workspace-Zustand oder Community-Plugin-Verzeichnis gefunden")

    expected_files = {
        ".obsidian/app.json",
        ".obsidian/appearance.json",
        ".obsidian/community-plugins.json",
        ".obsidian/core-plugins.json",
        ".obsidian/graph.json",
        "00-START.md",
        "ARBEITSSTAND-UEBERSICHT.md",
        "LOKALER-BETRIEB.md",
        "QUELLEN.md",
        "VAULT-MANIFEST.json",
    }
    actual_files = {str(path.relative_to(output)) for path in iter_files(output)}
    if actual_files != expected_files:
        extra = sorted(actual_files - expected_files)
        missing = sorted(expected_files - actual_files)
        raise VaultError(f"Unerwarteter Vault-Inhalt: extra={extra}, fehlt={missing}")

    for path in iter_files(output):
        if path.suffix.lower() in {".md", ".json"}:
            scan_text(path.read_text(encoding="utf-8"), str(path.relative_to(output)))

    safety = manifest.get("safety", {})
    if safety.get("cloudSync") is not False or safety.get("obsidianPublish") is not False:
        raise VaultError("Manifest erlaubt Cloud-Sync oder Publish")
    if safety.get("communityPlugins") != []:
        raise VaultError("Manifest enthält Community-Plugins")
    return manifest


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("command", choices=("build", "check"))
    result.add_argument("--repo", type=Path, help="Repository-Wurzel (Standard: automatisch)")
    result.add_argument(
        "--source",
        type=Path,
        help="Expliziter Pfad zum Ordner dropship/codex-handoff-20261018",
    )
    result.add_argument("--output", type=Path, default=default_output())
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        root = (args.repo or repo_root()).resolve()
        output = ensure_external_output(args.output, root)
        if args.command == "build":
            if args.source is None:
                raise VaultError("build benötigt --source zum aktuellen Handoff-Ordner")
            manifest = build(root, args.source, output)
            print(
                "VAULT_READY "
                f"path={output} revision={manifest['workstate']['revision']} "
                f"tasks={manifest['workstate']['taskCount']} "
                f"commit={manifest['source']['commit']}"
            )
        else:
            manifest = check(output, source_root=root)
            print(
                "VAULT_OK "
                f"path={output} revision={manifest['workstate']['revision']} "
                f"tasks={manifest['workstate']['taskCount']}"
            )
        return 0
    except (VaultError, OSError, subprocess.CalledProcessError) as exc:
        print(f"VAULT_BLOCKED {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
