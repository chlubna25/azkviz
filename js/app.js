import { sampleQuestions } from '../data/sample-questions.js';
import {
  initGame,
  getQuestions,
  canUndo,
  setTileStatus,
  replaceQuestions,
  resetBoard as resetGameBoard,
  startNewGame,
  undo as undoGame
} from './game.js';
import { checkWinner } from './winner.js';
import {
  createSampleCsv,
  normalizeYesNo,
  parseQuestionsCsv,
  readFileAsText
} from './csv.js';
import * as ui from './ui.js';

let activeIndex = null;
let isBlackRound = false;
let selectedYesNoAnswer = null;
let victoryPath = [];
let declaredWinner = null;

function renderBoard() {
  ui.renderBoard(getQuestions(), victoryPath, openQuestion);
  ui.setUndoEnabled(canUndo());
}

function clearVictoryState() {
  ui.clearVictoryPresentation();
  victoryPath = [];
  declaredWinner = null;
}

function openQuestion(index) {
  activeIndex = index;
  const question = getQuestions()[index];
  isBlackRound = question.status === 'black';
  selectedYesNoAnswer = null;
  ui.openQuestion(question, isBlackRound);
}

function revealAnswer() {
  ui.revealAnswer();
}

function handleYesNo(answer) {
  if (activeIndex === null) return;

  const question = getQuestions()[activeIndex];
  selectedYesNoAnswer = answer;
  ui.showYesNoResult(answer, normalizeYesNo(question.yesNoAnswer));
}

function setColor(color) {
  if (activeIndex === null) return;

  ui.stopTimer();
  ui.clearVictoryPresentation();
  victoryPath = [];
  declaredWinner = null;

  setTileStatus(activeIndex, color);
  const victory = checkWinner(getQuestions());

  if (victory) {
    declaredWinner = victory.color;
    victoryPath = victory.path;
  }

  renderBoard();
  ui.closeQuestionDialog();
  activeIndex = null;

  if (victory) {
    ui.showVictory(victory);
  }
}

function undo() {
  if (!undoGame()) return;

  clearVictoryState();
  renderBoard();
}

function resetBoard() {
  if (!confirm('Opravdu chcete vrátit všechna pole do výchozího stavu? Otázky zůstanou zachovány.')) return;

  clearVictoryState();
  resetGameBoard();
  renderBoard();
}

function startNewGameFromVictory() {
  clearVictoryState();
  startNewGame();
  renderBoard();
}

function importCsv() {
  try {
    const imported = parseQuestionsCsv(ui.getCsvText());
    clearVictoryState();
    replaceQuestions(imported);
    renderBoard();
    ui.setImportMessage('Načteno 28 otázek. Herní plocha byla obnovena.', 'success');
    window.setTimeout(() => ui.closeImportDialog(), 550);
  } catch (error) {
    ui.setImportMessage(error instanceof Error ? error.message : 'CSV se nepodařilo načíst.', 'error');
  }
}

function downloadSampleCsv() {
  const blob = new Blob(['\uFEFF', createSampleCsv(sampleQuestions)], {
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'az-kviz-otazky.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindEvents() {
  ui.bindDialogCloseButtons();

  ui.els.openImportButton.addEventListener('click', () => {
    ui.setImportMessage('Aktuální hra se po úspěšném importu nahradí.');
    ui.openImportDialog();
  });

  ui.els.csvFileInput.addEventListener('change', async event => {
    const [file] = event.target.files;
    if (!file) return;

    try {
      ui.setCsvText(await readFileAsText(file));
      ui.setImportMessage(`Soubor „${file.name}“ byl vložen. Klikněte na Načíst otázky.`, 'success');
    } catch {
      ui.setImportMessage('Soubor se nepodařilo přečíst.', 'error');
    }
  });

  ui.els.loadSampleButton.addEventListener('click', () => {
    ui.setCsvText(createSampleCsv(sampleQuestions));
    ui.setImportMessage('Ukázkové otázky byly vloženy do textového pole.', 'success');
  });

  ui.els.downloadSampleButton?.addEventListener('click', downloadSampleCsv);
  ui.els.importButton.addEventListener('click', importCsv);
  ui.els.revealAnswerButton.addEventListener('click', revealAnswer);
  ui.els.resetBoardButton.addEventListener('click', resetBoard);
  ui.els.undoButton.addEventListener('click', undo);

  ui.els.victoryContinueButton.addEventListener('click', () => {
    ui.clearVictoryPresentation();
  });

  ui.els.victoryNewGameButton.addEventListener('click', startNewGameFromVictory);

  document.querySelectorAll('.yes-no-button').forEach(button => {
    button.addEventListener('click', () => handleYesNo(button.dataset.answer));
  });

  document.querySelectorAll('.color-button').forEach(button => {
    button.addEventListener('click', () => setColor(button.dataset.color));
  });

  ui.els.questionDialog.addEventListener('close', () => {
    ui.stopTimer();
    activeIndex = null;
    selectedYesNoAnswer = null;
  });
}

function init() {
  initGame(sampleQuestions);
  bindEvents();

  const savedVictory = checkWinner(getQuestions());
  if (savedVictory) {
    declaredWinner = savedVictory.color;
    victoryPath = savedVictory.path;
  }

  renderBoard();

  if (savedVictory) {
    ui.showSavedVictory(savedVictory.color);
  }
}

init();
