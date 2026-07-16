import { useMemo } from 'react'
import { useNotesStore } from './notesStore'

export function useNotesInFolder() {
  const notes = useNotesStore((s) => s.notes)
  const selectedFolderId = useNotesStore((s) => s.selectedFolderId)
  return useMemo(
    () =>
      selectedFolderId === null
        ? notes
        : notes.filter((note) => note.folderId === selectedFolderId),
    [notes, selectedFolderId]
  )
}

export function useSelectedNote() {
  return useNotesStore((s) => s.notes.find((note) => note.id === s.selectedNoteId) ?? null)
}

export function useFolder(id: string | null) {
  return useNotesStore((s) => s.folders.find((folder) => folder.id === id) ?? null)
}
