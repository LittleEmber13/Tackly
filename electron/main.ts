import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { promises as fs } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST


function getConfigPath() {
  return path.join(app.getPath('userData'), 'tackly-config.json')
}

async function getDataDir(): Promise<string> {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf-8')
    const config = JSON.parse(raw)
    if (config.dataPath) return config.dataPath
  } catch {}
  const defaultPath = path.join(app.getPath('userData'), 'TacklyData')
  return defaultPath
}

async function setDataDir(dir: string) {
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true })
  await fs.writeFile(getConfigPath(), JSON.stringify({ dataPath: dir }, null, 2), 'utf-8')
}


function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Sin_nombre'
}

function settingsPath(dataDir: string) {
  return path.join(dataDir, 'settings.json')
}


async function loadData(): Promise<{ folders: any[]; notes: any[]; theme: string } | null> {
  const dataDir = await getDataDir()

  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch {
    return null
  }

  let folders: any[] = []
  let noteMetas: any[] = []
  let theme = 'dark'
  let noteOrder: string[] = []
  let folderOrder: string[] = []

  try {
    const raw = await fs.readFile(settingsPath(dataDir), 'utf-8')
    const s = JSON.parse(raw)
    folders = s.folders || []
    noteMetas = s.notes || []
    theme = s.theme || 'dark'
    noteOrder = s.noteOrder || []
    folderOrder = s.folderOrder || []
  } catch {}

  const folderNameToId: Record<string, string> = {}
  for (const f of folders) folderNameToId[sanitizeName(f.name)] = f.id

  const notesContent: Record<string, string> = {}

  async function scanDir(dir: string) {
    let entries: any[]
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await scanDir(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        const noteId = entry.name.slice(0, -4)
        try {
          notesContent[noteId] = await fs.readFile(fullPath, 'utf-8')
        } catch {}
      }
    }
  }

  await scanDir(dataDir)

  const notes: any[] = []
  for (const meta of noteMetas) {
    notes.push({
      id: meta.id,
      title: meta.title || 'Sin título',
      content: notesContent[meta.id] || '',
      folderId: meta.folderId ?? null
    })
  }

  if (noteOrder.length > 0) {
    const noteMap = new Map(notes.map((n: any) => [n.id, n]))
    const ordered: any[] = []
    for (const id of noteOrder) {
      if (noteMap.has(id)) { ordered.push(noteMap.get(id)!); noteMap.delete(id) }
    }
    ordered.push(...noteMap.values())
    notes.length = 0; notes.push(...ordered)
  }

  if (folderOrder.length > 0) {
    const folderMap = new Map(folders.map((f: any) => [f.id, f]))
    const ordered: any[] = []
    for (const id of folderOrder) {
      if (folderMap.has(id)) { ordered.push(folderMap.get(id)!); folderMap.delete(id) }
    }
    ordered.push(...folderMap.values())
    folders.length = 0; folders.push(...ordered)
  }

  return { folders, notes, theme }
}


async function saveData(appData: { folders: any[]; notes: any[]; theme?: string }) {
  const dataDir = await getDataDir()
  await fs.mkdir(dataDir, { recursive: true })

  const { folders, notes, theme } = appData

  let oldFolders: any[] = []
  try {
    const raw = await fs.readFile(settingsPath(dataDir), 'utf-8')
    const s = JSON.parse(raw)
    oldFolders = s.folders || []
  } catch {}

  const oldFolderNames: Record<string, string> = {}
  for (const f of oldFolders) oldFolderNames[f.id] = sanitizeName(f.name)

  const newFolderNames: Record<string, string> = {}
  for (const f of folders) newFolderNames[f.id] = sanitizeName(f.name)

  for (const f of folders) {
    const oldName = oldFolderNames[f.id]
    const newName = newFolderNames[f.id]
    if (oldName && oldName !== newName) {
      const oldDir = path.join(dataDir, oldName)
      const newDir = path.join(dataDir, newName)
      try {
        await fs.rename(oldDir, newDir)
      } catch {}
    }
  }

  const currentIds = new Set(folders.map((f: any) => f.id))
  for (const f of oldFolders) {
    if (!currentIds.has(f.id)) {
      const dir = path.join(dataDir, oldFolderNames[f.id])
      try {
        await fs.rm(dir, { recursive: true, force: true })
      } catch {}
    }
  }

  for (const f of folders) {
    const dir = path.join(dataDir, newFolderNames[f.id])
    await fs.mkdir(dir, { recursive: true })
  }

  for (const note of notes) {
    const folder = folders.find((f: any) => f.id === note.folderId)
    const folderName = folder ? newFolderNames[folder.id] : null
    const noteDir = folderName ? path.join(dataDir, folderName) : dataDir
    await fs.mkdir(noteDir, { recursive: true })
    await fs.writeFile(path.join(noteDir, `${note.id}.txt`), note.content || '', 'utf-8')
  }

  const activeIds = new Set(notes.map((n: any) => n.id))
  async function cleanDir(dir: string) {
    let entries: any[]
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await cleanDir(fullPath)
        const isCurrentFolder = folders.some((f: any) => {
          const fn = sanitizeName(f.name)
          return path.join(dataDir, fn) === fullPath
        })
        if (!isCurrentFolder) {
          try {
            const remaining = await fs.readdir(fullPath)
            if (remaining.length === 0) await fs.rmdir(fullPath)
          } catch {}
        }
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        const noteId = entry.name.slice(0, -4)
        if (!activeIds.has(noteId)) {
          try { await fs.unlink(fullPath) } catch {}
        }
      }
    }
  }
  await cleanDir(dataDir)

  const noteMetas = notes.map((n: any) => ({
    id: n.id, title: n.title, folderId: n.folderId ?? null
  }))

  const noteOrder = notes.map((n: any) => n.id)
  const folderOrder = folders.map((f: any) => f.id)

  const settings = {
    theme: theme || 'dark',
    folders,
    notes: noteMetas,
    noteOrder,
    folderOrder
  }

  await fs.writeFile(settingsPath(dataDir), JSON.stringify(settings, null, 2), 'utf-8')
}

ipcMain.handle('tackly:selectDirectory', async () => {
  const currentDir = await getDataDir()
  const result = await dialog.showOpenDialog({
    defaultPath: currentDir,
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta TacklyData'
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const selectedPath = result.filePaths[0]
  await setDataDir(selectedPath)

  await fs.mkdir(selectedPath, { recursive: true })
  const sp = settingsPath(selectedPath)
  try {
    await fs.access(sp)
  } catch {
    await fs.writeFile(sp, JSON.stringify({
      theme: 'dark', folders: [], notes: [], noteOrder: [], folderOrder: []
    }, null, 2), 'utf-8')
  }

  return selectedPath
})

ipcMain.handle('tackly:getDataDir', async () => {
  return await getDataDir()
})

ipcMain.handle('notas:load', async () => {
  return await loadData()
})

ipcMain.handle('notas:save', async (_event, data) => {
  await saveData(data)
})

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1100,
    height: 720,
    minWidth: 760,
    minHeight: 480,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
