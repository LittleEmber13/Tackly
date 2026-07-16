import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { startStoreEffects, useNotesStore } from './store'
import './index.css'

startStoreEffects()
useNotesStore.getState().load()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
