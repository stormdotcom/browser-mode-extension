// StartSmart V2 - Popup

// --- SVG icon strings used in dynamically rendered project rows ---
const ICON_FOLDER = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="#9CA3AF" stroke-width="1.5" aria-hidden="true"><path d="M2 6a2 2 0 012-2h3.586a1 1 0 01.707.293L9.414 5.414A1 1 0 0010.121 5.707H16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke-linejoin="round"/></svg>`;
const ICON_CHEVRON_DOWN = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CHEVRON_RIGHT = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// --- Mutable popup state ---
const state = {
  currentMode: "work",
  modes: {
    work: { defaultProjectId: null, projects: [] },
    personal: { defaultProjectId: null, projects: [] }
  },
  selectedProjectId: null,
  expandedProjectId: null,  // which project's URL tree is open
  editingProjectId: null    // "__new__" when creating, project id when editing
};

// --- Storage helpers ---
function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
function storageSet(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

function generateId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Init ---
async function init() {
  const data = await storageGet(["currentMode", "modes"]);

  if (data.currentMode) state.currentMode = data.currentMode;
  if (data.modes) state.modes = data.modes;

  // Ensure both mode keys exist (guard against partial storage)
  for (const m of ["work", "personal"]) {
    if (!state.modes[m]) state.modes[m] = { defaultProjectId: null, projects: [] };
  }

  const modeData = state.modes[state.currentMode];
  state.selectedProjectId =
    modeData.defaultProjectId || modeData.projects[0]?.id || null;

  render();
}

// --- Render ---
function render() {
  renderModeToggle();
  renderProjectList();
  renderOpenButton();
}

function renderModeToggle() {
  document.getElementById("workToggle").classList.toggle("active", state.currentMode === "work");
  document.getElementById("personalToggle").classList.toggle("active", state.currentMode === "personal");
}

function renderProjectList() {
  const list = document.getElementById("projectList");
  const modeData = state.modes[state.currentMode];
  list.innerHTML = "";

  if (!modeData.projects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No projects yet. Click + Add to create one.";
    list.appendChild(empty);
    return;
  }

  modeData.projects.forEach((project) => {
    const isDefault = project.id === modeData.defaultProjectId;
    const isSelected = project.id === state.selectedProjectId;
    const isExpanded = project.id === state.expandedProjectId;
    const urls = project.urls.filter((u) => u?.trim());

    const row = document.createElement("div");
    row.className =
      "project-row" +
      (isDefault ? " is-default" : "") +
      (isSelected && !isDefault ? " is-selected" : "") +
      (isExpanded ? " is-expanded" : "");
    row.setAttribute("role", "listitem");

    // ── Row header (clickable bar) ─────────────────────────────
    const header = document.createElement("div");
    header.className = "project-row-header";
    header.innerHTML = `
      <span class="row-chevron">${isExpanded ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT}</span>
      <span class="project-folder">${ICON_FOLDER}</span>
      <span class="project-name">${escapeHtml(project.name)}</span>
      <button class="startup-toggle${isDefault ? " on" : ""}" data-id="${escapeHtml(project.id)}"
        title="${isDefault ? "Opens on startup — click to disable" : "Click to auto-open on browser startup"}"
        aria-pressed="${isDefault}">
        <span class="toggle-knob"></span>
      </button>
      <span class="tab-count" title="${urls.length} URL${urls.length !== 1 ? "s" : ""}">${urls.length}</span>
      <button class="edit-btn" data-id="${escapeHtml(project.id)}">Edit</button>
    `;

    // ── Expandable URL tree ────────────────────────────────────
    const tree = document.createElement("div");
    tree.className = "url-tree" + (isExpanded ? "" : " hidden");

    if (urls.length === 0) {
      tree.innerHTML = `<span class="url-tree-empty">No URLs yet — click Edit to add some.</span>`;
    } else {
      urls.forEach((url, i) => {
        const isLast = i === urls.length - 1;
        const item = document.createElement("div");
        item.className = "url-tree-item";
        item.innerHTML = `
          <span class="url-tree-line${isLast ? " last" : ""}"></span>
          <span class="url-text" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
        `;
        tree.appendChild(item);
      });
    }

    row.appendChild(header);
    row.appendChild(tree);

    // Click header (but not the toggle or edit button) to expand/collapse + select
    header.addEventListener("click", (e) => {
      if (e.target.closest(".startup-toggle") || e.target.closest(".edit-btn")) return;
      state.selectedProjectId = project.id;
      state.expandedProjectId = isExpanded ? null : project.id;
      renderProjectList();
      renderOpenButton();
    });

    // Startup toggle — sets/unsets this project as the auto-open default
    header.querySelector(".startup-toggle").addEventListener("click", async (e) => {
      e.stopPropagation();
      const mde = state.modes[state.currentMode];
      mde.defaultProjectId = mde.defaultProjectId === project.id ? null : project.id;
      await storageSet({ modes: state.modes });
      renderProjectList();
      renderOpenButton();
    });

    header.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openEditPanel(project.id);
    });

    list.appendChild(row);
  });
}

function renderOpenButton() {
  const modeData = state.modes[state.currentMode];
  const project =
    modeData.projects.find((p) => p.id === state.selectedProjectId) ||
    modeData.projects.find((p) => p.id === modeData.defaultProjectId) ||
    modeData.projects[0] ||
    null;

  const btn = document.getElementById("openBtn");
  const label = document.getElementById("openBtnLabel");

  if (project) {
    label.textContent = `Open ${project.name}`;
    btn.disabled = false;
    state.selectedProjectId = project.id;
  } else {
    label.textContent = "No project selected";
    btn.disabled = true;
  }
}

// --- Edit panel ---
function openEditPanel(projectId) {
  const project = state.modes[state.currentMode].projects.find((p) => p.id === projectId);
  if (!project) return;

  state.editingProjectId = projectId;
  document.getElementById("editPanelTitle").textContent = "Edit Project";
  document.getElementById("editName").value = project.name;
  document.getElementById("editUrls").value = project.urls.join("\n");
  document.getElementById("deleteProjectBtn").style.display = "";
  document.getElementById("editPanel").classList.remove("hidden");
  document.getElementById("editName").focus();
}

function openAddPanel() {
  state.editingProjectId = "__new__";
  document.getElementById("editPanelTitle").textContent = "New Project";
  document.getElementById("editName").value = "";
  document.getElementById("editUrls").value = "";
  document.getElementById("deleteProjectBtn").style.display = "none";
  document.getElementById("editPanel").classList.remove("hidden");
  document.getElementById("editName").focus();
}

function closeEditPanel() {
  state.editingProjectId = null;
  document.getElementById("editPanel").classList.add("hidden");
  // Reset bookmark picker so it starts collapsed next time
  document.getElementById("bookmarkPicker").classList.add("hidden");
  document.getElementById("bmToggleBtn").classList.remove("active");
  document.getElementById("bmSearch").value = "";
  document.body.classList.remove("picker-open");
}

async function saveProject() {
  const name = document.getElementById("editName").value.trim();
  if (!name) {
    document.getElementById("editName").focus();
    return;
  }

  const urls = document.getElementById("editUrls").value
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const modeData = state.modes[state.currentMode];

  if (state.editingProjectId === "__new__") {
    const id = generateId();
    modeData.projects.push({ id, name, urls });
    state.selectedProjectId = id;
  } else {
    const project = modeData.projects.find((p) => p.id === state.editingProjectId);
    if (project) {
      project.name = name;
      project.urls = urls;
    }
  }

  await storageSet({ modes: state.modes });
  closeEditPanel();
  render();
}

async function deleteProject() {
  const id = state.editingProjectId;
  if (!id || id === "__new__") return;
  if (!confirm(`Delete "${document.getElementById("editName").value.trim()}"?`)) return;

  const modeData = state.modes[state.currentMode];
  modeData.projects = modeData.projects.filter((p) => p.id !== id);
  if (modeData.defaultProjectId === id) modeData.defaultProjectId = null;
  if (state.selectedProjectId === id) state.selectedProjectId = modeData.projects[0]?.id || null;
  if (state.expandedProjectId === id) state.expandedProjectId = null;

  await storageSet({ modes: state.modes });
  closeEditPanel();
  render();
}

// --- Actions ---
async function switchMode(mode) {
  if (state.currentMode === mode) return;
  state.currentMode = mode;
  state.expandedProjectId = null; // collapse any open tree when switching modes
  const modeData = state.modes[mode];
  state.selectedProjectId =
    modeData.defaultProjectId || modeData.projects[0]?.id || null;
  await storageSet({ currentMode: mode });
  render();
}

function openProject() {
  const modeData = state.modes[state.currentMode];
  const project = modeData.projects.find((p) => p.id === state.selectedProjectId);
  if (!project) return;

  // Delegate to the background service worker so it completes even after popup closes
  chrome.runtime.sendMessage({ action: "openProject", project });
  window.close();
}

// --- Bookmark picker ---

let cachedBookmarks = []; // flat list, populated lazily on first open

function flattenBookmarks(nodes, result = []) {
  for (const node of nodes) {
    if (node.url) result.push({ title: node.title || node.url, url: node.url });
    if (node.children) flattenBookmarks(node.children, result);
  }
  return result;
}

async function toggleBookmarkPicker() {
  const picker = document.getElementById("bookmarkPicker");
  const btn = document.getElementById("bmToggleBtn");

  if (!picker.classList.contains("hidden")) {
    picker.classList.add("hidden");
    btn.classList.remove("active");
    document.body.classList.remove("picker-open");
    return;
  }

  // Fetch once and cache for the lifetime of this popup
  if (cachedBookmarks.length === 0) {
    const tree = await new Promise((r) => chrome.bookmarks.getTree(r));
    cachedBookmarks = flattenBookmarks(tree);
  }

  renderBookmarkList(cachedBookmarks);
  picker.classList.remove("hidden");
  btn.classList.add("active");
  document.body.classList.add("picker-open");
  document.getElementById("bmSearch").focus();
}

function renderBookmarkList(bookmarks) {
  const list = document.getElementById("bmList");
  list.innerHTML = "";

  // Cap at 200 items to keep the popup responsive
  const items = bookmarks.slice(0, 200);

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "bm-empty";
    empty.textContent = "No bookmarks found.";
    list.appendChild(empty);
    return;
  }

  items.forEach((bm) => {
    const btn = document.createElement("button");
    btn.className = "bm-item";
    btn.type = "button";
    btn.title = bm.url;
    btn.innerHTML = `<span class="bm-title">${escapeHtml(bm.title)}</span><span class="bm-url">${escapeHtml(bm.url)}</span>`;
    btn.addEventListener("click", () => appendUrlToTextarea(bm.url));
    list.appendChild(btn);
  });
}

function appendUrlToTextarea(url) {
  const ta = document.getElementById("editUrls");
  const current = ta.value.trimEnd();
  ta.value = current ? current + "\n" + url : url;
}

// --- Wire up static event listeners ---
document.getElementById("bmToggleBtn").addEventListener("click", toggleBookmarkPicker);
document.getElementById("bmSearch").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = q
    ? cachedBookmarks.filter(
        (bm) => bm.title.toLowerCase().includes(q) || bm.url.toLowerCase().includes(q)
      )
    : cachedBookmarks;
  renderBookmarkList(filtered);
});

document.getElementById("workToggle").addEventListener("click", () => switchMode("work"));
document.getElementById("personalToggle").addEventListener("click", () => switchMode("personal"));
document.getElementById("addProjectBtn").addEventListener("click", openAddPanel);
document.getElementById("openBtn").addEventListener("click", openProject);
document.getElementById("closeEditBtn").addEventListener("click", closeEditPanel);
document.getElementById("saveProjectBtn").addEventListener("click", saveProject);
document.getElementById("deleteProjectBtn").addEventListener("click", deleteProject);

// Save on Ctrl+Enter / Cmd+Enter inside the edit panel
document.getElementById("editPanel").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") saveProject();
  if (e.key === "Escape") closeEditPanel();
});

// --- Boot ---
init();
