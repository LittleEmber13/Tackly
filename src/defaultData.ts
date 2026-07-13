export function defaultData(): AppData {
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
