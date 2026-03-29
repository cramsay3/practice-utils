#!/usr/bin/env python3
import csv
import json
import re
import zipfile
from pathlib import Path


ROOT = Path("/home/ubuntu/projects/practice-utils")
SBP_PATH = ROOT / "Solo -Long Original (3-1-2026).sbp"
OUT_DIR = ROOT / "sync-catalog" / "google_docs_export"
OUT_CSV = OUT_DIR / "songbook_google_doc_source.csv"


def parse_description(content: str) -> str:
    if not content:
        return ""
    patterns = [
        r"\{meta\s+description:\s*([^}]+)\}",
        r"\{meta:\s*description\s+([^}]+)\}",
        r"\{description:\s*([^}]+)\}",
    ]
    for pattern in patterns:
        m = re.search(pattern, content, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


def parse_sbp(path: Path) -> dict:
    with zipfile.ZipFile(path) as zf:
        payload = zf.read("dataFile.txt").decode("utf-8")
    _, json_payload = payload.split("\r\n", 1)
    return json.loads(json_payload)


def key_to_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data = parse_sbp(SBP_PATH)
    songs = data.get("songs", [])

    rows = []
    for s in songs:
        title = s.get("name", "").strip()
        artist = (s.get("author") or "").strip()
        key = key_to_text(s.get("key"))
        description = parse_description(s.get("content", ""))
        rows.append(
            {
                "Title": title,
                "Artist": artist,
                "Key": key,
                "Description": description,
            }
        )

    rows.sort(key=lambda r: (r["Artist"].lower(), r["Title"].lower()))

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Title", "Artist", "Key", "Description"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUT_CSV}")


if __name__ == "__main__":
    main()
