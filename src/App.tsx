import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { marked, Renderer } from 'marked'
import {
  autoConvertTaskLines,
  contentToEditorHtml,
  handleBackspace,
  handleEnter,
  insertTaskLine,
  serializeEditor,
  taskLineRegex
} from './hybridChecklistEditor'

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
    ],
    theme: 'dark'
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
  const [noteMenu, setNoteMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [dataDir, setDataDir] = useState('')
  const [changingDir, setChangingDir] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const taskCounter = useRef(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('notas-theme', theme)
  }, [theme])

  useEffect(() => {
    window.notasApi.loadData().then((stored) => {
      const data = stored ?? defaultData()
      setFolders(data.folders)
      setNotes(data.notes)
      if (data.theme) setTheme(data.theme)
      setLoaded(true)
    })
    window.notasApi.getDataDir().then((dir) => setDataDir(dir))
  }, [])

  useEffect(() => {
    if (!loaded) return
    clearTimeout(saveTimeout.current ?? undefined)
    saveTimeout.current = setTimeout(() => {
      window.notasApi.saveData({ folders, notes, theme })
    }, 400)
    return () => clearTimeout(saveTimeout.current ?? undefined)
  }, [folders, notes, theme, loaded])

  useEffect(() => {
    if (!noteMenu) return
    const close = () => setNoteMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [noteMenu])

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

  const taskRenderer = useMemo(() => {
    const renderer = new Renderer()
    renderer.checkbox = ({ checked }) =>
      `<input type="checkbox" class="task-checkbox" data-task-index="${taskCounter.current++}"${checked ? ' checked' : ''} />`
    return renderer
  }, [])

  const previewHtml = useMemo(() => {
    if (!selectedNote) return ''
    taskCounter.current = 0
    return marked.parse(selectedNote.content, { renderer: taskRenderer }) as string
  }, [selectedNote, taskRenderer])

  useEffect(() => {
    if (isPreview || !editorRef.current || !selectedNote) return
    editorRef.current.innerHTML = contentToEditorHtml(selectedNote.content)
  }, [selectedId, isPreview])

  function updateSelectedNote(field: string, value: string) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === selectedId ? { ...note, [field]: value } : note
      )
    )
  }

  function toggleTaskCheckbox(index: number) {
    if (!selectedNote) return
    let count = -1
    const newContent = selectedNote.content
      .split('\n')
      .map((line) => {
        const match = line.match(taskLineRegex)
        if (!match) return line
        count++
        if (count !== index) return line
        const toggled = match[2] === ' ' ? 'x' : ' '
        return `${match[1]}${toggled}${match[3]}`
      })
      .join('\n')
    updateSelectedNote('content', newContent)
  }

  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      const index = target.dataset.taskIndex
      if (index !== undefined) toggleTaskCheckbox(Number(index))
    }
  }

  function syncEditorContent() {
    if (!editorRef.current) return
    updateSelectedNote('content', serializeEditor(editorRef.current))
  }

  function handleEditorInput() {
    if (!editorRef.current) return
    autoConvertTaskLines(editorRef.current)
    syncEditorContent()
  }

  function handleEditorClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      requestAnimationFrame(syncEditorContent)
    }
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!editorRef.current) return
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEnter(editorRef.current)
      syncEditorContent()
    } else if (e.key === 'Backspace') {
      if (handleBackspace(editorRef.current)) {
        e.preventDefault()
        syncEditorContent()
      }
    }
  }

  function insertTaskItem() {
    if (!editorRef.current) return
    insertTaskLine(editorRef.current)
    syncEditorContent()
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

  function openNoteMenu(e: React.MouseEvent, noteId: string) {
    e.preventDefault()
    setNoteMenu({ x: e.clientX, y: e.clientY, noteId })
  }

  function duplicateNote(id: string) {
    setNoteMenu(null)
    const original = notes.find((note) => note.id === id)
    if (!original) return
    const copy: Note = {
      ...original,
      id: crypto.randomUUID(),
      title: `${original.title} (copia)`
    }
    setNotes((prev) => {
      const index = prev.findIndex((note) => note.id === id)
      const next = [...prev]
      next.splice(index + 1, 0, copy)
      return next
    })
    setSelectedId(copy.id)
    setIsPreview(false)
  }

  function deleteNote(id: string) {
    setNoteMenu(null)
    const note = notes.find((n) => n.id === id)
    if (!note) return
    const confirmed = window.confirm(`¿Eliminar "${note.title}"?`)
    if (!confirmed) return
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedId === id) setSelectedId(null)
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

  const handleChangeDirectory = useCallback(async () => {
    setChangingDir(true)
    try {
      const selected = await window.notasApi.selectDirectory()
      if (selected) {
        setDataDir(selected)
        const stored = await window.notasApi.loadData()
        const data = stored ?? defaultData()
        setFolders(data.folders)
        setNotes(data.notes)
        if (data.theme) setTheme(data.theme)
        setSelectedId(null)
        setSelectedFolderId(null)
      }
    } finally {
      setChangingDir(false)
    }
  }, [])

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
        <div className="sidebar-footer">
          <button
            className="btn-data-dir"
            onClick={handleChangeDirectory}
            disabled={changingDir}
            title={dataDir || 'Seleccionar carpeta de datos'}
          >
            {changingDir ? '...' : '📂 Cambiar carpeta'}
          </button>
          {dataDir && <div className="data-dir-path">{dataDir}</div>}
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
              onContextMenu={(e) => openNoteMenu(e, note.id)}
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
              {!isPreview && (
                <button
                  className="btn-new-note"
                  onClick={insertTaskItem}
                  title="Insertar lista de tareas"
                >
                  ☑ Tarea
                </button>
              )}
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
                onClick={handlePreviewClick}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div
                ref={editorRef}
                className="editor-content editor-content-hybrid"
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onClick={handleEditorClick}
                onKeyDown={handleEditorKeyDown}
              />
            )}
          </>
        ) : (
          <div className="editor-empty">Selecciona o crea una nota</div>
        )}
      </main>

      {noteMenu && (
        <div
          className="context-menu"
          style={{ top: noteMenu.y, left: noteMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-item" onClick={() => duplicateNote(noteMenu.noteId)}>
            Duplicar
          </button>
          <button
            className="context-menu-item context-menu-item-danger"
            onClick={() => deleteNote(noteMenu.noteId)}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
