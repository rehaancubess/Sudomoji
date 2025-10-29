import { SudokuGrid, GRID_SIZE, BOX_WIDTH, BOX_HEIGHT } from '../types/sudoku';
import { CandidateGrid, PlayerMove } from '../types/hint-system';

export class CandidateCalculator {
  /**
   * Calculate all possible candidates for each empty cell in the grid
   */
  static calculateAllCandidates(grid: SudokuGrid): CandidateGrid {
    const candidates: CandidateGrid = {};

    for (let row = 0; row < GRID_SIZE; row++) {
      candidates[row] = {};
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row]?.[col] === null) {
          candidates[row][col] = this.calculateCellCandidates(grid, row, col);
        } else {
          candidates[row][col] = new Set();
        }
      }
    }

    return candidates;
  }

  /**
   * Calculate possible candidates for a specific cell
   */
  static calculateCellCandidates(grid: SudokuGrid, row: number, col: number): Set<number> {
    if (grid[row]?.[col] !== null) {
      return new Set();
    }

    const candidates = new Set([1, 2, 3, 4, 5, 6]);

    // Remove values that appear in the same row
    const currentRow = grid[row];
    if (currentRow) {
      for (const value of currentRow) {
        if (value !== null) {
          candidates.delete(value);
        }
      }
    }

    // Remove values that appear in the same column
    for (let r = 0; r < GRID_SIZE; r++) {
      const value = grid[r]?.[col];
      if (value !== null) {
        candidates.delete(value);
      }
    }

    // Remove values that appear in the same box
    const boxRow = Math.floor(row / BOX_HEIGHT);
    const boxCol = Math.floor(col / BOX_WIDTH);
    const startRow = boxRow * BOX_HEIGHT;
    const startCol = boxCol * BOX_WIDTH;

    for (let r = startRow; r < startRow + BOX_HEIGHT; r++) {
      for (let c = startCol; c < startCol + BOX_WIDTH; c++) {
        const value = grid[r]?.[c];
        if (value !== null) {
          candidates.delete(value);
        }
      }
    }

    return candidates;
  }

  /**
   * Update candidates after a player move
   */
  static updateCandidatesAfterMove(
    grid: SudokuGrid,
    candidates: CandidateGrid,
    move: PlayerMove
  ): CandidateGrid {
    const newCandidates = this.deepCopyCandidates(candidates);

    if (move.value === null) {
      // Cell was cleared, recalculate candidates for this cell
      newCandidates[move.row][move.col] = this.calculateCellCandidates(grid, move.row, move.col);
      return newCandidates;
    }

    // Cell was filled, clear its candidates and update affected cells
    newCandidates[move.row][move.col] = new Set();

    // Remove the placed value from candidates in the same row
    for (let col = 0; col < GRID_SIZE; col++) {
      if (col !== move.col && newCandidates[move.row]?.[col]) {
        newCandidates[move.row][col].delete(move.value);
      }
    }

    // Remove the placed value from candidates in the same column
    for (let row = 0; row < GRID_SIZE; row++) {
      if (row !== move.row && newCandidates[row]?.[move.col]) {
        newCandidates[row][move.col].delete(move.value);
      }
    }

    // Remove the placed value from candidates in the same box
    const boxRow = Math.floor(move.row / BOX_HEIGHT);
    const boxCol = Math.floor(move.col / BOX_WIDTH);
    const startRow = boxRow * BOX_HEIGHT;
    const startCol = boxCol * BOX_WIDTH;

    for (let r = startRow; r < startRow + BOX_HEIGHT; r++) {
      for (let c = startCol; c < startCol + BOX_WIDTH; c++) {
        if ((r !== move.row || c !== move.col) && newCandidates[r]?.[c]) {
          newCandidates[r][c].delete(move.value);
        }
      }
    }

    return newCandidates;
  }

  /**
   * Find cells with no candidates (error condition)
   */
  static findCellsWithNoCandidates(candidates: CandidateGrid): Array<{ row: number; col: number }> {
    const emptyCells: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cellCandidates = candidates[row]?.[col];
        if (cellCandidates && cellCandidates.size === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    return emptyCells;
  }

  /**
   * Find cells with only one candidate (naked singles)
   */
  static findNakedSingles(candidates: CandidateGrid): Array<{
    row: number;
    col: number;
    value: number;
  }> {
    const nakedSingles: Array<{ row: number; col: number; value: number }> = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cellCandidates = candidates[row]?.[col];
        if (cellCandidates && cellCandidates.size === 1) {
          const value = Array.from(cellCandidates)[0];
          if (value !== undefined) {
            nakedSingles.push({ row, col, value });
          }
        }
      }
    }

    return nakedSingles;
  }

  /**
   * Find hidden singles in rows, columns, and boxes
   */
  static findHiddenSingles(
    grid: SudokuGrid,
    candidates: CandidateGrid
  ): Array<{
    row: number;
    col: number;
    value: number;
    unit: 'row' | 'column' | 'box';
  }> {
    const hiddenSingles: Array<{
      row: number;
      col: number;
      value: number;
      unit: 'row' | 'column' | 'box';
    }> = [];

    // Check rows
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let value = 1; value <= 6; value++) {
        const possibleCols: number[] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
          if (grid[row]?.[col] === null && candidates[row]?.[col]?.has(value)) {
            possibleCols.push(col);
          }
        }
        if (possibleCols.length === 1) {
          const col = possibleCols[0];
          if (col !== undefined) {
            hiddenSingles.push({ row, col, value, unit: 'row' });
          }
        }
      }
    }

    // Check columns
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let value = 1; value <= 6; value++) {
        const possibleRows: number[] = [];
        for (let row = 0; row < GRID_SIZE; row++) {
          if (grid[row]?.[col] === null && candidates[row]?.[col]?.has(value)) {
            possibleRows.push(row);
          }
        }
        if (possibleRows.length === 1) {
          const row = possibleRows[0];
          if (row !== undefined) {
            hiddenSingles.push({ row, col, value, unit: 'column' });
          }
        }
      }
    }

    // Check boxes
    for (let boxRow = 0; boxRow < GRID_SIZE / BOX_HEIGHT; boxRow++) {
      for (let boxCol = 0; boxCol < GRID_SIZE / BOX_WIDTH; boxCol++) {
        for (let value = 1; value <= 6; value++) {
          const possibleCells: Array<{ row: number; col: number }> = [];
          const startRow = boxRow * BOX_HEIGHT;
          const startCol = boxCol * BOX_WIDTH;

          for (let r = startRow; r < startRow + BOX_HEIGHT; r++) {
            for (let c = startCol; c < startCol + BOX_WIDTH; c++) {
              if (grid[r]?.[c] === null && candidates[r]?.[c]?.has(value)) {
                possibleCells.push({ row: r, col: c });
              }
            }
          }

          if (possibleCells.length === 1) {
            const cell = possibleCells[0];
            if (cell) {
              hiddenSingles.push({ 
                row: cell.row, 
                col: cell.col, 
                value, 
                unit: 'box' 
              });
            }
          }
        }
      }
    }

    return hiddenSingles;
  }

  /**
   * Eliminate candidates based on logical deduction
   */
  static eliminateCandidates(
    candidates: CandidateGrid,
    eliminations: Array<{ row: number; col: number; value: number }>
  ): CandidateGrid {
    const newCandidates = this.deepCopyCandidates(candidates);

    for (const elimination of eliminations) {
      const cellCandidates = newCandidates[elimination.row]?.[elimination.col];
      if (cellCandidates) {
        cellCandidates.delete(elimination.value);
      }
    }

    return newCandidates;
  }

  /**
   * Deep copy candidates grid
   */
  private static deepCopyCandidates(candidates: CandidateGrid): CandidateGrid {
    const copy: CandidateGrid = {};

    for (let row = 0; row < GRID_SIZE; row++) {
      copy[row] = {};
      for (let col = 0; col < GRID_SIZE; col++) {
        const cellCandidates = candidates[row]?.[col];
        if (cellCandidates) {
          copy[row][col] = new Set(cellCandidates);
        } else {
          copy[row][col] = new Set();
        }
      }
    }

    return copy;
  }

  /**
   * Check if candidates are consistent with the current grid state
   */
  static validateCandidates(grid: SudokuGrid, candidates: CandidateGrid): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row]?.[col] === null) {
          const expectedCandidates = this.calculateCellCandidates(grid, row, col);
          const actualCandidates = candidates[row]?.[col] || new Set();
          
          // Check if sets are equal
          if (expectedCandidates.size !== actualCandidates.size) {
            return false;
          }
          
          for (const candidate of expectedCandidates) {
            if (!actualCandidates.has(candidate)) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }
}