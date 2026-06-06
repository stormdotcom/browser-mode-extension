### StartSmart — Startup URL Manager for Chrome

**Version 2.0.0** · Manifest V3 · No build step required

StartSmart opens your URLs automatically when Chrome starts, organised into projects. Switch between Work and Personal modes, toggle auto-open per project, and group tabs automatically.

---

### Features

- **Work / Personal modes** — separate project lists per mode; switching takes effect immediately.
- **Projects** — each mode holds multiple projects, each with its own URL list.
- **Auto-open on startup** — each project has an independent toggle. Any project with the toggle on will open automatically when Chrome starts, each in its own named tab group.
- **Tab groups** — opened URLs are grouped using Chrome's tab group API, labelled with the project name and a stable colour.
- **Manual open** — click a project row to select it, then press "Open [name]" to open it on demand.
- **Add from bookmarks** — in the edit panel, browse and search your bookmarks to append URLs without typing.
- **Right-click to add** — right-click any page → "Add page to StartSmart" → choose a project. Adds the full page URL (not just the domain).
- **Expandable URL tree** — click a project row to expand a scrollable list of its URLs inline.

---

### Building a Package

To create a distributable `.zip` for the Chrome Web Store or local distribution, run the included Python build script. No external dependencies — only the Python standard library is required.

**Prerequisites:** Python 3.6 or later

**Run the build:**

```bash
python build.py
```

**Output:** `dist/startsmart-v<version>.zip`

The version is read automatically from `manifest.json`. The zip contains only the files Chrome needs:

```
manifest.json
background.js
popup.html
popup.js
style.css
constants.js
images/icon16.png
images/icon48.png
images/icon128.png
```

Development files (`build.py`, `readMe.md`, `CLAUDE.md`, `.gitignore`, `.vscode/`) are excluded.

**To publish to the Chrome Web Store:**
1. Run `python build.py`
2. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the generated zip from the `dist/` folder

---

### Loading for Development

No build step needed. Load the extension directly:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this directory

After editing any file, click the reload icon on the extension card.

---

### Data Storage

All data is stored locally in `chrome.storage.local`. Nothing is sent to any server.

Each project is stored as:
```json
{ "id": "p-...", "name": "General", "urls": ["https://..."], "autoOpen": true }
```

`autoOpen: true` means the project opens automatically on browser startup. Multiple projects can have this enabled simultaneously.

---

### Privacy Policy

StartSmart does not collect any personal information or data. The extension operates solely on local browser storage. No browsing activity, URLs, or preferences are transmitted anywhere.

---

*Created by [Ajmal Nasumudeen](https://ajmalnasumudeen.in/)*
