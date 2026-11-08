#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("luxestyle_obsidian_vault.py")
SPEC = importlib.util.spec_from_file_location("luxestyle_obsidian_vault", MODULE_PATH)
assert SPEC and SPEC.loader
vault = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(vault)


class ObsidianVaultTests(unittest.TestCase):
    def make_repo(self, root: Path) -> Path:
        repo = root / "repo"
        memory = repo / vault.MEMORY_REL
        memory.mkdir(parents=True)
        (memory / "README.md").write_text("# Übergabe\n\nAktueller Stand.\n", encoding="utf-8")
        (memory / "PROJEKTGEDAECHTNIS.md").write_text(
            "# Projektgedächtnis\n\nBelegte Aufgabe.\n", encoding="utf-8"
        )
        (memory / "TAGESPROTOKOLL.md").write_text(
            "# Tagesprotokoll\n\n| Bereich | Tätigkeit | Status |\n", encoding="utf-8"
        )
        state = {
            "revision": 7,
            "updatedAt": "2026-11-08T01:00:00+01:00",
            "tasks": [
                {
                    "id": "seo-safe",
                    "priority": 1,
                    "state": "offen",
                    "title": "SEO prüfen",
                    "lastEvidenceDate": "2026-11-08",
                    "requiresFreshVerification": True,
                    "blockers": ["dieses Feld darf nicht in die Übersicht"],
                }
            ],
            "from_email": "customer@example.net",
        }
        (memory / "ARBEITSSTAND.json").write_text(
            json.dumps(state, ensure_ascii=False), encoding="utf-8"
        )
        subprocess.run(["git", "init", "-q", str(repo)], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.name", "Test"], check=True)
        subprocess.run(
            ["git", "-C", str(repo), "config", "user.email", "test@example.invalid"],
            check=True,
        )
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        subprocess.run(["git", "-C", str(repo), "commit", "-qm", "fixture"], check=True)
        return repo

    def test_build_is_local_curated_and_checkable(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            output = base / "vault"
            manifest = vault.build(repo, repo / vault.MEMORY_REL, output)
            self.assertEqual(manifest["workstate"]["taskCount"], 1)
            self.assertFalse((output / "ARBEITSSTAND.json").exists())
            for name in vault.SOURCE_FILES:
                self.assertFalse((output / name).exists())
            overview = (output / "ARBEITSSTAND-UEBERSICHT.md").read_text(encoding="utf-8")
            self.assertIn("seo-safe", overview)
            self.assertNotIn("customer@example.net", overview)
            self.assertNotIn("dieses Feld darf nicht", overview)
            all_output = "\n".join(
                path.read_text(encoding="utf-8")
                for path in output.rglob("*")
                if path.is_file() and path.suffix in {".md", ".json"}
            )
            self.assertNotIn("customer@example.net", all_output)
            self.assertIn("file://", (output / "QUELLEN.md").read_text(encoding="utf-8"))
            plugins = json.loads(
                (output / ".obsidian" / "core-plugins.json").read_text(encoding="utf-8")
            )
            self.assertFalse(plugins["sync"])
            self.assertFalse(plugins["publish"])
            self.assertEqual(
                json.loads(
                    (output / ".obsidian" / "community-plugins.json").read_text(
                        encoding="utf-8"
                    )
                ),
                [],
            )
            self.assertFalse(any((output / ".obsidian").glob("workspace*.json")))
            checked = vault.check(output, source_root=repo)
            self.assertEqual(checked["managedBy"], vault.MANAGED_BY)

    def test_refuses_output_inside_public_repo(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = self.make_repo(Path(temp))
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, repo / "local-vault")

    def test_refuses_unmanaged_existing_output(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            output = base / "vault"
            output.mkdir()
            (output / "private-note.md").write_text("nicht überschreiben", encoding="utf-8")
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, output)
            self.assertTrue((output / "private-note.md").exists())

    def test_secret_in_copied_source_blocks_build(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            source = repo / vault.MEMORY_REL / "README.md"
            source.write_text("# Übergabe\n\napi_key=supersecretvalue123\n", encoding="utf-8")
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, base / "vault")

    def test_unknown_email_in_copied_source_blocks_build(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            source = repo / vault.MEMORY_REL / "README.md"
            source.write_text("# Übergabe\n\nname@example.net\n", encoding="utf-8")
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, base / "vault")


if __name__ == "__main__":
    unittest.main()
