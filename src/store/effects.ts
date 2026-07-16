import { shallow } from 'zustand/shallow'
import { useNotesStore } from './notesStore'

const SAVE_DELAY = 400

export function startStoreEffects() {
  useNotesStore.subscribe(
    (s) => s.theme,
    (theme) => {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('notas-theme', theme)
    },
    { fireImmediately: true }
  )

  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  useNotesStore.subscribe(
    (s) => ({ folders: s.folders, notes: s.notes, theme: s.theme, loaded: s.loaded }),
    ({ folders, notes, theme, loaded }) => {
      if (!loaded) return
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        window.notasApi.saveData({ folders, notes, theme })
      }, SAVE_DELAY)
    },
    { equalityFn: shallow }
  )
}
