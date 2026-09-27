# AGENTS.md — NeroNote

## Project
Simple offline markdown note-taking app (vanilla HTML/CSS/JS). No build, no deps, no tests.

## Run
Open `index.html` directly in a browser. No server needed.

## Structure
- `index.html` — UI (sidebar, split editor: textarea + live preview)
- `app.js` — all logic: storage, markdown parser, UI
- `style.css` — dark theme, split layout
- `README.md` — user docs

## Key implementation details
- **Storage**: `localStorage` key `neroNote` (array of `{id, name, content}`); content stored as Markdown
- **Markdown parser**: custom in `app.js` (`renderMarkdown`, `inline`) — supports headings, bold/italic/strikethrough, code (inline + fenced), lists, blockquotes, links, images, HR. Raw HTML (inline tags and blocks) is rendered after sanitization (`sanitizeHtml`/`sanitizeTag` strip scripts, event handlers and `javascript:` URLs).
- **Migration**: legacy HTML notes auto-converted to Markdown on first load via `htmlToMarkdown`/`nodeToMarkdown` (key `neroNoteV`)
- **Editor**: split pane (textarea left, rendered preview right). `Tab` inserts 2 spaces. Word count from textarea value.
- **No contenteditable** — all input via textarea.

## Conventions
- No lint/typecheck/test commands exist.
- All JS is ES modules-compatible but loaded as plain script.
- CSS uses custom properties (`--bg`, `--accent`, etc.) defined in `:root`.

## Common tasks
- Add markdown feature → edit `renderMarkdown`/`inline` in `app.js`
- Change UI → edit `index.html` + `style.css`
- Update storage schema → bump `VERSION_KEY` in `app.js` and migrate in `loadNotebooks`

## Files to avoid editing
None — flat project, all files are fair game.