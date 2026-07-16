import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { defaultData } from '../defaultData'

export type Theme = 'dark' | 'light'

export interface NoteMenu {
  x: number
  y: number
  noteId: string
}

interface NotesState {
  folders: Folder[]
  notes: Note[]
  theme: Theme
  dataDir: string
  loaded: boolean
  changingDir: boolean
  selectedFolderId: string | null
  selectedNoteId: string | null
  noteMenu: NoteMenu | null

  load: () => Promise<void>
  changeDirectory: () => Promise<void>
  toggleTheme: () => void

  selectFolder: (id: string | null) => void
  createFolder: (name: string) => void
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void

  selectNote: (id: string) => void
  createNote: () => void
  updateNote: (id: string, patch: Partial<Note>) => void
  duplicateNote: (id: string) => void
  deleteNote: (id: string) => void

  openNoteMenu: (menu: NoteMenu) => void
  closeNoteMenu: () => void
}

function storedTheme(): Theme {
  return (localStorage.getItem('notas-theme') as Theme) || 'dark'
}

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector((set, get) => ({
    folders: [],
    notes: [],
    theme: storedTheme(),
    dataDir: '',
    loaded: false,
    changingDir: false,
    selectedFolderId: null,
    selectedNoteId: null,
    noteMenu: null,

    load: async () => {
      const [stored, dir] = await Promise.all([
        window.notasApi.loadData(),
        window.notasApi.getDataDir()
      ])
      const data = stored ?? defaultData()
      set({
        folders: data.folders,
        notes: data.notes,
        theme: data.theme ?? get().theme,
        dataDir: dir,
        selectedNoteId: null,
        selectedFolderId: null,
        loaded: true
      })
    },

    changeDirectory: async () => {
      set({ changingDir: true })
      try {
        const selected = await window.notasApi.selectDirectory()
        if (!selected) return
        set({ dataDir: selected })
        const stored = await window.notasApi.loadData()
        const data = stored ?? defaultData()
        set({
          folders: data.folders,
          notes: data.notes,
          theme: data.theme ?? get().theme,
          selectedNoteId: null,
          selectedFolderId: null
        })
      } finally {
        set({ changingDir: false })
      }
    },

    toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

    selectFolder: (id) => set({ selectedFolderId: id }),

    createFolder: (name) =>
      set((s) => ({ folders: [...s.folders, { id: crypto.randomUUID(), name }] })),

    renameFolder: (id, name) =>
      set((s) => ({
        folders: s.folders.map((folder) => (folder.id === id ? { ...folder, name } : folder))
      })),

    deleteFolder: (id) =>
      set((s) => ({
        folders: s.folders.filter((folder) => folder.id !== id),
        notes: s.notes.map((note) => (note.folderId === id ? { ...note, folderId: null } : note)),
        selectedFolderId: s.selectedFolderId === id ? null : s.selectedFolderId
      })),

    selectNote: (id) => set({ selectedNoteId: id }),

    createNote: () => {
      const note: Note = {
        id: crypto.randomUUID(),
        title: 'Nueva nota',
        content: '',
        folderId: get().selectedFolderId
      }
      set((s) => ({ notes: [note, ...s.notes], selectedNoteId: note.id }))
    },

    updateNote: (id, patch) =>
      set((s) => ({
        notes: s.notes.map((note) => (note.id === id ? { ...note, ...patch } : note))
      })),

    duplicateNote: (id) => {
      const { notes } = get()
      const index = notes.findIndex((note) => note.id === id)
      if (index === -1) return
      const copy: Note = {
        ...notes[index],
        id: crypto.randomUUID(),
        title: `${notes[index].title} (copia)`
      }
      const next = [...notes]
      next.splice(index + 1, 0, copy)
      set({ notes: next, selectedNoteId: copy.id, noteMenu: null })
    },

    deleteNote: (id) =>
      set((s) => ({
        notes: s.notes.filter((note) => note.id !== id),
        selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
        noteMenu: null
      })),

    openNoteMenu: (menu) => set({ noteMenu: menu }),

    closeNoteMenu: () => set({ noteMenu: null })
  }))
)
