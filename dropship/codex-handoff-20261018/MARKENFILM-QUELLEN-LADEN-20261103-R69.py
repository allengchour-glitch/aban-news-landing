#!/usr/bin/env python3
"""Restore only selected, hash-pinned existing LuxeStyle website images.

No action on import. Explicit CLI examples from this package directory:
  python restore_website_assets.py --film-manifest film/FILM-MANIFEST.json
  python restore_website_assets.py --filenames luxestyle-logo.png
Existing mismatched files are never replaced. HTTP/auth/quota failures remain
errors, not evidence that an asset is absent. This does not grant media rights.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

BASE = Path(__file__).resolve().parent
ALLOWED_HOSTS = {"luxestyle.ch", "www.luxestyle.ch", "cdn.shopify.com"}
MAX_BYTES = 20 * 1024 * 1024


def filename(value):
    if not isinstance(value, str) or not value or value in {".", ".."}:
        raise ValueError("Invalid asset filename")
    if "/" in value or "\\" in value or Path(value).name != value:
        raise ValueError("Asset filename must be a basename")
    return value


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_url(value):
    p = urlsplit(value)
    if (p.scheme != "https" or p.hostname not in ALLOWED_HOSTS
            or p.username or p.password or p.port not in {None, 443}):
        raise ValueError("Only HTTPS public LuxeStyle/Shopify image sources are allowed")
    if p.hostname == "cdn.shopify.com" and not p.path.startswith("/s/files/"):
        raise ValueError("Unexpected Shopify CDN image path")
    if p.hostname != "cdn.shopify.com" and not p.path.startswith("/cdn/shop/"):
        raise ValueError("Unexpected LuxeStyle image path")
    return value


class PublicImageRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def source_index(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    result = {}
    for item in data["assets"]:
        name = filename(Path(item["path"]).name)
        if name in result:
            raise ValueError("Duplicate source filename: " + name)
        sha = item["sha256"]
        if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{64}", sha):
            raise ValueError("Invalid SHA-256: " + name)
        validate_url(item["downloadUrl"])
        result[name] = item
    return result


def selections(args, index):
    pins = {}
    if args.filenames:
        names = args.filenames
    else:
        data = json.loads(args.film_manifest.read_text(encoding="utf-8"))
        if isinstance(data.get("assets"), list):
            names = [item["filename"] for item in data["assets"]]
            pins = {item["filename"]: item["sha256"] for item in data["assets"]}
        elif isinstance(data.get("FILES"), list):
            names = data["FILES"]
        else:
            raise ValueError("Film manifest needs assets:[{filename,sha256}] or FILES:[filename]")
    if not names or len(names) != len(set(names)):
        raise ValueError("Selection must be nonempty and contain no duplicate filenames")
    for name in names:
        filename(name)
        if name not in index:
            raise ValueError("Selected filename absent from source manifest: " + name)
        if name in pins and pins[name] != index[name]["sha256"]:
            raise ValueError("Film/source SHA-256 mismatch: " + name)
    return names


def restore_one(name, item, directory, opener):
    target = directory / name
    expected = item["sha256"]
    if target.is_symlink():
        raise ValueError("Refusing symlink destination: " + name)
    if target.exists():
        if not target.is_file() or digest(target) != expected:
            raise ValueError("Existing file differs; not overwritten: " + name)
        return "reused"
    validate_url(item["downloadUrl"])
    temporary = None
    try:
        request = Request(item["downloadUrl"], headers={"User-Agent": "LuxeStyle-Asset-Restore/1.0"})
        with opener.open(request, timeout=30) as response:
            validate_url(response.geturl())
            if response.status != 200:
                raise ValueError("Unexpected HTTP status: " + str(response.status))
            with tempfile.NamedTemporaryFile(prefix=".restore-", suffix=".part", dir=directory, delete=False) as out:
                temporary = Path(out.name)
                size = 0
                while True:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise ValueError("Asset exceeds 20 MiB download bound")
                    out.write(chunk)
                out.flush()
                os.fsync(out.fileno())
        if digest(temporary) != expected:
            raise ValueError("Downloaded SHA-256 differs; file not installed: " + name)
        # Atomic no-clobber publication after verification. A rename/replace
        # could overwrite a concurrently created destination; a hard link cannot.
        os.link(temporary, target)
        return "restored"
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=BASE / "assets/SOURCES.json")
    parser.add_argument("--output-dir", type=Path, default=BASE / "assets")
    selector = parser.add_mutually_exclusive_group(required=True)
    selector.add_argument("--filenames", nargs="+")
    selector.add_argument("--film-manifest", type=Path)
    args = parser.parse_args(argv)
    try:
        index = source_index(args.sources)
        names = selections(args, index)
        args.output_dir.mkdir(parents=True, exist_ok=True)
        opener = build_opener(PublicImageRedirect())
        for name in names:
            status = restore_one(name, index[name], args.output_dir, opener)
            print(json.dumps({"filename": name, "status": status, "sha256": index[name]["sha256"]}))
        return 0
    except HTTPError as exc:
        print(json.dumps({"status": "error", "httpStatus": exc.code, "meaning": "Remote request failed; asset existence/availability not inferred"}), file=sys.stderr)
    except (ValueError, KeyError, TypeError, OSError, URLError) as exc:
        print(json.dumps({"status": "error", "detail": str(exc)}), file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
