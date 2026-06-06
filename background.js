// StartSmart V2 - Background Service Worker

const GROUP_COLORS = ["blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange", "grey"];

function buildDefaultData() {
  return {
    currentMode: "work",
    modes: {
      work: {
        defaultProjectId: "work-p1",
        projects: [
          {
            id: "work-p1",
            name: "General",
            urls: ["https://google.com", "https://jira.com", "https://chatgpt.com"]
          }
        ]
      },
      personal: {
        defaultProjectId: "personal-p1",
        projects: [
          {
            id: "personal-p1",
            name: "General",
            urls: ["https://youtube.com", "https://chatgpt.com", "https://www.scaler.com/academy/mentee-dashboard/todos"]
          }
        ]
      }
    }
  };
}

// Reads V1 data from chrome.storage.sync (mode, workUrls, personalUrls) and
// writes it as a V2 schema to chrome.storage.local. No-op if V2 is already present.
function migrateIfNeeded() {
  return new Promise((resolve) => {
    chrome.storage.local.get("currentMode", (localData) => {
      if (localData.currentMode !== undefined) {
        resolve(false);
        return;
      }

      chrome.storage.sync.get(["mode", "workUrls", "personalUrls"], (syncData) => {
        const data = buildDefaultData();

        if (syncData.workUrls && syncData.workUrls.length > 0) {
          data.modes.work.projects[0].urls = syncData.workUrls;
        }
        if (syncData.personalUrls && syncData.personalUrls.length > 0) {
          data.modes.personal.projects[0].urls = syncData.personalUrls;
        }
        if (syncData.mode) {
          data.currentMode = syncData.mode.toLowerCase();
        }

        chrome.storage.local.set(data, () => resolve(true));
      });
    });
  });
}

// ── Context menu ──────────────────────────────────────────────────────────────

// Rebuilds the right-click "Add page to StartSmart" submenu from current projects.
// Called on install, startup, and whenever storage changes.
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
    // ID encodes mode and project so we can look them up on click without extra storage reads
    chrome.contextMenus.create({
      id: `add-to:${modeName}:${project.id}`,
      parentId: "startsmart-root",
      title: `${modeLabel} \u203a ${project.name}`,
      contexts: ["page"]
    });
  }
}

// Appends the right-clicked page's full URL to the chosen project
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (!info.menuItemId.startsWith("add-to:")) return;

  // ID format: "add-to:{modeName}:{projectId}"
  // projectId uses only "-" so splitting on ":" is unambiguous
  const [, modeName, projectId] = info.menuItemId.split(":");
  const url = info.pageUrl;

  // Skip internal Chrome pages
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return;

  const data = await new Promise((r) => chrome.storage.local.get("modes", r));
  if (!data.modes?.[modeName]) return;

  const project = data.modes[modeName].projects.find((p) => p.id === projectId);
  if (!project) return;

  // Avoid duplicate entries
  if (!project.urls.includes(url)) {
    project.urls.push(url);
    chrome.storage.local.set({ modes: data.modes });
  }
});

// Rebuild the context menu whenever projects are added, renamed, or deleted
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.modes) {
    buildContextMenu();
  }
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    chrome.storage.local.set(buildDefaultData());
  } else if (details.reason === "update") {
    await migrateIfNeeded();
  }
  buildContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
  await migrateIfNeeded();
  buildContextMenu();

  chrome.storage.local.get(["currentMode", "modes"], (data) => {
    if (!data.modes) return;

    const mode = data.currentMode || "work";
    const modeData = data.modes[mode];
    if (!modeData || !modeData.defaultProjectId) return;

    const project = modeData.projects.find((p) => p.id === modeData.defaultProjectId);
    if (project && project.urls && project.urls.length > 0) {
      openProjectUrls(project);
    }
  });
});

// Handles "Open" button clicks from the popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "openProject" && message.project) {
    openProjectUrls(message.project);
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

async function openProjectUrls(project) {
  const urls = project.urls.filter((u) => u && u.trim());
  if (urls.length === 0) return;

  const tabIds = [];

  try {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });

    for (let i = 0; i < urls.length; i++) {
      let tab;
      if (i === 0 && activeTabs.length > 0) {
        tab = await chrome.tabs.update(activeTabs[0].id, { url: urls[0] });
      } else {
        tab = await chrome.tabs.create({ url: urls[i] });
      }
      if (tab && tab.id) tabIds.push(tab.id);
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
