import { useNotesStore } from './store'
import { Sidebar } from './components/Sidebar'
import { NoteList } from './components/NoteList'
import { EditorPane } from './components/EditorPane'
import { NoteContextMenu } from './components/NoteContextMenu'

export default function App() {
  const loaded = useNotesStore((s) => s.loaded)

  if (!loaded) {
    return <div className="editor-empty">Cargando notas...</div>
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <NoteList />
      <EditorPane />
      <NoteContextMenu />
    </div>
  )
}
