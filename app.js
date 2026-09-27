const STORAGE_KEY = "neroNote";
const VERSION_KEY = "neroNoteV";
const VIEW_KEY = "neroNoteView";

let notebooks = loadNotebooks();
let currentId = getFirstLeafId(notebooks) ?? null;
let modalMode = "create";
let viewMode = localStorage.getItem(VIEW_KEY) || "split";
let expandedIds = new Set(JSON.parse(localStorage.getItem("neroNoteExpanded") || "[]"));
let dragSourceId = null;

const notesList = document.getElementById("notesList");
const split = document.getElementById("split");
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const emptyState = document.getElementById("emptyState");
const noteTitle = document.getElementById("noteTitle");
const actions = document.getElementById("actions");
const saveStatus = document.getElementById("saveStatus");
const wordCount = document.getElementById("wordCount");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalInput = document.getElementById("modalInput");
const confirmModal = document.getElementById("confirmModal");
const iconModal = document.getElementById("iconModal");
const iconList = document.getElementById("iconList");
const cancelIconModal = document.getElementById("cancelIconModal");

const viewCodeBtn = document.getElementById("viewCodeBtn");
const viewSplitBtn = document.getElementById("viewSplitBtn");
const toolbar = document.getElementById("toolbar");
const emojiPicker = document.getElementById("emojiPicker");

const formulaModal = document.getElementById("formulaModal");
const formulaInput = document.getElementById("formulaInput");
const formulaPreview = document.getElementById("formulaPreview");
const insertFormulaBtn = document.getElementById("insertFormulaBtn");
const cancelFormulaModal = document.getElementById("cancelFormulaModal");
const closeFormulaModalBtn = document.getElementById("closeFormulaModal");

const contextMenu = document.getElementById("contextMenu") || createContextMenu();

function createContextMenu() {
  const menu = document.createElement("div");
  menu.id = "contextMenu";
  menu.className = "context-menu hidden";
  menu.innerHTML = `
    <button data-action="addChild">+ Novo subcaderno</button>
    <button data-action="addSibling">+ Novo caderno no mesmo nível</button>
    <hr>
    <button data-action="rename">Renomear</button>
    <button data-action="icon">Mudar ícone</button>
    <button data-action="delete" class="danger">Excluir</button>
  `;
  document.body.appendChild(menu);
  menu.addEventListener("click", handleContextMenuClick);
  document.addEventListener("click", () => contextMenu.classList.add("hidden"));
  return menu;
}

let contextTargetId = null;
let contextIconTargetId = null;

const DEFAULT_ICONS = ["📖","📘","📗","📕","📙","📚","📝","📓","🗒️","📁","🗂️","✏️","🖊️","🖍️","💡","🔍","⭐","🌟","🔥","🧠","🎯","🚀","⚡","🎓","🎨","🎵","🎬","🍎","🍀","🌍","❤️","💜","💙","💚","💛","✅","⚠️","📌","🧪","⚙️","🔧","🧭","🗺️"];

function showContextMenu(e, note) {
  e.preventDefault();
  e.stopPropagation();
  contextTargetId = note.id;
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.classList.remove("hidden");
}

function handleContextMenuClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  const note = notebooks.find(n => n.id === contextTargetId);
  if (!note) return;

  switch (action) {
    case "addChild":
      openCreateModal(note.id);
      break;
    case "addSibling":
      openCreateModal(note.parentId);
      break;
    case "rename":
      openRenameModal();
      break;
    case "icon":
      openIconModal();
      break;
    case "delete":
      deleteNotebook();
      break;
  }
  contextMenu.classList.add("hidden");
}

function handleDragStart(e, note) {
  dragSourceId = note.id;
  e.target.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e, note) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (note.id !== dragSourceId) {
    e.target.classList.add("drag-over");
  }
}

function handleDragLeave(e, note) {
  e.target.classList.remove("drag-over");
}

function handleDrop(e, note) {
  e.preventDefault();
  e.target.classList.remove("drag-over");
  if (!dragSourceId || dragSourceId === note.id) return;

  const sourceNote = notebooks.find(n => n.id === dragSourceId);
  const targetNote = note;

  if (isDescendant(dragSourceId, targetNote.id)) return;

  sourceNote.parentId = targetNote.id;
  saveNotebooks();
  render();
}

function handleDragEnd(e) {
  document.querySelectorAll(".note-item").forEach(el => {
    el.classList.remove("dragging", "drag-over");
  });
  dragSourceId = null;
}

function isDescendant(childId, ancestorId) {
  let current = notebooks.find(n => n.id === childId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = notebooks.find(n => n.id === current.parentId);
  }
  return false;
}

function setViewMode(mode) {
  viewMode = mode;
  localStorage.setItem(VIEW_KEY, mode);
  split.classList.toggle("view-code", mode === "code");
  viewCodeBtn.classList.toggle("active", mode === "code");
  viewSplitBtn.classList.toggle("active", mode === "split");
}

viewCodeBtn.addEventListener("click", () => setViewMode("code"));
viewSplitBtn.addEventListener("click", () => setViewMode("split"));

const PAIRS = {
  '"': '"',
  "'": "'",
  "(": ")",
  "[": "]",
  "{": "}",
  "`": "`",
};

const EMOJIS = ["😀","😁","😂","🤣","😊","😍","🤔","😉","😎","🥳","😴","🤒","😢","😭","😡","😱","🤯","😅","🙂","😐","🙃","😇","🥰","😬","🤮","💀","👍","👎","👏","🙌","🙏","💪","🤝","✌️","👀","🧠","❤️","🧡","💛","💚","💙","💜","🖤","💔","✨","⭐","🔥","💡","🎉","🎁","📌","✅","❌","⚠️","❓"];

function initEmojiPicker() {
  emojiPicker.innerHTML = EMOJIS.map(emoji =>
    `<button type="button" class="emoji-btn">${emoji}</button>`
  ).join("");

  emojiPicker.addEventListener("click", e => {
    const btn = e.target.closest(".emoji-btn");
    if (!btn) return;
    insertAtCursor(btn.textContent);
    closeEmojiPicker();
    editor.focus();
  });
}

function positionEmojiPicker(anchor) {
  const rect = anchor.getBoundingClientRect();
  const pickerWidth = 296;
  const pickerHeight = 240;
  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + pickerWidth > window.innerWidth) left = window.innerWidth - pickerWidth - 8;
  if (top + pickerHeight > window.innerHeight) top = rect.top - pickerHeight - 6;
  if (left < 8) left = 8;
  if (top < 8) top = 8;

  emojiPicker.style.left = `${left}px`;
  emojiPicker.style.top = `${top}px`;
}

function toggleEmojiPicker(anchor) {
  if (emojiPicker.classList.contains("hidden")) {
    if (!emojiPicker.childElementCount) initEmojiPicker();
    positionEmojiPicker(anchor);
    emojiPicker.classList.remove("hidden");
  } else {
    closeEmojiPicker();
  }
}

function closeEmojiPicker() {
  emojiPicker.classList.add("hidden");
}

document.addEventListener("click", e => {
  if (emojiPicker.classList.contains("hidden")) return;
  if (!emojiPicker.contains(e.target) && !e.target.closest('[data-action="emoji"]')) {
    closeEmojiPicker();
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeEmojiPicker();
});

function wrapSelection(before, after = "") {
  const note = currentNotebook();
  if (!note) return;

  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.slice(start, end);
  const replacement = before + selected + (after || before);

  editor.value = editor.value.slice(0, start) + replacement + editor.value.slice(end);
  editor.focus();

  if (selected) {
    editor.selectionStart = start + before.length;
    editor.selectionEnd = start + before.length + selected.length;
  } else if (after) {
    editor.selectionStart = editor.selectionEnd = start + before.length;
  } else {
    editor.selectionStart = editor.selectionEnd = start + before.length;
  }
  editor.dispatchEvent(new Event("input"));
}

function insertAtCursor(text) {
  const note = currentNotebook();
  if (!note) return;

  const start = editor.selectionStart;
  editor.value = editor.value.slice(0, start) + text + editor.value.slice(start);
  editor.focus();
  editor.selectionStart = editor.selectionEnd = start + text.length;
  editor.dispatchEvent(new Event("input"));
}

function replaceLines(fn) {
  const note = currentNotebook();
  if (!note) return;

  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const before = editor.value.slice(0, start);
  const after = editor.value.slice(end);

  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  const startLineIdx = beforeLines.length - 1;
  const endLineIdx = startLineIdx + afterLines.length;

  const lines = editor.value.split("\n");
  const selectedLines = lines.slice(startLineIdx, endLineIdx);
  const newLines = fn(selectedLines, startLineIdx);

  lines.splice(startLineIdx, selectedLines.length, ...newLines);
  editor.value = lines.join("\n");
  editor.focus();
  editor.dispatchEvent(new Event("input"));
}

function toggleLinePrefix(prefix, altPrefix = "") {
  replaceLines(lines => lines.map(line => {
    if (line.startsWith(prefix)) return line.slice(prefix.length);
    if (altPrefix && line.startsWith(altPrefix)) return line.slice(altPrefix.length);
    return prefix + line;
  }));
}

function toggleInline(marker) {
  wrapSelection(marker, marker);
}

function renderFormula(target, formula, displayMode = false) {
  if (!target) return;

  const value = formula.trim();

  if (!value) {
    target.textContent = "Digite uma fórmula para visualizar.";
    target.classList.add("formula-empty");
    return;
  }

  target.classList.remove("formula-empty");

  if (window.katex) {
    try {
      window.katex.render(value, target, {
        displayMode,
        throwOnError: false,
        strict: "ignore"
      });
    } catch {
      target.textContent = value;
    }
  } else {
    target.textContent = value;
  }
}

function openFormulaModal() {
  if (!currentNotebook()) return;

  formulaInput.value = "";
  formulaPreview.textContent = "Digite uma fórmula para visualizar.";
  formulaPreview.classList.add("formula-empty");
  formulaModal.classList.remove("hidden");
  formulaInput.focus();
}

function closeFormulaModal() {
  formulaModal.classList.add("hidden");
}

function insertFormula() {
  const formula = formulaInput.value.trim();
  if (!formula) {
    formulaInput.focus();
    return;
  }

  // Fórmula em bloco: fica visualmente separada do texto.
  insertAtCursor(`\n$$\n${formula}\n$$\n`);
  closeFormulaModal();
}

function updateFormulaPreview() {
  renderFormula(formulaPreview, formulaInput.value, true);
}

formulaInput.addEventListener("input", updateFormulaPreview);

document.querySelectorAll(".formula-template").forEach(button => {
  button.addEventListener("click", () => {
    formulaInput.value = button.dataset.formula || "";
    updateFormulaPreview();
    formulaInput.focus();
  });
});

insertFormulaBtn.addEventListener("click", insertFormula);
cancelFormulaModal.addEventListener("click", closeFormulaModal);
closeFormulaModalBtn.addEventListener("click", closeFormulaModal);

formulaModal.addEventListener("click", event => {
  if (event.target === formulaModal) closeFormulaModal();
});

formulaInput.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeFormulaModal();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    insertFormula();
  }
});

function applyToolbarAction(action) {
  switch (action) {
    case "bold": toggleInline("**"); break;
    case "italic": toggleInline("*"); break;
    case "strikethrough": toggleInline("~~"); break;
    case "code": toggleInline("`"); break;
    case "heading1": replaceLines(lines => lines.map(l => l.startsWith("# ") ? l.slice(2) : "# " + l)); break;
    case "heading2": replaceLines(lines => lines.map(l => l.startsWith("## ") ? l.slice(3) : "## " + l)); break;
    case "heading3": replaceLines(lines => lines.map(l => l.startsWith("### ") ? l.slice(4) : "### " + l)); break;
    case "ul": toggleLinePrefix("- "); break;
    case "ol": replaceLines((lines, idx) => lines.map((l, i) => {
      const num = idx + i + 1;
      return l.match(/^\d+\.\s/) ? l.replace(/^\d+\.\s/, "") : `${num}. ` + l;
    })); break;
    case "task": toggleLinePrefix("- [ ] ", "- [x] "); break;
    case "quote": toggleLinePrefix("> "); break;
    case "codeblock": wrapSelection("```\n", "\n```"); break;
    case "hr": insertAtCursor("\n---\n"); break;
    case "link": wrapSelection("[", "](url)"); break;
    case "image": wrapSelection("![", "](url)"); break;
    case "table": insertAtCursor("| Coluna 1 | Coluna 2 |\n| --- | --- |\n|  |  |\n"); break;
    case "formula": openFormulaModal(); break;
    case "undo": document.execCommand("undo"); break;
    case "redo": document.execCommand("redo"); break;
  }
}

toolbar.addEventListener("click", e => {
  const btn = e.target.closest(".tool-btn");
  if (!btn) return;
  if (btn.dataset.action === "emoji") {
    toggleEmojiPicker(btn);
    return;
  }
  applyToolbarAction(btn.dataset.action);
});

editor.addEventListener("keydown", e => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    editor.dispatchEvent(new Event("input"));
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    const shortcuts = {
      "b": "bold",
      "i": "italic",
      "k": "link",
      "`": "code",
      "1": "heading1",
      "2": "heading2",
      "3": "heading3",
      "z": "undo",
      "y": "redo",
      "m": "formula",
    };
    if (shortcuts[e.key.toLowerCase()]) {
      e.preventDefault();
      applyToolbarAction(shortcuts[e.key.toLowerCase()]);
      return;
    }
    if (e.shiftKey) {
      const shiftShortcuts = {
        "x": "strikethrough",
        "8": "ul",
        "9": "ol",
        "t": "task",
        "q": "quote",
        "c": "codeblock",
        "h": "hr",
        "i": "image",
        "l": "table",
      };
      if (shiftShortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        applyToolbarAction(shiftShortcuts[e.key.toLowerCase()]);
        return;
      }
    }
  }

  if (e.key === "Enter") {
    const start = editor.selectionStart;
    const value = editor.value;
    const beforeCursor = value.slice(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const currentLine = beforeCursor.slice(lineStart);

    const taskMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s+\[([ x])\]\s/);
    if (taskMatch) {
      e.preventDefault();
      const indent = taskMatch[1];
      const marker = taskMatch[2];
      const newLine = indent + marker + " [ ] ";
      editor.value = value.slice(0, start) + "\n" + newLine + value.slice(start);
      editor.selectionStart = editor.selectionEnd = start + 1 + newLine.length;
      editor.dispatchEvent(new Event("input"));
      return;
    }

    const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s+/);
    if (listMatch) {
      e.preventDefault();
      const indent = listMatch[1];
      const marker = listMatch[2];
      const isOrdered = /^\d+\./.test(marker);
      const nextNum = isOrdered ? parseInt(marker) + 1 : marker;
      const newLine = indent + (isOrdered ? nextNum + ". " : marker + " ");
      editor.value = value.slice(0, start) + "\n" + newLine + value.slice(start);
      editor.selectionStart = editor.selectionEnd = start + 1 + newLine.length;
      editor.dispatchEvent(new Event("input"));
      return;
    }

    const quoteMatch = currentLine.match(/^(\s*>)\s/);
    if (quoteMatch) {
      e.preventDefault();
      editor.value = value.slice(0, start) + "\n" + quoteMatch[1] + " " + value.slice(start);
      editor.selectionStart = editor.selectionEnd = start + 1 + quoteMatch[1].length + 1;
      editor.dispatchEvent(new Event("input"));
      return;
    }
  }

  if (PAIRS[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const end = editor.selectionEnd;
    const nextChar = editor.value[end];
    if (editor.selectionStart !== editor.selectionEnd || nextChar === PAIRS[e.key] || nextChar === "" || /\s/.test(nextChar)) {
      e.preventDefault();
      if (editor.selectionStart !== editor.selectionEnd) {
        wrapSelection(e.key, PAIRS[e.key]);
      } else {
        if (nextChar === PAIRS[e.key]) {
          editor.selectionStart = editor.selectionEnd = end + 1;
        } else {
          wrapSelection(e.key, PAIRS[e.key]);
        }
      }
    }
  }

  if (e.key === "Backspace") {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end && start > 1) {
      const before = editor.value.slice(start - 2, start);
      const after = editor.value.slice(start, start + 2);
      for (const [open, close] of Object.entries(PAIRS)) {
        if (before === open + close && after === "") {
          e.preventDefault();
          editor.value = editor.value.slice(0, start - 2) + editor.value.slice(start);
          editor.selectionStart = editor.selectionEnd = start - 2;
          editor.dispatchEvent(new Event("input"));
          return;
        }
      }
    }
  }
});

function loadNotebooks() {
  let notes = [];
  try {
    notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    notes = [];
  }

  if (!localStorage.getItem(VERSION_KEY)) {
    notes.forEach(note => {
      note.content = htmlToMarkdown(note.content || "");
    });
    localStorage.setItem(VERSION_KEY, "2");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  notes.forEach(note => {
    if (note.parentId === undefined) note.parentId = null;
    if (note.icon === undefined) note.icon = "📖";
  });

  return notes;
}

function saveNotebooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks));
}

function saveExpanded() {
  localStorage.setItem("neroNoteExpanded", JSON.stringify([...expandedIds]));
}

function getFirstLeafId(list, parentId = null) {
  for (const note of list) {
    if (note.parentId === parentId) {
      const children = list.filter(n => n.parentId === note.id);
      if (children.length === 0) return note.id;
      const leaf = getFirstLeafId(list, note.id);
      if (leaf) return leaf;
    }
  }
  return null;
}

function getChildren(parentId) {
  return notebooks.filter(n => n.parentId === parentId);
}

function getDescendants(id) {
  const result = [];
  const children = getChildren(id);
  for (const child of children) {
    result.push(child);
    result.push(...getDescendants(child.id));
  }
  return result;
}

function getAncestors(id) {
  const result = [];
  let current = notebooks.find(n => n.id === id);
  while (current?.parentId) {
    current = notebooks.find(n => n.id === current.parentId);
    if (current) result.unshift(current);
  }
  return result;
}

function hasChildren(id) {
  return notebooks.some(n => n.parentId === id);
}

function currentNotebook() {
  return notebooks.find(note => note.id === currentId);
}

function render() {
  notesList.innerHTML = "";
  const rootNotes = notebooks.filter(n => n.parentId === null);
  rootNotes.forEach(note => renderNoteTree(note, 0));

  const note = currentNotebook();

  if (!note) {
    noteTitle.textContent = "Nenhum caderno";
    actions.classList.add("hidden");
    toolbar.classList.add("hidden");
    split.classList.add("hidden");
    emptyState.classList.remove("hidden");
    saveStatus.textContent = "—";
    wordCount.textContent = "0 palavras";
    return;
  }

  noteTitle.textContent = note.name;
  actions.classList.remove("hidden");
  toolbar.classList.remove("hidden");
  emptyState.classList.add("hidden");
  split.classList.remove("hidden");
  editor.value = note.content || "";
  renderPreview();
  updateWordCount();
  saveStatus.textContent = "✓ Salvo";
}

function renderNoteTree(note, depth) {
  const button = document.createElement("button");
  button.className = "note-item" + (note.id === currentId ? " active" : "");
  button.dataset.id = note.id;
  button.draggable = true;

  const hasChilds = hasChildren(note.id);
  const isExpanded = expandedIds.has(note.id);

  const indent = depth * 16;
  const expandIcon = hasChilds ? (isExpanded ? "▼" : "▶") : "·";

  button.style.paddingLeft = `${10 + indent}px`;
  button.innerHTML = `<span class="expand-icon">${expandIcon}</span><span class="note-icon">${note.icon}</span><span class="note-name">${escapeHtml(note.name)}</span>`;

  if (hasChilds) {
    button.classList.add("has-children");
    button.querySelector(".expand-icon").addEventListener("click", e => {
      e.stopPropagation();
      toggleExpand(note.id);
    });
  }

  button.addEventListener("click", () => openNotebook(note.id));
  button.addEventListener("contextmenu", e => showContextMenu(e, note));
  button.addEventListener("dragstart", e => handleDragStart(e, note));
  button.addEventListener("dragover", e => handleDragOver(e, note));
  button.addEventListener("dragleave", e => handleDragLeave(e, note));
  button.addEventListener("drop", e => handleDrop(e, note));
  button.addEventListener("dragend", handleDragEnd);

  notesList.appendChild(button);

  if (hasChilds && isExpanded) {
    const children = getChildren(note.id);
    children.forEach(child => renderNoteTree(child, depth + 1));
  }
}

function toggleExpand(id) {
  if (expandedIds.has(id)) {
    expandedIds.delete(id);
  } else {
    expandedIds.add(id);
  }
  saveExpanded();
  render();
}

function openNotebook(id) {
  currentId = id;
  render();
}

function createNotebook(name, parentId = null) {
  const pid = parentId === null || parentId === undefined || parentId === "" ? null : Number(parentId);
  const safePid = Number.isFinite(pid) ? pid : null;
  const notebook = {
    id: Date.now(),
    name,
    content: "",
    parentId: safePid,
    icon: "📖"
  };

  notebooks.push(notebook);
  if (safePid) {
    // Add parent to expandedIds
    expandedIds.add(safePid);
    // Expand all ancestors so the tree renders correctly
    let ancestor = notebooks.find(n => n.id === safePid);
    if (ancestor) {
      expandedIds.add(ancestor.id);
      while (ancestor.parentId) {
        expandedIds.add(ancestor.parentId);
        ancestor = notebooks.find(n => n.id === ancestor.parentId);
        if (!ancestor) break;
      }
    }
  }
  currentId = notebook.id;
  saveNotebooks();
  saveExpanded();
  render();
}

function renameNotebook(name) {
  const note = currentNotebook();
  if (!note) return;

  note.name = name;
  saveNotebooks();
  render();
}

function deleteNotebook() {
  const note = currentNotebook();
  if (!note) return;

  const descendants = getDescendants(note.id);
  const totalCount = 1 + descendants.length;
  const msg = totalCount > 1
    ? `Excluir o caderno "${note.name}" e seus ${descendants.length} subcaderno(s)?\n\nTodo o conteúdo será apagado permanentemente.`
    : `Excluir o caderno "${note.name}"?\n\nTodo o conteúdo deste caderno será apagado.`;

  const confirmed = confirm(msg);
  if (!confirmed) return;

  const idsToRemove = [note.id, ...descendants.map(d => d.id)];
  notebooks = notebooks.filter(item => !idsToRemove.includes(item.id));
  currentId = getFirstLeafId(notebooks);

  saveNotebooks();
  render();
}

function updateWordCount() {
  const text = editor.value.trim();
  const count = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${count} ${count === 1 ? "palavra" : "palavras"}`;
}

function renderMathInPreview() {
  if (!window.katex) return;

  preview.querySelectorAll("[data-math]").forEach(element => {
    const formula = element.dataset.math;
    const displayMode = element.dataset.display === "block";

    try {
      window.katex.render(decodeURIComponent(formula), element, {
        displayMode,
        throwOnError: false,
        strict: "ignore"
      });
    } catch {
      element.textContent = decodeURIComponent(formula);
    }
  });
}

function renderPreview() {
  const md = editor.value || "";

  if (!md) {
    preview.innerHTML = `<p class="preview-empty">A visualização renderizada aparece aqui — basta digitar Markdown.</p>`;
    return;
  }

  preview.innerHTML = renderMarkdown(md);
  renderMathInPreview();
}

editor.addEventListener("input", () => {
  const note = currentNotebook();
  if (!note) return;

  note.content = editor.value;
  saveStatus.textContent = "● Salvando...";
  updateWordCount();
  renderPreview();

  clearTimeout(window.saveTimer);
  window.saveTimer = setTimeout(() => {
    saveNotebooks();
    saveStatus.textContent = "✓ Salvo";
  }, 400);
});

editor.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;

  event.preventDefault();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(end);
  editor.selectionStart = editor.selectionEnd = start + 2;
  editor.dispatchEvent(new Event("input"));
});

document.getElementById("newNoteBtn").addEventListener("click", () => openCreateModal());
document.getElementById("emptyNewBtn").addEventListener("click", () => openCreateModal());
document.getElementById("renameBtn").addEventListener("click", openRenameModal);
document.getElementById("deleteBtn").addEventListener("click", deleteNotebook);

document.getElementById("cancelModal").addEventListener("click", closeModal);
confirmModal.addEventListener("click", confirmModalAction);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

modalInput.addEventListener("keydown", event => {
  if (event.key === "Enter") confirmModalAction();
  if (event.key === "Escape") closeModal();
});

function openCreateModal(parentId = null) {
  modalMode = "create";
  modalTitle.textContent = parentId ? "Novo subcaderno" : "Novo caderno";
  modalText.textContent = parentId ? "Escolha um nome para o subcaderno." : "Escolha um nome para o caderno.";
  modalInput.placeholder = "Ex.: Português";
  modalInput.value = "";
  modalInput.dataset.parentId = parentId ?? "";
  confirmModal.textContent = "Criar";
  modal.classList.remove("hidden");
  modalInput.focus();
}

function openRenameModal() {
  const note = currentNotebook();
  if (!note) return;

  modalMode = "rename";
  modalTitle.textContent = "Renomear caderno";
  modalText.textContent = "Altere o nome deste caderno.";
  modalInput.placeholder = "Nome do caderno";
  modalInput.value = note.name;
  confirmModal.textContent = "Salvar";
  modal.classList.remove("hidden");
  modalInput.focus();
  modalInput.select();
}

function closeModal() {
  modal.classList.add("hidden");
}

function confirmModalAction() {
  const name = modalInput.value.trim();
  if (!name) return;

  if (modalMode === "create") {
    const parentId = modalInput.dataset.parentId || null;
    createNotebook(name, parentId);
  } else {
    renameNotebook(name);
  }

  closeModal();
}

function openIconModal() {
  const note = currentNotebook();
  if (!note) return;

  contextIconTargetId = note.id;
  if (!iconList.childElementCount) initIconList();
  iconList.querySelectorAll(".icon-btn").forEach(btn =>
    btn.classList.toggle("active", btn.textContent === note.icon));
  iconModal.classList.remove("hidden");
}

function initIconList() {
  iconList.innerHTML = DEFAULT_ICONS.map(icon =>
    `<button type="button" class="icon-btn">${icon}</button>`
  ).join("");

  iconList.addEventListener("click", e => {
    const btn = e.target.closest(".icon-btn");
    if (!btn) return;
    applyIcon(btn.textContent);
  });
}

function applyIcon(icon) {
  const note = notebooks.find(n => n.id === contextIconTargetId);
  if (!note) return;
  note.icon = icon;
  saveNotebooks();
  closeIconModal();
  render();
}

function closeIconModal() {
  iconModal.classList.add("hidden");
}

cancelIconModal.addEventListener("click", closeIconModal);

iconModal.addEventListener("click", e => {
  if (e.target === iconModal) closeIconModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeIconModal();
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function renderMarkdown(src) {
  const lines = src.split("\n");
  const blocks = [];
  let listBuffer = null;
  let i = 0;

  function flushList() {
    if (!listBuffer) return;

    const tag = listBuffer.type === "ol" ? "ol" : "ul";
    blocks.push(`<${tag}>${listBuffer.items.join("")}</${tag}>`);
    listBuffer = null;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Bloco matemático: $$ ... $$
    if (/^\s*\$\$\s*$/.test(line)) {
      flushList();
      const formulaLines = [];
      i++;

      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) {
        formulaLines.push(lines[i]);
        i++;
      }

      if (i < lines.length) i++;

      const formula = encodeURIComponent(formulaLines.join("\n").trim());
      blocks.push(`<div class="math-block" data-math="${formula}" data-display="block"></div>`);
      continue;
    }

    if (/^```/.test(line)) {
      flushList();
      const lang = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++;
      const klass = lang ? ` class="language-${lang}"` : "";
      blocks.push(`<pre><code${klass}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\s*(?:\*\*\*+|---+|___+)\s*$/.test(line)) {
      flushList();
      blocks.push("<hr>");
      i++;
      continue;
    }

    const tableMatch = line.match(/^\s*\|(.+)\|\s*$/);
    if (tableMatch) {
      flushList();
      const rows = [];
      let j = i;
      while (j < lines.length && /^\s*\|/.test(lines[j])) {
        rows.push(lines[j].trim());
        j++;
      }
      if (rows.length >= 2 && /^\s*\|[\s:\-|]+\|\s*$/.test(rows[1])) {
        const headers = rows[0].slice(1, -1).split("|").map(h => h.trim());
        const aligns = rows[1].slice(1, -1).split("|").map(a => {
          a = a.trim();
          if (a.startsWith(":") && a.endsWith(":")) return ' style="text-align:center"';
          if (a.endsWith(":")) return ' style="text-align:right"';
          return "";
        });
        const dataRows = rows.slice(2).map(r => r.slice(1, -1).split("|").map(c => c.trim()));
        let tableHtml = "<table><thead><tr>";
        headers.forEach((h, idx) => tableHtml += `<th${aligns[idx]}>${inline(h)}</th>`);
        tableHtml += "</tr></thead><tbody>";
        dataRows.forEach(row => {
          tableHtml += "<tr>";
          row.forEach((c, idx) => tableHtml += `<td${aligns[idx]}>${inline(c)}</td>`);
          tableHtml += "</tr>";
        });
        tableHtml += "</tbody></table>";
        blocks.push(tableHtml);
      }
      i = j;
      continue;
    }

    if (/^\s*<[A-Za-z]/.test(line)) {
      flushList();
      const chunk = [];
      while (i < lines.length && lines[i].trim() !== "") {
        chunk.push(lines[i]);
        i++;
      }
      blocks.push(sanitizeHtml(chunk.join("\n")));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      const quote = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        `<blockquote>` + quote.map(q => `<p>${inline(q)}</p>`).join("") + `</blockquote>`
      );
      continue;
    }

    const taskMatch = line.match(/^\s*[-*+]\s+\[([ x])\]\s+(.*)$/);
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);

    if (taskMatch) {
      flushList();
      if (!listBuffer || listBuffer.type !== "ul") {
        listBuffer = { type: "ul", items: [] };
      }
      const checked = taskMatch[1] === "x";
      listBuffer.items.push(`<li class="task-item"><input type="checkbox" ${checked ? "checked" : ""} disabled> ${inline(taskMatch[2])}</li>`);
      i++;
      continue;
    }

    if (ulMatch || olMatch) {
      const type = olMatch ? "ol" : "ul";
      if (!listBuffer || listBuffer.type !== type) {
        flushList();
        listBuffer = { type, items: [] };
      }
      listBuffer.items.push(`<li>${inline(olMatch ? olMatch[2] : ulMatch[1])}</li>`);
      i++;
      continue;
    }

    if (line.trim() === "") {
      flushList();
      i++;
      continue;
    }

    flushList();

    const para = [];
    while (
      i < lines.length
      && lines[i].trim() !== ""
      && !/^```/.test(lines[i])
      && !/^(#{1,6})\s/.test(lines[i])
      && !/^>\s?/.test(lines[i])
      && !/^\s*(?:\*\*\*+|---+|___+)\s*$/.test(lines[i])
      && !/^\s*[-*+]\s/.test(lines[i])
      && !/^\s*\d+\.\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }

    blocks.push(`<p>${inline(para.join("<br>"))}</p>`);
  }

  flushList();
  return blocks.join("\n");
}

function inline(text) {
  const codes = [];
  const tags = [];
  const formulas = [];

  let out = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      formulas.push({ value: formula.trim(), displayMode: true });
      return `%%M${formulas.length - 1}%%`;
    })
    .replace(/\\\(([\s\S]+?)\\\)/g, (match, formula) => {
      formulas.push({ value: formula.trim(), displayMode: false });
      return `%%M${formulas.length - 1}%%`;
    })
    .replace(/`([^`]+)`/g, (match, code) => {
      codes.push(escapeHtml(code));
      return `%%C${codes.length - 1}%%`;
    })
    .replace(/<\/?[a-zA-Z][^>\n]*>/g, tag => {
      tags.push(sanitizeTag(tag));
      return `%%T${tags.length - 1}%%`;
    });

  out = escapeHtml(out)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, url) =>
      `<img src="${safeUrl(url)}" alt="${alt}">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
      `<a href="${safeUrl(url)}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return out
    .replace(/%%T(\d+)%%/g, (match, index) => tags[Number(index)] ?? "")
    .replace(/%%C(\d+)%%/g, (match, index) => `<code>${codes[Number(index)]}</code>`)
    .replace(/%%M(\d+)%%/g, (match, index) => {
      const formula = formulas[Number(index)];
      if (!formula) return "";
      const encoded = encodeURIComponent(formula.value);
      return `<span class="math-inline" data-math="${encoded}" data-display="${formula.displayMode ? "block" : "inline"}"></span>`;
    });
}

function sanitizeTag(tag) {
  return tag
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2?/gi, "");
}

function sanitizeHtml(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,audio,video").forEach(el => el.remove());
  container.querySelectorAll("*").forEach(el => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      } else if ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return container.innerHTML;
}

function safeUrl(url) {
  if (/^(https?:|mailto:|#|\/)/i.test(url)) return url;
  return "#";
}

function htmlToMarkdown(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return nodeToMarkdown(container).replace(/\n{3,}/g, "\n\n").trim();
}

function nodeToMarkdown(node) {
  let out = "";

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent;
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = child.tagName.toLowerCase();

    if (tag === "br") {
      out += "\n";
      continue;
    }

    const text = nodeToMarkdown(child);

    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = Number(tag[1]);
        out += `\n\n${"#".repeat(level)} ${text.trim()}\n\n`;
        break;
      }
      case "p":
      case "div":
      case "section":
      case "article":
        out += `\n\n${text.trim()}\n\n`;
        break;
      case "ul":
      case "ol": {
        let items = "";
        let index = 0;
        for (const li of child.children) {
          if (li.tagName.toLowerCase() !== "li") {
            items += nodeToMarkdown(li);
            continue;
          }
          index++;
          const prefix = tag === "ol" ? `${index}. ` : "- ";
          items += `${prefix}${nodeToMarkdown(li).trim()}\n`;
        }
        out += `\n${items}\n`;
        break;
      }
      case "li":
        out += `${text.trim()}\n`;
        break;
      case "blockquote":
        out += `\n\n> ${text.trim().replace(/\n/g, "\n> ")}\n\n`;
        break;
      case "strong":
      case "b":
        out += `**${text.trim()}**`;
        break;
      case "em":
      case "i":
        out += `*${text.trim()}*`;
        break;
      case "a":
        out += `[${text.trim()}](${child.getAttribute("href") || ""})`;
        break;
      case "img":
        out += `![${child.getAttribute("alt") || ""}](${child.getAttribute("src") || ""})`;
        break;
      case "code":
        out += `\`${text}\``;
        break;
      case "pre":
        out += `\n\n\`\`\`\n${text}\n\`\`\`\n\n`;
        break;
      default:
        out += text;
        break;
    }
  }

  return out;
}

setViewMode(viewMode);
render();