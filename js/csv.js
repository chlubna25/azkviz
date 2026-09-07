import { LETTERS } from '../data/sample-questions.js';

function csvEscape(value, delimiter = ';') {
  const text = String(value ?? '');
  return /["\n\r;,]/.test(text) || text.includes(delimiter)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

export function createSampleCsv(sampleQuestions) {
  const header = ['label', 'question', 'answer', 'yes_no_question', 'yes_no_answer'];
  const lines = [header.join(';')];

  for (const question of sampleQuestions) {
    lines.push([
      question.label,
      question.question,
      question.answer,
      question.yesNoQuestion,
      question.yesNoAnswer
    ].map(value => csvEscape(value)).join(';'));
  }

  return lines.join('\n');
}

function detectDelimiter(firstLine) {
  const candidates = [';', ',', '\t'];
  let best = ';';
  let bestCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let inQuotes = false;

    for (let i = 0; i < firstLine.length; i += 1) {
      if (firstLine[i] === '"') inQuotes = !inQuotes;
      else if (!inQuotes && firstLine[i] === candidate) count += 1;
    }

    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (!normalized) throw new Error('CSV je prázdné.');

  const delimiter = detectDelimiter(normalized.split(/\r?\n/, 1)[0]);
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (inQuotes) throw new Error('CSV obsahuje neuzavřené uvozovky.');

  row.push(value.trim());
  if (row.some(cell => cell !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('CSV musí obsahovat hlavičku a alespoň jeden řádek otázky.');

  return rows;
}

function normalizeHeader(header) {
  return header
    .trim()
    .toLocaleLowerCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findColumn(headers, aliases) {
  return headers.findIndex(header => aliases.includes(header));
}

export function normalizeYesNo(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLocaleUpperCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (['ANO', 'A', 'YES', 'TRUE', '1'].includes(normalized)) return 'ANO';
  if (['NE', 'N', 'NO', 'FALSE', '0'].includes(normalized)) return 'NE';
  return normalized;
}

function rowsToQuestions(rows) {
  const headers = rows[0].map(normalizeHeader);
  const labelIndex = findColumn(headers, ['label', 'pismeno', 'oznaceni', 'id']);
  const questionIndex = findColumn(headers, ['question', 'otazka', 'hlavni_otazka']);
  const answerIndex = findColumn(headers, ['answer', 'odpoved', 'spravna_odpoved']);
  const yesNoQuestionIndex = findColumn(headers, ['yes_no_question', 'ano_ne_otazka', 'cerna_otazka', 'black_question']);
  const yesNoAnswerIndex = findColumn(headers, ['yes_no_answer', 'ano_ne_odpoved', 'cerna_odpoved', 'black_answer']);

  if (questionIndex < 0 || answerIndex < 0) {
    throw new Error('Chybí povinné sloupce question/otazka a answer/odpoved.');
  }

  const dataRows = rows.slice(1).filter(row => row.some(cell => String(cell).trim() !== ''));
  if (dataRows.length !== 28) {
    throw new Error(`AZ plocha potřebuje přesně 28 otázek. CSV nyní obsahuje ${dataRows.length}.`);
  }

  return dataRows.map((row, index) => {
    const question = String(row[questionIndex] ?? '').trim();
    const answer = String(row[answerIndex] ?? '').trim();
    const yesNoQuestion = yesNoQuestionIndex >= 0 ? String(row[yesNoQuestionIndex] ?? '').trim() : '';
    const yesNoAnswerRaw = yesNoAnswerIndex >= 0 ? String(row[yesNoAnswerIndex] ?? '').trim() : '';
    const yesNoAnswer = normalizeYesNo(yesNoAnswerRaw);

    if (!question || !answer) {
      throw new Error(`Řádek ${index + 2}: otázka i odpověď musí být vyplněné.`);
    }

    if ((yesNoQuestion && !['ANO', 'NE'].includes(yesNoAnswer)) || (!yesNoQuestion && yesNoAnswerRaw)) {
      throw new Error(`Řádek ${index + 2}: odpověď ANO/NE musí být ANO nebo NE a musí mít odpovídající otázku.`);
    }

    return {
      id: index + 1,
      label: String(labelIndex >= 0 ? row[labelIndex] : '').trim() || LETTERS[index],
      question,
      answer,
      yesNoQuestion,
      yesNoAnswer,
      status: 'open'
    };
  });
}

export function parseQuestionsCsv(text) {
  return rowsToQuestions(parseCsv(text));
}

export function readFileAsText(file) {
  if (typeof file.text === 'function') return file.text();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}
