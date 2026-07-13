import { useEffect, useMemo, useRef, useState } from 'react'
import { marked, Renderer } from 'marked'
import {
  autoConvertTaskLines,
  contentToEditorHtml,
  handleBackspace,
  handleEnter,
  insertTaskLine,
  serializeEditor,
  taskLineRegex
} from '../hybridChecklistEditor'

interface EditorProps {
  note: Note
  onChange: (patch: Partial<Note>) => void
  onDelete: () => void
}

export function Editor({ note, onChange, onDelete }: EditorProps) {
  const [isPreview, setIsPreview] = useState(false)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const taskCounter = useRef(0)

  const taskRenderer = useMemo(() => {
    const renderer = new Renderer()
    renderer.checkbox = ({ checked }) =>
      `<input type="checkbox" class="task-checkbox" data-task-index="${taskCounter.current++}"${checked ? ' checked' : ''} />`
    return renderer
  }, [])

  const previewHtml = useMemo(() => {
    taskCounter.current = 0
    return marked.parse(note.content, { renderer: taskRenderer }) as string
  }, [note.content, taskRenderer])

  useEffect(() => {
    if (isPreview || !editorRef.current) return
    editorRef.current.innerHTML = contentToEditorHtml(note.content)
  }, [note.id, isPreview])

  function syncEditorContent() {
    if (!editorRef.current) return
    onChange({ content: serializeEditor(editorRef.current) })
  }

  function toggleTaskCheckbox(index: number) {
    let count = -1
    const newContent = note.content
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
    onChange({ content: newContent })
  }

  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      const index = target.dataset.taskIndex
      if (index !== undefined) toggleTaskCheckbox(Number(index))
    }
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

  return (
    <>
      <div className="editor-toolbar">
        <input
          className="editor-title"
          value={note.title}
          onChange={(e) => onChange({ title: e.target.value })}
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
        <button className="btn-delete-note" onClick={() => setIsPreview((v) => !v)}>
          {isPreview ? 'Editar' : 'Vista previa'}
        </button>
        <button className="btn-delete-note" onClick={onDelete}>
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
  )
}
