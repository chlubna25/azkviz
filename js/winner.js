const BOARD_ROWS = 7;

function indexFor(row, column) {
  return row * (row + 1) / 2 + column;
}

function coordinatesFor(index) {
  let row = 0;
  while (index >= indexFor(row + 1, 0)) row += 1;
  return { row, column: index - indexFor(row, 0) };
}

function getNeighborIndices(index) {
  const { row, column } = coordinatesFor(index);
  const candidates = [
    [row, column - 1],
    [row, column + 1],
    [row - 1, column - 1],
    [row - 1, column],
    [row + 1, column],
    [row + 1, column + 1]
  ];

  return candidates
    .filter(([r, c]) => r >= 0 && r < BOARD_ROWS && c >= 0 && c <= r)
    .map(([r, c]) => indexFor(r, c));
}

function shortestPathBetweenSets(componentSet, starts, targets) {
  const queue = [];
  const visited = new Set();
  const parent = new Map();

  for (const start of starts) {
    if (!componentSet.has(start)) continue;
    queue.push(start);
    visited.add(start);
    parent.set(start, null);
    if (targets.has(start)) return [start];
  }

  while (queue.length > 0) {
    const current = queue.shift();

    for (const neighbor of getNeighborIndices(current)) {
      if (!componentSet.has(neighbor) || visited.has(neighbor)) continue;

      visited.add(neighbor);
      parent.set(neighbor, current);

      if (targets.has(neighbor)) {
        const path = [neighbor];
        let node = current;

        while (node !== null) {
          path.push(node);
          node = parent.get(node) ?? null;
        }

        return path.reverse();
      }

      queue.push(neighbor);
    }
  }

  return [];
}

function buildWinningPath(component) {
  const componentSet = new Set(component);

  const left = component.filter(index => {
    const { column } = coordinatesFor(index);
    return column === 0;
  });

  const right = component.filter(index => {
    const { row, column } = coordinatesFor(index);
    return column === row;
  });

  const bottom = component.filter(index => {
    const { row } = coordinatesFor(index);
    return row === BOARD_ROWS - 1;
  });

  const leftRightPath = shortestPathBetweenSets(componentSet, left, new Set(right));
  if (leftRightPath.length === 0) return component;

  const bottomToPath = shortestPathBetweenSets(componentSet, bottom, new Set(leftRightPath));
  if (bottomToPath.length === 0) return component;

  const ordered = [];
  const seen = new Set();

  for (const index of [...leftRightPath, ...bottomToPath]) {
    if (seen.has(index)) continue;
    seen.add(index);
    ordered.push(index);
  }

  return ordered;
}

function findWinnerForColor(questions, color) {
  const visited = new Set();

  for (let start = 0; start < questions.length; start += 1) {
    if (visited.has(start) || questions[start].status !== color) continue;

    const component = [];
    const queue = [start];
    visited.add(start);

    let touchesLeft = false;
    let touchesRight = false;
    let touchesBottom = false;

    while (queue.length > 0) {
      const current = queue.shift();
      component.push(current);

      const { row, column } = coordinatesFor(current);
      if (column === 0) touchesLeft = true;
      if (column === row) touchesRight = true;
      if (row === BOARD_ROWS - 1) touchesBottom = true;

      for (const neighbor of getNeighborIndices(current)) {
        if (visited.has(neighbor) || questions[neighbor].status !== color) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    if (touchesLeft && touchesRight && touchesBottom) {
      return {
        color,
        path: buildWinningPath(component)
      };
    }
  }

  return null;
}

export function checkWinner(questions) {
  return findWinnerForColor(questions, 'blue') || findWinnerForColor(questions, 'orange');
}
