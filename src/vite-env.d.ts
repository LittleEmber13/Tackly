/// <reference types="vite/client" />

interface Window {
  notasApi: {
    loadNotes: () => Promise<Note[]>
    saveNotes: (notes: Note[]) => Promise<void>
  }
}

interface Note {
  id: string
  title: string
  content: string
}
