import { ipcMain, dialog, app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promises } from "node:fs";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
function getConfigPath() {
  return path.join(app.getPath("userData"), "tackly-config.json");
}
async function getDataDir() {
  try {
    const raw = await promises.readFile(getConfigPath(), "utf-8");
    const config = JSON.parse(raw);
    if (config.dataPath) return config.dataPath;
  } catch {
  }
  const defaultPath = path.join(app.getPath("userData"), "TacklyData");
  return defaultPath;
}
async function setDataDir(dir) {
  await promises.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await promises.writeFile(getConfigPath(), JSON.stringify({ dataPath: dir }, null, 2), "utf-8");
}
function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "Sin_nombre";
}
function settingsPath(dataDir) {
  return path.join(dataDir, "settings.json");
}
async function loadData() {
  const dataDir = await getDataDir();
  try {
    await promises.mkdir(dataDir, { recursive: true });
  } catch {
    return null;
  }
  let folders = [];
  let noteMetas = [];
  let theme = "dark";
  let noteOrder = [];
  let folderOrder = [];
  try {
    const raw = await promises.readFile(settingsPath(dataDir), "utf-8");
    const s = JSON.parse(raw);
    folders = s.folders || [];
    noteMetas = s.notes || [];
    theme = s.theme || "dark";
    noteOrder = s.noteOrder || [];
    folderOrder = s.folderOrder || [];
  } catch {
  }
  const folderNameToId = {};
  for (const f of folders) folderNameToId[sanitizeName(f.name)] = f.id;
  const notesContent = {};
  async function scanDir(dir) {
    let entries;
    try {
      entries = await promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".txt")) {
        const noteId = entry.name.slice(0, -4);
        try {
          notesContent[noteId] = await promises.readFile(fullPath, "utf-8");
        } catch {
        }
      }
    }
  }
  await scanDir(dataDir);
  const notes = [];
  for (const meta of noteMetas) {
    notes.push({
      id: meta.id,
      title: meta.title || "Sin título",
      content: notesContent[meta.id] || "",
      folderId: meta.folderId ?? null
    });
  }
  if (noteOrder.length > 0) {
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const ordered = [];
    for (const id of noteOrder) {
      if (noteMap.has(id)) {
        ordered.push(noteMap.get(id));
        noteMap.delete(id);
      }
    }
    ordered.push(...noteMap.values());
    notes.length = 0;
    notes.push(...ordered);
  }
  if (folderOrder.length > 0) {
    const folderMap = new Map(folders.map((f) => [f.id, f]));
    const ordered = [];
    for (const id of folderOrder) {
      if (folderMap.has(id)) {
        ordered.push(folderMap.get(id));
        folderMap.delete(id);
      }
    }
    ordered.push(...folderMap.values());
    folders.length = 0;
    folders.push(...ordered);
  }
  return { folders, notes, theme };
}
async function saveData(appData) {
  const dataDir = await getDataDir();
  await promises.mkdir(dataDir, { recursive: true });
  const { folders, notes, theme } = appData;
  let oldFolders = [];
  try {
    const raw = await promises.readFile(settingsPath(dataDir), "utf-8");
    const s = JSON.parse(raw);
    oldFolders = s.folders || [];
  } catch {
  }
  const oldFolderNames = {};
  for (const f of oldFolders) oldFolderNames[f.id] = sanitizeName(f.name);
  const newFolderNames = {};
  for (const f of folders) newFolderNames[f.id] = sanitizeName(f.name);
  for (const f of folders) {
    const oldName = oldFolderNames[f.id];
    const newName = newFolderNames[f.id];
    if (oldName && oldName !== newName) {
      const oldDir = path.join(dataDir, oldName);
      const newDir = path.join(dataDir, newName);
      try {
        await promises.rename(oldDir, newDir);
      } catch {
      }
    }
  }
  const currentIds = new Set(folders.map((f) => f.id));
  for (const f of oldFolders) {
    if (!currentIds.has(f.id)) {
      const dir = path.join(dataDir, oldFolderNames[f.id]);
      try {
        await promises.rm(dir, { recursive: true, force: true });
      } catch {
      }
    }
  }
  for (const f of folders) {
    const dir = path.join(dataDir, newFolderNames[f.id]);
    await promises.mkdir(dir, { recursive: true });
  }
  for (const note of notes) {
    const folder = folders.find((f) => f.id === note.folderId);
    const folderName = folder ? newFolderNames[folder.id] : null;
    const noteDir = folderName ? path.join(dataDir, folderName) : dataDir;
    await promises.mkdir(noteDir, { recursive: true });
    await promises.writeFile(path.join(noteDir, `${note.id}.txt`), note.content || "", "utf-8");
  }
  const activeIds = new Set(notes.map((n) => n.id));
  async function cleanDir(dir) {
    let entries;
    try {
      entries = await promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await cleanDir(fullPath);
        const isCurrentFolder = folders.some((f) => {
          const fn = sanitizeName(f.name);
          return path.join(dataDir, fn) === fullPath;
        });
        if (!isCurrentFolder) {
          try {
            const remaining = await promises.readdir(fullPath);
            if (remaining.length === 0) await promises.rmdir(fullPath);
          } catch {
          }
        }
      } else if (entry.isFile() && entry.name.endsWith(".txt")) {
        const noteId = entry.name.slice(0, -4);
        if (!activeIds.has(noteId)) {
          try {
            await promises.unlink(fullPath);
          } catch {
          }
        }
      }
    }
  }
  await cleanDir(dataDir);
  const noteMetas = notes.map((n) => ({
    id: n.id,
    title: n.title,
    folderId: n.folderId ?? null
  }));
  const noteOrder = notes.map((n) => n.id);
  const folderOrder = folders.map((f) => f.id);
  const settings = {
    theme: theme || "dark",
    folders,
    notes: noteMetas,
    noteOrder,
    folderOrder
  };
  await promises.writeFile(settingsPath(dataDir), JSON.stringify(settings, null, 2), "utf-8");
}
ipcMain.handle("tackly:selectDirectory", async () => {
  const currentDir = await getDataDir();
  const result = await dialog.showOpenDialog({
    defaultPath: currentDir,
    properties: ["openDirectory"],
    title: "Seleccionar carpeta TacklyData"
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selectedPath = result.filePaths[0];
  await setDataDir(selectedPath);
  await promises.mkdir(selectedPath, { recursive: true });
  const sp = settingsPath(selectedPath);
  try {
    await promises.access(sp);
  } catch {
    await promises.writeFile(sp, JSON.stringify({
      theme: "dark",
      folders: [],
      notes: [],
      noteOrder: [],
      folderOrder: []
    }, null, 2), "utf-8");
  }
  return selectedPath;
});
ipcMain.handle("tackly:getDataDir", async () => {
  return await getDataDir();
});
ipcMain.handle("notas:load", async () => {
  return await loadData();
});
ipcMain.handle("notas:save", async (_event, data) => {
  await saveData(data);
});
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1100,
    height: 720,
    minWidth: 760,
    minHeight: 480,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
