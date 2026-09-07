const STORAGE_KEY = 'az-kviz-state-v1';
const MAX_HISTORY = 30;

let questions = [];
let history = [];

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 28) return null;

    return parsed.map(question => ({
      ...question,
      status: ['gray', 'white'].includes(question.status) ? 'open' : question.status
    }));
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch {
    // Některé prohlížeče blokují localStorage u souborů otevřených přes file://.
    // Hra přesto zůstává funkční po dobu otevření stránky.
  }
}

function pushHistory() {
  history.push(cloneData(questions));
  if (history.length > MAX_HISTORY) history.shift();
}

export function initGame(defaultQuestions) {
  questions = loadState() ?? cloneData(defaultQuestions);
  history = [];
}

export function getQuestions() {
  return questions;
}

export function canUndo() {
  return history.length > 0;
}

export function setTileStatus(index, status) {
  if (!questions[index]) return;
  pushHistory();
  questions[index].status = status;
  saveState();
}

export function replaceQuestions(newQuestions) {
  pushHistory();
  questions = cloneData(newQuestions);
  saveState();
}

export function resetBoard() {
  pushHistory();
  questions = questions.map(question => ({ ...question, status: 'open' }));
  saveState();
}

export function startNewGame() {
  history = [];
  questions = questions.map(question => ({ ...question, status: 'open' }));
  saveState();
}

export function undo() {
  const previous = history.pop();
  if (!previous) return false;

  questions = previous;
  saveState();
  return true;
}
