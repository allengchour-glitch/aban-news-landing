# git_aufloesen.sh — gemeinsame Konfliktregeln fuer alle automatischen git-Schreiber (autocommit.sh, git_sichern.sh).
# 23.09.2026: (1) ein gescheiterter Merge blieb offen und der naechste `add -A` committete die Marker; (2) ein
# `rebase.autoStash` konnte seinen Stash nicht zurueckspielen und liess «unmerged» Dateien ohne MERGE_HEAD zurueck.
# Regeln je Dateiart: Ledger (.txt/.tsv/.jsonl) = Union; Zustand (Cursor/.json/.md/.csv) = eigene Fassung;
# alles ausserhalb dropship/ = Abbruch (Code wird nie automatisch zusammengefuehrt).
aufloesen() {
  local f b o t
  for f in $(git diff --name-only --diff-filter=U); do
    case "$f" in
      dropship/*cursor*|dropship/*.json|dropship/*.md|dropship/*.csv|dropship/*/*.json)
        git checkout --ours -- "$f" 2>/dev/null || git checkout --theirs -- "$f" ;;
      dropship/*.txt|dropship/*.tsv|dropship/*.jsonl|dropship/*/*.txt)
        b=$(mktemp); o=$(mktemp); t=$(mktemp)
        # 15.10.2026: Fehlt eine Seite (geändert/gelöscht, oder ein anderer Prozess hat schon aufgelöst), wurde sie bisher
        # als LEERE Datei vereinigt und das Ergebnis über das Ledger kopiert. Jetzt: nur mit beiden Seiten vereinigen,
        # sonst die vorhandene Seite nehmen — nie eine leere Fassung schreiben.
        if git show ":2:$f" > "$o" 2>/dev/null && git show ":3:$f" > "$t" 2>/dev/null; then
          git show ":1:$f" > "$b" 2>/dev/null || : > "$b"
          git merge-file --union "$o" "$b" "$t"; cp "$o" "$f"
        else
          git checkout --ours -- "$f" 2>/dev/null || git checkout --theirs -- "$f" 2>/dev/null || true
        fi
        rm -f "$b" "$o" "$t" ;;
      *)
        echo "$(date -u +%H:%M) Konflikt ausserhalb der Ledger ($f) — abgebrochen"
        [ -f .git/MERGE_HEAD ] && git merge --abort
        return 1 ;;
    esac
    git add -- "$f"
  done
  # 15.10.2026: Ledger-Schrumpf-Tor auch vor dem Merge-Commit (Vergleich gegen HEAD UND MERGE_HEAD).
  [ -f .git/MERGE_HEAD ] && python3 "$(git rev-parse --show-toplevel)/automation/ledger_schrumpf_tor.py" --merge >> /tmp/ledger_schrumpf.log 2>&1
  [ -f .git/MERGE_HEAD ] && git commit -q --no-edit 2>/dev/null
  return 0
}
marker() { git grep -l -E "^(<<<<<<< |>>>>>>> )" HEAD -- dropship/ 2>/dev/null | head -5; }
