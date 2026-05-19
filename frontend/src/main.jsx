import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// StrictMode intentionally disabled — it double-invokes effects in dev
// which causes camera components to mount twice and show dual viewfinders.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
