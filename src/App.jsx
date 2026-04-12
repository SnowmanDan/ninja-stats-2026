// App.jsx — the root React component.
// In React, a "component" is just a function that returns HTML-like syntax
// called JSX. JSX looks like HTML but lives inside JavaScript files.
// This is the top-level component; all other components will live inside it.

function App() {
  return (
    <main style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
      <h1>Ninja Stats 2026</h1>
      <p>React Migration In Progress</p>
    </main>
  )
}

// Export makes this component available to import in other files.
// main.jsx imports it to mount it into the page.
export default App
