import { useState } from 'react'
import { mockNotes } from './mockNotes'

export default function App() {
  const [notes, setNotes] = useState(mockNotes)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null

  function updateSelectedNote(field: string, value: string) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === selectedId ? { ...note, [field]: value } : note
      )
    )
  }

  function createNote() {
    const newNote = {
      id: crypto.randomUUID(),
      title: 'Nueva nota',
      content: ''
    }
    setNotes((prev) => [newNote, ...prev])
    setSelectedId(newNote.id)
  }

  function deleteSelectedNote() {
    if (!selectedNote) return
    const confirmed = window.confirm(`¿Eliminar "${selectedNote.title}"?`)
    if (!confirmed) return
    setNotes((prev) => prev.filter((note) => note.id !== selectedId))
    setSelectedId(null)
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">Carpetas</div>
        <div className="sidebar-content" />
      </aside>

      <section className="note-list">
        <div className="note-list-header">
          <span>Notas</span>
          <button className="btn-new-note" onClick={createNote}>
            + Nueva
          </button>
        </div>
        <div className="note-list-content">
          {notes.map((note) => (
            <button
              key={note.id}
              className={`note-item ${note.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelectedId(note.id)}
            >
              <div className="note-item-title">{note.title}</div>
              <div className="note-item-preview">{note.content}</div>
            </button>
          ))}
        </div>
      </section>

      <main className="editor">
        {selectedNote ? (
          <>
            <div className="editor-toolbar">
              <input
                className="editor-title"
                value={selectedNote.title}
                onChange={(e) => updateSelectedNote('title', e.target.value)}
                placeholder="Título"
              />
              <button className="btn-delete-note" onClick={deleteSelectedNote}>
                Eliminar
              </button>
            </div>
            <textarea
              className="editor-content"
              value={selectedNote.content}
              onChange={(e) => updateSelectedNote('content', e.target.value)}
              placeholder="Escribe aquí..."
            />
          </>
        ) : (
          <div className="editor-empty">Selecciona o crea una nota</div>
        )}
      </main>
    </div>
  )
}
