import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotasStore } from './hooks/useNotasStore'
import { defaultData } from './defaultData'
import { Sidebar } from './components/Sidebar'
import { NoteList } from './components/NoteList'
import { Editor } from './components/Editor'
import { NoteContextMenu } from './components/NoteContextMenu'

export default function App() {
  const {
    folders,
    setFolders,
    notes,
    setNotes,
    theme,
    setTheme,
    dataDir,
    setDataDir,
    loaded
  } = useNotasStore()

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteMenu, setNoteMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [changingDir, setChangingDir] = useState(false)

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

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null

  function updateNote(id: string, patch: Partial<Note>) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, ...patch } : note)))
  }

  function selectNote(id: string) {
    setSelectedId(id)
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
  }

  function deleteSelectedNote() {
    if (!selectedNote) return
    if (!window.confirm(`¿Eliminar "${selectedNote.title}"?`)) return
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
  }

  function deleteNote(id: string) {
    setNoteMenu(null)
    const note = notes.find((n) => n.id === id)
    if (!note) return
    if (!window.confirm(`¿Eliminar "${note.title}"?`)) return
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function createFolder(name: string) {
    setFolders((prev) => [...prev, { id: crypto.randomUUID(), name }])
  }

  function renameFolder(id: string, name: string) {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)))
  }

  function deleteFolder(folder: Folder) {
    const confirmed = window.confirm(
      `¿Eliminar la carpeta "${folder.name}"? Las notas pasarán a "Todas las notas".`
    )
    if (!confirmed) return
    setFolders((prev) => prev.filter((f) => f.id !== folder.id))
    setNotes((prev) =>
      prev.map((note) => (note.folderId === folder.id ? { ...note, folderId: null } : note))
    )
    if (selectedFolderId === folder.id) setSelectedFolderId(null)
  }

  const changeDirectory = useCallback(async () => {
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
  }, [setDataDir, setFolders, setNotes, setTheme])

  if (!loaded) {
    return <div className="editor-empty">Cargando notas...</div>
  }

  return (
    <div className="app-layout">
      <Sidebar
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        dataDir={dataDir}
        changingDir={changingDir}
        onChangeDirectory={changeDirectory}
      />

      <NoteList
        notes={notesInFolder}
        selectedId={selectedId}
        onSelect={selectNote}
        onContextMenu={openNoteMenu}
        onCreate={createNote}
      />

      <main className="editor">
        {selectedNote ? (
          <Editor
            key={selectedNote.id}
            note={selectedNote}
            onChange={(patch) => updateNote(selectedNote.id, patch)}
            onDelete={deleteSelectedNote}
          />
        ) : (
          <div className="editor-empty">Selecciona o crea una nota</div>
        )}
      </main>

      {noteMenu && (
        <NoteContextMenu
          x={noteMenu.x}
          y={noteMenu.y}
          onDuplicate={() => duplicateNote(noteMenu.noteId)}
          onDelete={() => deleteNote(noteMenu.noteId)}
        />
      )}
    </div>
  )
}
