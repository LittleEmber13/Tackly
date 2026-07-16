import { useEffect } from 'react'
import { useNotesStore } from '../store'

export function NoteContextMenu() {
  const noteMenu = useNotesStore((s) => s.noteMenu)
  const closeNoteMenu = useNotesStore((s) => s.closeNoteMenu)
  const duplicateNote = useNotesStore((s) => s.duplicateNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const note = useNotesStore((s) => s.notes.find((n) => n.id === s.noteMenu?.noteId) ?? null)

  useEffect(() => {
    if (!noteMenu) return
    window.addEventListener('click', closeNoteMenu)
    window.addEventListener('scroll', closeNoteMenu, true)
    window.addEventListener('resize', closeNoteMenu)
    return () => {
      window.removeEventListener('click', closeNoteMenu)
      window.removeEventListener('scroll', closeNoteMenu, true)
      window.removeEventListener('resize', closeNoteMenu)
    }
  }, [noteMenu, closeNoteMenu])

  if (!noteMenu || !note) return null

  const confirmDelete = () => {
    closeNoteMenu()
    if (window.confirm(`¿Eliminar "${note.title}"?`)) deleteNote(note.id)
  }

  return (
    <div
      className="context-menu"
      style={{ top: noteMenu.y, left: noteMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="context-menu-item" onClick={() => duplicateNote(note.id)}>
        Duplicar
      </button>
      <button className="context-menu-item context-menu-item-danger" onClick={confirmDelete}>
        Eliminar
      </button>
    </div>
  )
}
