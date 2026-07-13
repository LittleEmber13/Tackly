import { useEffect, useRef, useState } from 'react'
import { defaultData } from '../defaultData'

export function useNotasStore() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('notas-theme') as 'dark' | 'light') || 'dark'
  )
  const [dataDir, setDataDir] = useState('')
  const [loaded, setLoaded] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  return {
    folders,
    setFolders,
    notes,
    setNotes,
    theme,
    setTheme,
    dataDir,
    setDataDir,
    loaded
  }
}
