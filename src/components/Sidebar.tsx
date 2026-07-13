import { useState } from 'react'

interface SidebarProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  folders: Folder[]
  selectedFolderId: string | null
  onSelectFolder: (id: string | null) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (folder: Folder) => void
  dataDir: string
  changingDir: boolean
  onChangeDirectory: () => void
}

export function Sidebar({
  theme,
  onToggleTheme,
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  dataDir,
  changingDir,
  onChangeDirectory
}: SidebarProps) {
  const [newFolderName, setNewFolderName] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingName, setRenamingName] = useState('')

  function commitNewFolder() {
    if (newFolderName && newFolderName.trim()) onCreateFolder(newFolderName.trim())
    setNewFolderName(null)
  }

  function startRenameFolder(folder: Folder) {
    setRenamingFolderId(folder.id)
    setRenamingName(folder.name)
  }

  function commitRenameFolder() {
    if (renamingFolderId && renamingName.trim()) {
      onRenameFolder(renamingFolderId, renamingName.trim())
    }
    setRenamingFolderId(null)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Carpetas</span>
        <div className="sidebar-header-actions">
          <button className="btn-theme-toggle" title="Cambiar tema" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn-new-note" onClick={() => setNewFolderName('')}>
            + Carpeta
          </button>
        </div>
      </div>
      <div className="sidebar-content">
        <button
          className={`folder-item ${selectedFolderId === null ? 'selected' : ''}`}
          onClick={() => onSelectFolder(null)}
        >
          Todas las notas
        </button>
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''}`}
            onClick={() => onSelectFolder(folder.id)}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      startRenameFolder(folder)
                    }}
                  >
                    ✎
                  </button>
                  <button
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteFolder(folder)
                    }}
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
          onClick={onChangeDirectory}
          disabled={changingDir}
          title={dataDir || 'Seleccionar carpeta de datos'}
        >
          {changingDir ? '...' : '📂 Cambiar carpeta'}
        </button>
        {dataDir && <div className="data-dir-path">{dataDir}</div>}
      </div>
    </aside>
  )
}
