import { useMemo, useState } from 'react'
import { useNotesInFolder, useNotesStore } from '../store'

export function NoteList() {
  const notes = useNotesInFolder()
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)
  const selectNote = useNotesStore((s) => s.selectNote)
  const createNote = useNotesStore((s) => s.createNote)
  const openNoteMenu = useNotesStore((s) => s.openNoteMenu)

  const [query, setQuery] = useState('')

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q)
    )
  }, [notes, query])

  return (
    <section className="note-list">
      <div className="note-list-header">
        <span>Notas</span>
        <button className="btn-new-note" onClick={createNote}>
          + Nueva
        </button>
      </div>
      <div className="search-box">
        <input
          type="text"
          placeholder="Buscar notas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="note-list-content">
        {filteredNotes.length === 0 && (
          <div className="note-list-empty">No se encontraron notas</div>
        )}
        {filteredNotes.map((note) => (
          <button
            key={note.id}
            className={`note-item ${note.id === selectedNoteId ? 'selected' : ''}`}
            onClick={() => selectNote(note.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              openNoteMenu({ x: e.clientX, y: e.clientY, noteId: note.id })
            }}
          >
            <div className="note-item-title">{note.title}</div>
            <div className="note-item-preview">{note.content}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
