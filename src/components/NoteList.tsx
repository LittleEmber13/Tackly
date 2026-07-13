import { useMemo, useState } from 'react'

interface NoteListProps {
  notes: Note[]
  selectedId: string | null
  onSelect: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  onCreate: () => void
}

export function NoteList({ notes, selectedId, onSelect, onContextMenu, onCreate }: NoteListProps) {
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
        <button className="btn-new-note" onClick={onCreate}>
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
            className={`note-item ${note.id === selectedId ? 'selected' : ''}`}
            onClick={() => onSelect(note.id)}
            onContextMenu={(e) => onContextMenu(e, note.id)}
          >
            <div className="note-item-title">{note.title}</div>
            <div className="note-item-preview">{note.content}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
