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
    def commit_all(self, repo: Path, message: str = "fixture update") -> None:
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        subprocess.run(
            ["git", "-C", str(repo), "commit", "-qm", message], check=True
        )

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
        self.commit_all(repo, "fixture")
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

    def test_refuses_managed_existing_output_without_deleting_it(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            output = base / "vault"
            vault.build(repo, repo / vault.MEMORY_REL, output)
            manifest_before = (output / "VAULT-MANIFEST.json").read_bytes()
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, output)
            self.assertEqual(
                (output / "VAULT-MANIFEST.json").read_bytes(), manifest_before
            )

    def test_does_not_touch_previous_named_neighbour(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            output = base / "vault"
            neighbour = base / "vault.previous"
            neighbour.mkdir()
            (neighbour / "private-note.md").write_text("behalten", encoding="utf-8")
            vault.build(repo, repo / vault.MEMORY_REL, output)
            self.assertEqual(
                (neighbour / "private-note.md").read_text(encoding="utf-8"),
                "behalten",
            )

    def test_refuses_output_inside_unrelated_git_repo(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            other = base / "other"
            other.mkdir()
            subprocess.run(["git", "init", "-q", str(other)], check=True)
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, other / "vault")

    def test_refuses_dirty_canonical_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            source = repo / vault.MEMORY_REL / "README.md"
            source.write_text("# Übergabe\n\nNoch nicht committed.\n", encoding="utf-8")
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, base / "vault")

    def test_refuses_noncanonical_source_folder(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            other = repo / "other-memory"
            other.mkdir()
            for name in (*vault.SOURCE_FILES, vault.WORKSTATE_FILE):
                (other / name).write_bytes((repo / vault.MEMORY_REL / name).read_bytes())
            self.commit_all(repo)
            with self.assertRaises(vault.VaultError):
                vault.build(repo, other, base / "vault")

    def test_secret_in_copied_source_blocks_build(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            source = repo / vault.MEMORY_REL / "README.md"
            source.write_text("# Übergabe\n\napi_key=supersecretvalue123\n", encoding="utf-8")
            self.commit_all(repo)
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, base / "vault")

    def test_secret_in_task_title_blocks_build(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            state_path = repo / vault.MEMORY_REL / vault.WORKSTATE_FILE
            state = json.loads(state_path.read_text(encoding="utf-8"))
            state["tasks"][0]["title"] = "SHOPIFY_CLIENT_SECRET=<Dummywert123>"
            state_path.write_text(json.dumps(state), encoding="utf-8")
            self.commit_all(repo)
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, base / "vault")

    def test_unknown_email_in_copied_source_blocks_build(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = self.make_repo(base)
            source = repo / vault.MEMORY_REL / "README.md"
            source.write_text("# Übergabe\n\nname@example.net\n", encoding="utf-8")
            self.commit_all(repo)
            with self.assertRaises(vault.VaultError):
                vault.build(repo, repo / vault.MEMORY_REL, base / "vault")


if __name__ == "__main__":
    unittest.main()
