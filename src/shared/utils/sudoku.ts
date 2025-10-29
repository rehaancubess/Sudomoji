import { SudokuGrid, GRID_SIZE, BOX_WIDTH, BOX_HEIGHT } from '../types/sudoku';

export class SudokuValidator {
  static isValidGrid(grid: SudokuGrid): boolean {
    // Check if grid is 6x6
    if (grid.length !== GRID_SIZE || grid.some((row) => row?.length !== GRID_SIZE)) {
      return false;
    }

    // Check rows
    for (let row = 0; row < GRID_SIZE; row++) {
      const currentRow = grid[row];
      if (!currentRow || !this.isValidUnit(currentRow)) return false;
    }

    // Check columns
    for (let col = 0; col < GRID_SIZE; col++) {
      const column = grid.map((row) => row?.[col]).filter((cell) => cell !== undefined) as (
        | number
        | null
      )[];
      if (!this.isValidUnit(column)) return false;
    }

    // Check 3x2 boxes
    for (let boxRow = 0; boxRow < GRID_SIZE / BOX_HEIGHT; boxRow++) {
      for (let boxCol = 0; boxCol < GRID_SIZE / BOX_WIDTH; boxCol++) {
        const box = this.getBox(grid, boxRow, boxCol);
        if (!this.isValidUnit(box)) return false;
      }
    }

    return true;
  }

  static isValidMove(grid: SudokuGrid, row: number, col: number, value: number): boolean {
    if (value < 1 || value > 6) return false;

    // Create a copy and test the move
    const testGrid = grid.map((r) => [...r]);
    const targetRow = testGrid[row];
    if (!targetRow) return false;
    targetRow[col] = value;

    // Check row
    const rowValues = targetRow.filter((v) => v !== null);
    if (new Set(rowValues).size !== rowValues.length) return false;

    // Check column
    const colValues = testGrid.map((r) => r?.[col]).filter((v) => v !== null && v !== undefined);
    if (new Set(colValues).size !== colValues.length) return false;

    // Check box
    const boxRow = Math.floor(row / BOX_HEIGHT);
    const boxCol = Math.floor(col / BOX_WIDTH);
    const boxValues = this.getBox(testGrid, boxRow, boxCol).filter((v) => v !== null);
    if (new Set(boxValues).size !== boxValues.length) return false;

    return true;
  }

  static isSolved(grid: SudokuGrid): boolean {
    // Check if all cells are filled
    for (let row = 0; row < GRID_SIZE; row++) {
      const currentRow = grid[row];
      if (!currentRow) return false;
      for (let col = 0; col < GRID_SIZE; col++) {
        if (currentRow[col] === null) return false;
      }
    }

    return this.isValidGrid(grid);
  }

  private static isValidUnit(unit: (number | null)[]): boolean {
    const values = unit.filter((v) => v !== null) as number[];
    return new Set(values).size === values.length;
  }

  private static getBox(grid: SudokuGrid, boxRow: number, boxCol: number): (number | null)[] {
    const box: (number | null)[] = [];
    const startRow = boxRow * BOX_HEIGHT;
    const startCol = boxCol * BOX_WIDTH;

    for (let row = startRow; row < startRow + BOX_HEIGHT; row++) {
      const currentRow = grid[row];
      if (currentRow) {
        for (let col = startCol; col < startCol + BOX_WIDTH; col++) {
          const cell = currentRow[col];
          if (cell !== undefined) {
            box.push(cell);
          }
        }
      }
    }

    return box;
  }
}

export class SudokuGenerator {
  static generatePuzzle(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): {
    puzzle: SudokuGrid;
    solution: SudokuGrid;
  } {
    let attempts = 0;
    const maxAttempts = 15; // Increased attempts for better quality

    console.log(`[GENERATOR] Starting puzzle generation with ${difficulty} difficulty`);

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[GENERATOR] Generation attempt ${attempts}/${maxAttempts}`);

      // Step 1: Generate a complete solution first
      const solution = this.generateCompleteSolution();
      if (!solution) {
        console.warn(`[GENERATOR] Failed to generate complete solution on attempt ${attempts}`);
        continue;
      }

      // Step 2: Create puzzle by removing cells with guided validation
      const puzzle = this.createGuidedPuzzle(solution, difficulty) || this.createValidPuzzle(solution, difficulty);
      
      if (puzzle && this.hasUniqueSolution(puzzle, solution) && hasNextLogicalMove(puzzle)) {
        const filledCells = puzzle.flat().filter(cell => cell !== null).length;
        const emptyCells = GRID_SIZE * GRID_SIZE - filledCells;
        console.log(`[GENERATOR] Successfully generated ${difficulty} puzzle on attempt ${attempts}`);
        console.log(`[GENERATOR] Puzzle stats: ${filledCells} clues, ${emptyCells} empty cells`);
        return { puzzle, solution };
      }
      
      console.log(`[GENERATOR] Attempt ${attempts} failed validation checks`);
    }

    // Fallback: generate a simpler puzzle if we can't create a valid one
    console.warn(`[GENERATOR] Could not generate valid puzzle after ${maxAttempts} attempts, using fallback`);
    return this.generateFallbackPuzzle(difficulty);
  }

  private static generateCompleteSolution(): SudokuGrid {
    // Create empty grid
    const grid: SudokuGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));

    // Fill the grid using backtracking
    this.fillGrid(grid);

    return grid;
  }

  private static fillGrid(grid: SudokuGrid): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      const currentRow = grid[row];
      if (!currentRow) continue;

      for (let col = 0; col < GRID_SIZE; col++) {
        if (currentRow[col] === null) {
          // Try numbers 1-6 in random order
          const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6]);

          for (const num of numbers) {
            if (SudokuValidator.isValidMove(grid, row, col, num)) {
              currentRow[col] = num;

              if (this.fillGrid(grid)) {
                return true;
              }

              currentRow[col] = null;
            }
          }

          return false;
        }
      }
    }

    return true;
  }

  private static removeCells(solution: SudokuGrid, cellsToRemove: number): SudokuGrid {
    const puzzle = solution.map((row) => [...row]);
    const positions: [number, number][] = [];

    // Create list of all positions
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        positions.push([row, col]);
      }
    }

    // Shuffle positions and remove cells
    const shuffledPositions = this.shuffleArray(positions);
    for (let i = 0; i < cellsToRemove && i < shuffledPositions.length; i++) {
      const position = shuffledPositions[i];
      if (position) {
        const [row, col] = position;
        const targetRow = puzzle[row];
        if (targetRow) {
          targetRow[col] = null;
        }
      }
    }

    return puzzle;
  }

  private static getCellsToRemove(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return 18; // Remove ~50% of cells (18 clues remaining) - Easy
      case 'medium':
        return 22; // Remove ~61% of cells (14 clues remaining) - Medium
      case 'hard':
        return 26; // Remove ~72% of cells (10 clues remaining) - Hard
      default:
        return 22; // Default to medium setting
    }
  }

  // Enhanced puzzle creation with guided removal to ensure logical progression
  private static createGuidedPuzzle(solution: SudokuGrid, difficulty: 'easy' | 'medium' | 'hard'): SudokuGrid | null {
    const puzzle = solution.map(row => [...row]);
    const positions: [number, number][] = [];

    // Create list of all positions
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        positions.push([row, col]);
      }
    }

    const targetCells = this.getCellsToRemove(difficulty);
    let removedCells = 0;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 10;

    // Multiple passes to ensure we get a good puzzle
    for (let pass = 0; pass < 3 && removedCells < targetCells; pass++) {
      const shuffledPositions = this.shuffleArray([...positions]);
      
      for (const [row, col] of shuffledPositions) {
        if (removedCells >= targetCells) break;
        if (consecutiveFailures >= maxConsecutiveFailures) break;

        const targetRow = puzzle[row];
        if (!targetRow || targetRow[col] === null) continue;
        
        const originalValue = targetRow[col];
        if (originalValue === null || originalValue === undefined) continue;

        // Temporarily remove the cell
        targetRow[col] = null;

        // Check all conditions: uniqueness, logical move availability, and minimum clues
        const hasUnique = this.hasUniqueSolution(puzzle, solution);
        const hasLogical = hasNextLogicalMove(puzzle);
        const filledCells = puzzle.flat().filter(cell => cell !== null).length;
        const meetsMinimum = filledCells >= this.getMinimumClues(difficulty);

        if (hasUnique && hasLogical && meetsMinimum) {
          removedCells++;
          consecutiveFailures = 0;
          console.log(`[GENERATOR] Successfully removed cell (${row},${col}), ${removedCells}/${targetCells} removed`);
        } else {
          // Restore the cell
          targetRow[col] = originalValue;
          consecutiveFailures++;
        }
      }
    }

    // Final validation
    if (!hasNextLogicalMove(puzzle)) {
      console.warn(`[GENERATOR] Guided puzzle creation failed - no logical next move`);
      return null;
    }

    const finalFilledCells = puzzle.flat().filter(cell => cell !== null).length;
    console.log(`[GENERATOR] Guided puzzle created: ${finalFilledCells} clues, removed ${removedCells} cells`);
    return puzzle;
  }

  private static createValidPuzzle(solution: SudokuGrid, difficulty: 'easy' | 'medium' | 'hard'): SudokuGrid | null {
    const puzzle = solution.map(row => [...row]);
    const positions: [number, number][] = [];

    // Create list of all positions
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        positions.push([row, col]);
      }
    }

    // Shuffle positions for random removal
    const shuffledPositions = this.shuffleArray(positions);
    const targetCells = this.getCellsToRemove(difficulty);
    let removedCells = 0;

    // Remove cells one by one, checking uniqueness AND logical move availability
    for (const [row, col] of shuffledPositions) {
      if (removedCells >= targetCells) break;

      const targetRow = puzzle[row];
      if (!targetRow) continue;
      
      const originalValue = targetRow[col];
      if (originalValue === null || originalValue === undefined) continue;

      // Temporarily remove the cell
      targetRow[col] = null;

      // Check if puzzle still has unique solution AND has at least one logical next move
      if (this.hasUniqueSolution(puzzle, solution) && hasNextLogicalMove(puzzle)) {
        removedCells++;
      } else {
        // Restore the cell if removing it breaks uniqueness or logical progression
        targetRow[col] = originalValue;
      }
    }

    // Ensure we have a minimum number of clues for solvability
    const filledCells = puzzle.flat().filter(cell => cell !== null).length;
    const minClues = this.getMinimumClues(difficulty);
    
    if (filledCells < minClues) {
      return null; // Not enough clues, try again
    }

    // Final validation: ensure the puzzle has at least one logical next move
    if (!hasNextLogicalMove(puzzle)) {
      return null; // No logical next move available
    }

    return puzzle;
  }

  static hasUniqueSolution(puzzle: SudokuGrid, expectedSolution: SudokuGrid): boolean {
    const solutions = this.findAllSolutions(puzzle, 2); // Stop after finding 2 solutions
    
    if (solutions.length !== 1) {
      return false;
    }

    // Verify the found solution matches our expected solution
    return JSON.stringify(solutions[0]) === JSON.stringify(expectedSolution);
  }

  private static findAllSolutions(puzzle: SudokuGrid, maxSolutions: number = 2): SudokuGrid[] {
    const solutions: SudokuGrid[] = [];
    const grid = puzzle.map(row => [...row]);

    const solve = (row: number, col: number): void => {
      if (solutions.length >= maxSolutions) return;

      if (row === GRID_SIZE) {
        solutions.push(grid.map(r => [...r]));
        return;
      }

      const nextRow = col === GRID_SIZE - 1 ? row + 1 : row;
      const nextCol = col === GRID_SIZE - 1 ? 0 : col + 1;

      const currentRow = grid[row];
      if (!currentRow) return;

      if (currentRow[col] !== null) {
        solve(nextRow, nextCol);
        return;
      }

      for (let num = 1; num <= 6; num++) {
        if (SudokuValidator.isValidMove(grid, row, col, num)) {
          currentRow[col] = num;
          solve(nextRow, nextCol);
          currentRow[col] = null;
        }
      }
    };

    solve(0, 0);
    return solutions;
  }

  private static getMinimumClues(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return 16; // At least 16 clues for easy
      case 'medium':
        return 12; // At least 12 clues for medium  
      case 'hard':
        return 8; // At least 8 clues for hard - very challenging
      default:
        return 12; // Default to medium
    }
  }

  private static generateFallbackPuzzle(difficulty: 'easy' | 'medium' | 'hard'): {
    puzzle: SudokuGrid;
    solution: SudokuGrid;
  } {
    console.log(`[GENERATOR] Generating fallback puzzle for ${difficulty} difficulty`);
    
    // Generate a simple, guaranteed solvable puzzle
    const solution = this.generateCompleteSolution();
    
    // Use a more conservative approach for fallback - fewer cells removed
    const conservativeCellsToRemove = Math.max(1, this.getCellsToRemove(difficulty) - 4);
    let puzzle = this.removeCells(solution, conservativeCellsToRemove);
    
    // Ensure fallback puzzle has at least one logical move
    let fallbackAttempts = 0;
    while (!hasNextLogicalMove(puzzle) && fallbackAttempts < 5) {
      fallbackAttempts++;
      console.log(`[GENERATOR] Fallback attempt ${fallbackAttempts} - adjusting cell removal`);
      const adjustedCellsToRemove = Math.max(1, conservativeCellsToRemove - fallbackAttempts);
      puzzle = this.removeCells(solution, adjustedCellsToRemove);
    }
    
    const filledCells = puzzle.flat().filter(cell => cell !== null).length;
    const emptyCells = GRID_SIZE * GRID_SIZE - filledCells;
    console.log(`[GENERATOR] Fallback puzzle generated: ${filledCells} clues, ${emptyCells} empty cells`);
    console.log(`[GENERATOR] Fallback has logical next move: ${hasNextLogicalMove(puzzle)}`);
    
    return { puzzle, solution };
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      const swapItem = shuffled[j];
      if (temp !== undefined && swapItem !== undefined) {
        shuffled[i] = swapItem;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  }

  // Single-move validation methods
  static findAvailableMoves(grid: SudokuGrid): Array<{row: number, col: number, value: number}> {
    const moves: Array<{row: number, col: number, value: number}> = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      const currentRow = grid[row];
      if (!currentRow) continue;
      
      for (let col = 0; col < GRID_SIZE; col++) {
        if (currentRow[col] === null) {
          for (let value = 1; value <= 6; value++) {
            if (SudokuValidator.isValidMove(grid, row, col, value)) {
              moves.push({ row, col, value });
            }
          }
        }
      }
    }
    
    return moves;
  }

  static validateSingleMove(grid: SudokuGrid): boolean {
    const availableMoves = this.findAvailableMoves(grid);
    return availableMoves.length === 1;
  }

  static ensureSingleMoveProgression(puzzle: SudokuGrid): boolean {
    const testGrid = puzzle.map(row => [...row]);
    let stepCount = 0;
    const maxSteps = 36; // Maximum possible steps for 6x6 grid
    
    // Simulate solving the puzzle step by step
    while (!SudokuValidator.isSolved(testGrid)) {
      stepCount++;
      
      // Prevent infinite loops
      if (stepCount > maxSteps) {
        console.warn('Single-move validation exceeded maximum steps');
        return false;
      }
      
      const availableMoves = this.findAvailableMoves(testGrid);
      
      if (availableMoves.length === 0) {
        console.warn('No moves available during single-move validation');
        return false; // No moves available - invalid puzzle
      }
      
      if (availableMoves.length > 1) {
        return false; // Multiple moves available - not single-move
      }
      
      // Apply the single available move
      const move = availableMoves[0];
      if (move) {
        const targetRow = testGrid[move.row];
        if (targetRow) {
          targetRow[move.col] = move.value;
        }
      }
    }
    
    return true; // Successfully solved with single moves only
  }

  static countAvailableMoves(grid: SudokuGrid): number {
    return this.findAvailableMoves(grid).length;
  }

  static hasValidMoves(grid: SudokuGrid): boolean {
    return this.findAvailableMoves(grid).length > 0;
  }
}

export const convertGridToEmojis = (grid: SudokuGrid, emojis: string[]): (string | null)[][] => {
  return grid.map(
    (row) => row?.map((cell) => (cell === null ? null : emojis[cell - 1] || null)) || []
  );
};

export const convertEmojisToGrid = (
  emojiGrid: (string | null)[][],
  emojis: string[]
): SudokuGrid => {
  return emojiGrid.map(
    (row) =>
      row?.map((cell) => {
        if (cell === null) return null;
        const index = emojis.indexOf(cell);
        return index === -1 ? null : index + 1;
      }) || []
  );
};

// Logical-Move Validation Helper
export function hasNextLogicalMove(grid: SudokuGrid): boolean {
  const size = grid.length;
  // For 6x6 Sudoku, we have 3x2 boxes (BOX_WIDTH=3, BOX_HEIGHT=2)
  const boxWidth = BOX_WIDTH;
  const boxHeight = BOX_HEIGHT;

  const getCandidates = (r: number, c: number): number[] => {
    const currentRow = grid[r];
    if (!currentRow || (currentRow[c] !== null && currentRow[c] !== 0)) return [];

    const candidates = new Set(Array.from({ length: size }, (_, i) => i + 1));
    
    // Remove row conflicts
    for (let i = 0; i < size; i++) {
      const cellValue = currentRow[i];
      if (typeof cellValue === 'number' && cellValue !== 0) {
        candidates.delete(cellValue);
      }
    }
    
    // Remove column conflicts
    for (let i = 0; i < size; i++) {
      const cellValue = grid[i]?.[c];
      if (typeof cellValue === 'number' && cellValue !== 0) {
        candidates.delete(cellValue);
      }
    }

    // Remove box conflicts
    const br = Math.floor(r / boxHeight) * boxHeight;
    const bc = Math.floor(c / boxWidth) * boxWidth;
    for (let i = 0; i < boxHeight; i++) {
      for (let j = 0; j < boxWidth; j++) {
        const cellValue = grid[br + i]?.[bc + j];
        if (typeof cellValue === 'number' && cellValue !== 0) {
          candidates.delete(cellValue);
        }
      }
    }

    return Array.from(candidates);
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const candidates = getCandidates(r, c);
      if (candidates.length === 1) return true; // guaranteed next move
    }
  }

  return false;
}

// Test method to validate puzzle generation quality
export function testPuzzleGeneration(difficulty: 'easy' | 'medium' | 'hard' = 'hard', count: number = 5): void {
  console.log(`[TEST] Testing ${count} puzzle generations with ${difficulty} difficulty`);
  
  for (let i = 1; i <= count; i++) {
    console.log(`[TEST] Generating puzzle ${i}/${count}...`);
    const start = Date.now();
    const { puzzle, solution } = SudokuGenerator.generatePuzzle(difficulty);
    const duration = Date.now() - start;
    
    const filledCells = puzzle.flat().filter(cell => cell !== null).length;
    const emptyCells = GRID_SIZE * GRID_SIZE - filledCells;
    const hasLogicalMove = hasNextLogicalMove(puzzle);
    const isUnique = SudokuGenerator.hasUniqueSolution(puzzle, solution);
    
    console.log(`[TEST] Puzzle ${i} results:`);
    console.log(`  - Generation time: ${duration}ms`);
    console.log(`  - Clues: ${filledCells}, Empty: ${emptyCells}`);
    console.log(`  - Has logical next move: ${hasLogicalMove}`);
    console.log(`  - Has unique solution: ${isUnique}`);
    console.log(`  - Quality: ${hasLogicalMove && isUnique ? '✅ GOOD' : '❌ POOR'}`);
  }
}
