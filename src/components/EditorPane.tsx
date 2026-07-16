import { useSelectedNote } from '../store'
import { Editor } from './Editor'

export function EditorPane() {
  const selectedNote = useSelectedNote()

  return (
    <main className="editor">
      {selectedNote ? (
        <Editor key={selectedNote.id} note={selectedNote} />
      ) : (
        <div className="editor-empty">Selecciona o crea una nota</div>
      )}
    </main>
  )
}
