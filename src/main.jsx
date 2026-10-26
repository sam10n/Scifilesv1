import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/lib/supabaseClient' // must load first: sets globalThis.__B44_DB__
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
