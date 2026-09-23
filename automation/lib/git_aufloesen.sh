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
        git show ":1:$f" > "$b" 2>/dev/null || : > "$b"
        git show ":2:$f" > "$o" 2>/dev/null || : > "$o"
        git show ":3:$f" > "$t" 2>/dev/null || : > "$t"
        git merge-file --union "$o" "$b" "$t"; cp "$o" "$f"; rm -f "$b" "$o" "$t" ;;
      *)
        echo "$(date -u +%H:%M) Konflikt ausserhalb der Ledger ($f) — abgebrochen"
        [ -f .git/MERGE_HEAD ] && git merge --abort
        return 1 ;;
    esac
    git add -- "$f"
  done
  [ -f .git/MERGE_HEAD ] && git commit -q --no-edit 2>/dev/null
  return 0
}
marker() { git grep -l -E "^(<<<<<<< |>>>>>>> )" HEAD -- dropship/ 2>/dev/null | head -5; }
