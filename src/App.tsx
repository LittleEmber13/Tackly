export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">Carpetas</div>
        <div className="sidebar-content" />
      </aside>

      <section className="note-list">
        <div className="note-list-header">Notas</div>
        <div className="note-list-content" />
      </section>

      <main className="editor">
        <div className="editor-empty">Selecciona o crea una nota</div>
      </main>
    </div>
  )
}
