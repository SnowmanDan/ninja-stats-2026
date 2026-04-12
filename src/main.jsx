// main.jsx — the entry point for the React app.
// React needs one DOM element to "mount" into (attach itself to).
// This file finds that element and hands control to our App component.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// ReactDOM.createRoot creates a React "root" attached to the <div id="root">
// in react-index.html. Everything React renders lives inside that div.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode is a development helper — it runs your components twice
  // (in dev only) to catch side effects and warn about deprecated patterns.
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
