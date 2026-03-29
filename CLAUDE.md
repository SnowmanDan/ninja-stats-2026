# Soccer Stats — Claude Code Guide

## Project Overview
A youth soccer team stats website for my daughter's team. Displays a team roster and game results.

## Tech Stack
- **HTML, CSS, vanilla JavaScript only** — no frameworks, no build tools, no npm
- Files open directly in a browser (no local server required)

## Design Principles
- **Mobile-first** — design for small screens first, then scale up for desktop
- **Clean and sporty** — bold typography, team colors, clear data layout
- **Simple and well-commented** — this is a learning project; explain what the code does and why

## Code Style
- Add comments that explain *what* and *why*, not just *what*
- Use semantic HTML elements (`<section>`, `<article>`, `<header>`, etc.)
- Keep CSS organized with clear section comments (e.g., `/* === ROSTER TABLE === */`)
- Prefer readable code over clever one-liners
- No minification, no transpiling — keep files human-readable

## File Structure
```
soccer-stats/
├── index.html        # Main page (roster + game results)
├── style.css         # All styles
├── app.js            # All JavaScript
└── CLAUDE.md
```

## Data
- Team roster and game results are stored as JavaScript arrays/objects in `app.js`
- No backend or database — all data lives in the JS file for simplicity

## Accessibility
- Use `alt` text on images
- Ensure sufficient color contrast
- Tables should have proper `<thead>` / `<tbody>` and `scope` attributes
