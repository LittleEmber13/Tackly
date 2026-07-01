/// <reference types="vite/client" />

interface Folder {
  id: string
  name: string
}

interface Note {
  id: string
  title: string
  content: string
  folderId: string | null
}

interface AppData {
  folders: Folder[]
  notes: Note[]
}

interface Window {
  notasApi: {
    loadData: () => Promise<AppData | null>
    saveData: (data: AppData) => Promise<void>
  }
}
