#!/usr/bin/env python3
"""
Build script for StartSmart Chrome extension.
Reads the version from manifest.json and creates a distributable zip.

Usage: python build.py
Output: dist/startsmart-v<version>.zip
"""

import json
import os
import zipfile

# Files and folders to include in the package
INCLUDE = [
    "manifest.json",
    "background.js",
    "popup.html",
    "popup.js",
    "style.css",
    "constants.js",
    "images/icon16.png",
    "images/icon48.png",
    "images/icon128.png",
]

DIST_DIR = "dist"


def main():
    # Read version from manifest
    with open("manifest.json", encoding="utf-8") as f:
        manifest = json.load(f)
    version = manifest["version"]

    os.makedirs(DIST_DIR, exist_ok=True)
    out_path = os.path.join(DIST_DIR, f"startsmart-v{version}.zip")

    missing = [p for p in INCLUDE if not os.path.exists(p)]
    if missing:
        print("ERROR: missing files:", missing)
        raise SystemExit(1)

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in INCLUDE:
            zf.write(path)
            print(f"  + {path}")

    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nBuilt: {out_path}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
