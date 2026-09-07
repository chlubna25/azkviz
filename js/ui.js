export const els = {
  board: document.querySelector('#board'),
  boardStatus: document.querySelector('#boardStatus'),
  tileTemplate: document.querySelector('#tileTemplate'),
  questionDialog: document.querySelector('#questionDialog'),
  questionType: document.querySelector('#questionType'),
  questionLabel: document.querySelector('#questionLabel'),
  questionText: document.querySelector('#questionText'),
  answerBox: document.querySelector('#answerBox'),
  answerText: document.querySelector('#answerText'),
  revealAnswerButton: document.querySelector('#revealAnswerButton'),
  colorChooser: document.querySelector('#colorChooser'),
  yesNoControls: document.querySelector('#yesNoControls'),
  yesNoResult: document.querySelector('#yesNoResult'),
  importDialog: document.querySelector('#importDialog'),
  openImportButton: document.querySelector('#openImportButton'),
  csvFileInput: document.querySelector('#csvFileInput'),
  csvText: document.querySelector('#csvText'),
  importButton: document.querySelector('#importButton'),
  loadSampleButton: document.querySelector('#loadSampleButton'),
  importMessage: document.querySelector('#importMessage'),
  resetBoardButton: document.querySelector('#resetBoardButton'),
  undoButton: document.querySelector('#undoButton'),
  blueCount: document.querySelector('#blueCount'),
  orangeCount: document.querySelector('#orangeCount'),
  blackCount: document.querySelector('#blackCount'),
  openCount: document.querySelector('#openCount'),
  timerBox: document.querySelector('#timerBox'),
  timerValue: document.querySelector('#timerValue'),
  timerProgress: document.querySelector('#timerProgress'),
  downloadSampleButton: document.querySelector('#downloadSampleButton'),
  victoryOverlay: document.querySelector('#victoryOverlay'),
  victoryTitle: document.querySelector('#victoryTitle'),
  victoryContinueButton: document.querySelector('#victoryContinueButton'),
  victoryNewGameButton: document.querySelector('#victoryNewGameButton'),
  confettiLayer: document.querySelector('#confettiLayer')
};

let timerInterval = null;
let timerRemaining = 30;
let victoryTimeout = null;

function statusLabel(status) {
  return ({
    open: 'neobsazené',
    blue: 'modré',
    orange: 'oranžové',
    black: 'černé'
  })[status] ?? 'neobsazené';
}

export function renderBoard(questions, victoryPath, onTileClick) {
  els.board.innerHTML = '';
  let index = 0;

  for (let rowLength = 1; rowLength <= 7; rowLength += 1) {
    const row = document.createElement('div');
    row.className = 'board-row';

    for (let column = 0; column < rowLength; column += 1) {
      const question = questions[index];
      const fragment = els.tileTemplate.content.cloneNode(true);
      const button = fragment.querySelector('.hex-tile');
      const label = fragment.querySelector('.tile-label');
      const tileIndex = index;

      button.dataset.index = String(tileIndex);
      button.dataset.status = question.status ?? 'open';

      const victoryOrder = victoryPath.indexOf(tileIndex);
      if (victoryOrder >= 0) {
        button.classList.add('winning-tile');
        button.style.setProperty('--win-delay', `${300 + victoryOrder * 90}ms`);
      }

      button.setAttribute('aria-label', `Pole ${question.label}: ${statusLabel(question.status)}`);
      label.textContent = question.label;
      button.addEventListener('click', () => onTileClick(tileIndex));
      row.appendChild(fragment);
      index += 1;
    }

    els.board.appendChild(row);
  }

  updateStats(questions);
}

export function updateStats(questions) {
  const counts = { blue: 0, orange: 0, black: 0, open: 0 };

  for (const question of questions) {
    if (question.status in counts) counts[question.status] += 1;
  }

  els.blueCount.textContent = counts.blue;
  els.orangeCount.textContent = counts.orange;
  els.blackCount.textContent = counts.black;
  els.openCount.textContent = counts.open;
  els.boardStatus.textContent = counts.black > 0
    ? `Ve hře je ${counts.black} černých polí připravených na otázku ANO/NE.`
    : 'Kliknutím na pole otevřete otázku.';
}

export function setBoardStatus(message) {
  els.boardStatus.textContent = message;
}

export function setUndoEnabled(enabled) {
  els.undoButton.disabled = !enabled;
}

export function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
    dialog.classList.add('dialog-fallback-open');
  }
}

export function closeDialog(dialog) {
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
    dialog.classList.remove('dialog-fallback-open');
    dialog.dispatchEvent(new Event('close'));
  }
}

export function openImportDialog() {
  openDialog(els.importDialog);
}

export function closeImportDialog() {
  closeDialog(els.importDialog);
}

export function closeQuestionDialog() {
  closeDialog(els.questionDialog);
}

export function setImportMessage(message, type = '') {
  els.importMessage.textContent = message;
  els.importMessage.className = `form-message ${type || 'muted'}`;
}

export function setCsvText(text) {
  els.csvText.value = text;
}

export function getCsvText() {
  return els.csvText.value;
}

export function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  els.timerValue.textContent = timerRemaining > 0 ? `${timerRemaining} s` : 'Čas vypršel';
  els.timerProgress.style.width = `${Math.max(0, timerRemaining) / 30 * 100}%`;
  els.timerBox.classList.toggle('expired', timerRemaining <= 0);
}

export function startTimer() {
  stopTimer();
  timerRemaining = 30;
  updateTimerDisplay();

  timerInterval = window.setInterval(() => {
    timerRemaining -= 1;
    updateTimerDisplay();
    if (timerRemaining <= 0) stopTimer();
  }, 1000);
}

export function openQuestion(question, isBlackRound) {
  els.questionLabel.textContent = `Pole ${question.label}`;
  els.questionType.textContent = isBlackRound ? 'Černá otázka · ANO/NE' : 'Hlavní otázka';
  els.questionText.textContent = isBlackRound
    ? (question.yesNoQuestion || 'Pro toto pole není v CSV vyplněna otázka ANO/NE.')
    : question.question;
  els.answerText.textContent = isBlackRound
    ? (question.yesNoAnswer || 'Není uvedena')
    : question.answer;

  els.answerBox.classList.add('hidden');
  els.colorChooser.classList.add('hidden');
  els.yesNoResult.classList.add('hidden');
  els.yesNoResult.classList.remove('correct', 'incorrect');
  els.yesNoResult.textContent = '';

  if (isBlackRound && question.yesNoQuestion && question.yesNoAnswer) {
    els.yesNoControls.classList.remove('hidden');
    els.revealAnswerButton.classList.add('hidden');
    document.querySelectorAll('.yes-no-button').forEach(button => button.classList.remove('selected'));
  } else {
    els.yesNoControls.classList.add('hidden');
    els.revealAnswerButton.classList.remove('hidden');
    els.revealAnswerButton.textContent = isBlackRound
      ? 'Pokračovat k výběru barvy'
      : 'Zobrazit odpověď';
  }

  startTimer();
  openDialog(els.questionDialog);
}

export function revealAnswer() {
  stopTimer();
  els.answerBox.classList.remove('hidden');
  els.colorChooser.classList.remove('hidden');
  els.revealAnswerButton.classList.add('hidden');
}

export function showYesNoResult(selectedAnswer, correctAnswer) {
  stopTimer();

  document.querySelectorAll('.yes-no-button').forEach(button => {
    button.classList.toggle('selected', button.dataset.answer === selectedAnswer);
  });

  const correct = correctAnswer === selectedAnswer;
  els.yesNoResult.textContent = correct
    ? `Správně. Odpověď je ${correctAnswer}.`
    : `Nesprávně. Správná odpověď je ${correctAnswer}.`;
  els.yesNoResult.classList.remove('hidden', 'correct', 'incorrect');
  els.yesNoResult.classList.add(correct ? 'correct' : 'incorrect');
  els.answerText.textContent = correctAnswer;
  els.answerBox.classList.remove('hidden');
  els.colorChooser.classList.remove('hidden');
}

export function clearVictoryPresentation() {
  if (victoryTimeout !== null) {
    clearTimeout(victoryTimeout);
    victoryTimeout = null;
  }

  els.victoryOverlay.classList.add('hidden');
  els.victoryOverlay.dataset.winner = '';
  els.confettiLayer.innerHTML = '';
}

function createConfetti(winner) {
  els.confettiLayer.innerHTML = '';

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const colors = winner === 'blue'
    ? ['#1877d2', '#65b5ff', '#ffffff', '#d7ecff']
    : ['#ef7a19', '#ffad65', '#ffffff', '#ffe1c7'];

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 300; i += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';

    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--w', `${6 + Math.random() * 7}px`);
    piece.style.setProperty('--h', `${9 + Math.random() * 12}px`);
    piece.style.setProperty('--rotation', `${Math.random() * 360}deg`);
    piece.style.setProperty('--duration', `${2.1 + Math.random() * 1.5}s`);
    piece.style.setProperty('--delay', `${Math.random() * 2.45}s`);
    piece.style.setProperty('--drift', `${-120 + Math.random() * 240}px`);
    piece.style.setProperty('--confetti-color', colors[Math.floor(Math.random() * colors.length)]);

    fragment.appendChild(piece);
  }

  els.confettiLayer.appendChild(fragment);

  window.setTimeout(() => {
    els.confettiLayer.innerHTML = '';
  }, 42000);
}

export function showVictory(victory) {
  const teamName = victory.color === 'blue' ? 'MODRÝ TÝM' : 'ORANŽOVÝ TÝM';
  els.victoryTitle.textContent = `${teamName} VÍTĚZÍ!`;
  els.victoryOverlay.dataset.winner = victory.color;
  els.boardStatus.textContent = `${teamName} zvítězil propojením všech tří stran.`;

  const pathAnimationTime = Math.min(1500, 700 + victory.path.length * 90);

  victoryTimeout = window.setTimeout(() => {
    createConfetti(victory.color);
    els.victoryOverlay.classList.remove('hidden');
    victoryTimeout = null;
  }, pathAnimationTime);
}

export function showSavedVictory(color) {
  const teamName = color === 'blue' ? 'MODRÝ TÝM' : 'ORANŽOVÝ TÝM';
  els.boardStatus.textContent = `${teamName} už má vítězné propojení všech tří stran.`;
}

export function bindDialogCloseButtons() {
  document.querySelectorAll('.icon-button').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const dialog = button.closest('dialog');
      if (dialog) closeDialog(dialog);
    });
  });
}
