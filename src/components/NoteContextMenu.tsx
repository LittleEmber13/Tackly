interface NoteContextMenuProps {
  x: number
  y: number
  onDuplicate: () => void
  onDelete: () => void
}

export function NoteContextMenu({ x, y, onDuplicate, onDelete }: NoteContextMenuProps) {
  return (
    <div
      className="context-menu"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="context-menu-item" onClick={onDuplicate}>
        Duplicar
      </button>
      <button className="context-menu-item context-menu-item-danger" onClick={onDelete}>
        Eliminar
      </button>
    </div>
  )
}
