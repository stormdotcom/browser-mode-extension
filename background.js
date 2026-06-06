// StartSmart V2 - Background Service Worker

const GROUP_COLORS = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange", "grey"];

function buildDefaultData() {
  return {
    currentMode: "work",
    modes: {
      work: {
        projects: [
          {
            id: "work-p1",
            name: "General",
            urls: ["https://google.com", "https://jira.com", "https://chatgpt.com"],
            autoOpen: true
          }
        ]
      },
      personal: {
        projects: [
          {
            id: "personal-p1",
            name: "General",
            urls: ["https://youtube.com", "https://chatgpt.com", "https://www.scaler.com/academy/mentee-dashboard/todos"],
            autoOpen: true
          }
        ]
      }
    }
  };
}

// ── V1 migration ──────────────────────────────────────────────────────────────
// Reads old chrome.storage.sync keys (mode, workUrls, personalUrls) and writes
// them into the V2 schema in chrome.storage.local. No-op if already on V2.
function migrateV1IfNeeded() {
  return new Promise((resolve) => {
    chrome.storage.local.get("currentMode", (localData) => {
      if (localData.currentMode !== undefined) { resolve(false); return; }

      chrome.storage.sync.get(["mode", "workUrls", "personalUrls"], (syncData) => {
        const data = buildDefaultData();
        if (syncData.workUrls?.length > 0) data.modes.work.projects[0].urls = syncData.workUrls;
        if (syncData.personalUrls?.length > 0) data.modes.personal.projects[0].urls = syncData.personalUrls;
        if (syncData.mode) data.currentMode = syncData.mode.toLowerCase();
        chrome.storage.local.set(data, () => resolve(true));
      });
    });
  });
}

// ── V2 → V3 migration ─────────────────────────────────────────────────────────
// Converts the old per-mode defaultProjectId field to a per-project autoOpen
// boolean. Also ensures every project has the autoOpen field.
function migrateToAutoOpen() {
  return new Promise((resolve) => {
    chrome.storage.local.get("modes", (data) => {
      if (!data.modes) { resolve(false); return; }

      let changed = false;

      for (const modeData of Object.values(data.modes)) {
        const projects = modeData.projects || [];
        const needsMigration = projects.some((p) => p.autoOpen === undefined);
        if (!needsMigration) continue;

        // Preserve which project was the startup default
        const defaultId = modeData.defaultProjectId || null;
        for (const project of projects) {
          if (project.autoOpen === undefined) {
            project.autoOpen = project.id === defaultId;
            changed = true;
          }
        }
        delete modeData.defaultProjectId;
      }

      if (changed) {
        chrome.storage.local.set({ modes: data.modes }, () => resolve(true));
      } else {
        resolve(false);
      }
    });
  });
}

// ── Context menu ──────────────────────────────────────────────────────────────

async function buildContextMenu() {
  await chrome.contextMenus.removeAll();

  const data = await new Promise((r) => chrome.storage.local.get("modes", r));
  if (!data.modes) return;

  const entries = [];
  for (const [modeName, modeData] of Object.entries(data.modes)) {
    for (const project of modeData.projects || []) {
      entries.push({ modeName, project });
    }
  }
  if (entries.length === 0) return;

  chrome.contextMenus.create({
    id: "startsmart-root",
    title: "Add page to StartSmart",
    contexts: ["page"]
  });

  for (const { modeName, project } of entries) {
    const modeLabel = modeName === "work" ? "Work" : "Personal";
    chrome.contextMenus.create({
      id: `add-to:${modeName}:${project.id}`,
      parentId: "startsmart-root",
      title: `${modeLabel} \u203a ${project.name}`,
      contexts: ["page"]
    });
  }
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (!info.menuItemId.startsWith("add-to:")) return;
  const [, modeName, projectId] = info.menuItemId.split(":");
  const url = info.pageUrl;
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return;

  const data = await new Promise((r) => chrome.storage.local.get("modes", r));
  if (!data.modes?.[modeName]) return;

  const project = data.modes[modeName].projects.find((p) => p.id === projectId);
  if (!project) return;

  if (!project.urls.includes(url)) {
    project.urls.push(url);
    chrome.storage.local.set({ modes: data.modes });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.modes) buildContextMenu();
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    chrome.storage.local.set(buildDefaultData());
  } else if (details.reason === "update") {
    await migrateV1IfNeeded();
    await migrateToAutoOpen();
  }
  buildContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
  await migrateV1IfNeeded();
  await migrateToAutoOpen();
  buildContextMenu();

  const data = await new Promise((r) => chrome.storage.local.get(["currentMode", "modes"], r));
  if (!data.modes) return;

  const modeData = data.modes[data.currentMode || "work"];
  if (!modeData) return;

  // Open every project that has autoOpen: true, each in its own tab group
  const toOpen = (modeData.projects || []).filter((p) => p.autoOpen === true);
  for (let i = 0; i < toOpen.length; i++) {
    // Only the first project may reuse the existing active tab
    await openProjectUrls(toOpen[i], { reuseActiveTab: i === 0 });
  }
});

// Handles manual "Open" from the popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "openProject" && message.project) {
    openProjectUrls(message.project, { reuseActiveTab: true });
  }
});

// ── Tab opening ───────────────────────────────────────────────────────────────

function getProjectColor(projectId) {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) & 0xffff;
  }
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}

async function openProjectUrls(project, { reuseActiveTab = true } = {}) {
  const urls = project.urls.filter((u) => u?.trim());
  if (urls.length === 0) return;

  const tabIds = [];

  try {
    const activeTabs = reuseActiveTab
      ? await chrome.tabs.query({ active: true, currentWindow: true })
      : [];

    for (let i = 0; i < urls.length; i++) {
      let tab;
      if (i === 0 && activeTabs.length > 0) {
        tab = await chrome.tabs.update(activeTabs[0].id, { url: urls[0] });
      } else {
        tab = await chrome.tabs.create({ url: urls[i] });
      }
      if (tab?.id) tabIds.push(tab.id);
    }

    if (tabIds.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: project.name,
        color: getProjectColor(project.id)
      });
    }
  } catch (err) {
    console.warn("StartSmart: tab grouping error:", err);
  }
}
