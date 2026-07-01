import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'

function defaultData(): AppData {
  return {
    folders: [],
    notes: [
      {
        id: crypto.randomUUID(),
        title: 'Bienvenido a Notas',
        content: 'Tus notas se guardan automáticamente en disco.\n\nSoporta **markdown**.',
        folderId: null
      }
    ]
  }
}

export default function App() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('notas-theme') as 'dark' | 'light') || 'dark'
  )
  const [newFolderName, setNewFolderName] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingName, setRenamingName] = useState('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('notas-theme', theme)
  }, [theme])

  useEffect(() => {
    window.notasApi.loadData().then((stored) => {
      const data = stored ?? defaultData()
      setFolders(data.folders)
      setNotes(data.notes)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    clearTimeout(saveTimeout.current ?? undefined)
    saveTimeout.current = setTimeout(() => {
      window.notasApi.saveData({ folders, notes })
    }, 400)
    return () => clearTimeout(saveTimeout.current ?? undefined)
  }, [folders, notes, loaded])

  const notesInFolder = useMemo(
    () =>
      selectedFolderId === null
        ? notes
        : notes.filter((note) => note.folderId === selectedFolderId),
    [notes, selectedFolderId]
  )

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notesInFolder
    return notesInFolder.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
    )
  }, [notesInFolder, query])

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null

  const previewHtml = useMemo(
    () => (selectedNote ? marked.parse(selectedNote.content) as string : ''),
    [selectedNote]
  )

  function updateSelectedNote(field: string, value: string) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === selectedId ? { ...note, [field]: value } : note
      )
    )
  }

  function selectNote(id: string) {
    setSelectedId(id)
    setIsPreview(false)
  }

  function createNote() {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Nueva nota',
      content: '',
      folderId: selectedFolderId
    }
    setNotes((prev) => [newNote, ...prev])
    setSelectedId(newNote.id)
    setIsPreview(false)
  }

  function deleteSelectedNote() {
    if (!selectedNote) return
    const confirmed = window.confirm(`¿Eliminar "${selectedNote.title}"?`)
    if (!confirmed) return
    setNotes((prev) => prev.filter((note) => note.id !== selectedId))
    setSelectedId(null)
  }

  function createFolder() {
    setNewFolderName('')
  }

  function commitNewFolder() {
    if (newFolderName && newFolderName.trim()) {
      setFolders((prev) => [...prev, { id: crypto.randomUUID(), name: newFolderName.trim() }])
    }
    setNewFolderName(null)
  }

  function startRenameFolder(folder: Folder) {
    setRenamingFolderId(folder.id)
    setRenamingName(folder.name)
  }

  function commitRenameFolder() {
    if (renamingName.trim()) {
      setFolders((prev) =>
        prev.map((f) => (f.id === renamingFolderId ? { ...f, name: renamingName.trim() } : f))
      )
    }
    setRenamingFolderId(null)
  }

  function deleteFolder(folder: Folder) {
    const confirmed = window.confirm(
      `¿Eliminar la carpeta "${folder.name}"? Las notas pasarán a "Todas las notas".`
    )
    if (!confirmed) return
    setFolders((prev) => prev.filter((f) => f.id !== folder.id))
    setNotes((prev) =>
      prev.map((note) =>
        note.folderId === folder.id ? { ...note, folderId: null } : note
      )
    )
    if (selectedFolderId === folder.id) setSelectedFolderId(null)
  }

  if (!loaded) {
    return <div className="editor-empty">Cargando notas...</div>
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span>Carpetas</span>
          <div className="sidebar-header-actions">
            <button
              className="btn-theme-toggle"
              title="Cambiar tema"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn-new-note" onClick={createFolder}>
              + Carpeta
            </button>
          </div>
        </div>
        <div className="sidebar-content">
          <button
            className={`folder-item ${selectedFolderId === null ? 'selected' : ''}`}
            onClick={() => setSelectedFolderId(null)}
          >
            Todas las notas
          </button>
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''}`}
              onClick={() => setSelectedFolderId(folder.id)}
            >
              {renamingFolderId === folder.id ? (
                <input
                  className="folder-inline-input"
                  autoFocus
                  value={renamingName}
                  onChange={(e) => setRenamingName(e.target.value)}
                  onBlur={commitRenameFolder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRenameFolder()
                    if (e.key === 'Escape') setRenamingFolderId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="folder-item-name">{folder.name}</span>
                  <span className="folder-item-actions">
                    <button
                      title="Renombrar"
                      onClick={(e) => { e.stopPropagation(); startRenameFolder(folder) }}
                    >
                      ✎
                    </button>
                    <button
                      title="Eliminar"
                      onClick={(e) => { e.stopPropagation(); deleteFolder(folder) }}
                    >
                      ×
                    </button>
                  </span>
                </>
              )}
            </div>
          ))}
          {newFolderName !== null && (
            <div className="folder-item">
              <input
                className="folder-inline-input"
                autoFocus
                placeholder="Nombre de la carpeta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={commitNewFolder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNewFolder()
                  if (e.key === 'Escape') setNewFolderName(null)
                }}
              />
            </div>
          )}
        </div>
      </aside>

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
              className={`note-item ${note.id === selectedId ? 'selected' : ''}`}
              onClick={() => selectNote(note.id)}
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
              <button
                className="btn-delete-note"
                onClick={() => setIsPreview((v) => !v)}
              >
                {isPreview ? 'Editar' : 'Vista previa'}
              </button>
              <button className="btn-delete-note" onClick={deleteSelectedNote}>
                Eliminar
              </button>
            </div>
            {isPreview ? (
              <div
                className="editor-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <textarea
                className="editor-content"
                value={selectedNote.content}
                onChange={(e) => updateSelectedNote('content', e.target.value)}
                placeholder="Escribe aquí... (admite markdown)"
              />
            )}
          </>
        ) : (
          <div className="editor-empty">Selecciona o crea una nota</div>
        )}
      </main>
    </div>
  )
}
