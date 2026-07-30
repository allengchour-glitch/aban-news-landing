"""Schlankes Logging: Konsole + optionales JSONL für spätere Auswertung."""

from __future__ import annotations

import json
import os
import sys
import time
from typing import Any, Optional, TextIO

LEVELS = {"debug": 10, "info": 20, "warn": 30, "error": 40}


class Logger:
    def __init__(
        self,
        level: str = "info",
        jsonl_path: Optional[str] = None,
        stream: Optional[TextIO] = None,
        color: Optional[bool] = None,
    ):
        self.level = LEVELS.get(level, 20)
        self.stream = stream or sys.stdout
        self.color = self.stream.isatty() if color is None else color
        self._fh = None
        if jsonl_path:
            os.makedirs(os.path.dirname(os.path.abspath(jsonl_path)) or ".", exist_ok=True)
            self._fh = open(jsonl_path, "a", encoding="utf-8")

    def _emit(self, level: str, msg: str, **fields: Any) -> None:
        if LEVELS[level] < self.level:
            return
        stamp = time.strftime("%H:%M:%S")
        tint = {"debug": "\033[90m", "info": "", "warn": "\033[33m", "error": "\033[31m"}[level]
        reset = "\033[0m" if tint and self.color else ""
        prefix = tint if self.color else ""
        extra = " ".join(f"{k}={v}" for k, v in fields.items() if k != "event")
        line = f"{prefix}[{stamp}] {msg}{(' ' + extra) if extra else ''}{reset}"
        print(line, file=self.stream, flush=True)
        if self._fh:
            record = {"ts": time.time(), "level": level, "msg": msg}
            record.update(fields)
            self._fh.write(json.dumps(record, ensure_ascii=False) + "\n")
            self._fh.flush()

    def debug(self, msg: str, **f: Any) -> None:
        self._emit("debug", msg, **f)

    def info(self, msg: str, **f: Any) -> None:
        self._emit("info", msg, **f)

    def warn(self, msg: str, **f: Any) -> None:
        self._emit("warn", msg, **f)

    def error(self, msg: str, **f: Any) -> None:
        self._emit("error", msg, **f)

    def datenpunkt(self, **fields: Any) -> None:
        """Nur ins JSONL schreiben, nichts auf die Konsole – fuers Lernen."""
        if not self._fh:
            return
        record = {"ts": time.time()}
        record.update(fields)
        self._fh.write(json.dumps(record, ensure_ascii=False) + "\n")

    def close(self) -> None:
        if self._fh:
            self._fh.close()
            self._fh = None
