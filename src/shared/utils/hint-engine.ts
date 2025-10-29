import { SudokuGrid } from '../types/sudoku';
import {
    HintEngine as IHintEngine,
    BoardAnalysis,
    HintMove,
    MoveValidation,
    ErrorLocation,
    CandidateGrid,
    PlayerMove
} from '../types/hint-system';
import { SudokuValidator } from './sudoku';
import { CandidateCalculator } from './candidate-calculator';
import { SolvingTechniques, TechniquePriority } from './solving-techniques';

export class HintEngine implements IHintEngine {
    private techniques: SolvingTechniques;
    private readonly HINT_PENALTY_SECONDS = 20;

    constructor() {
        this.techniques = new SolvingTechniques();
    }

    /**
     * Analyze the current board state and return comprehensive analysis
     */
    analyzeBoard(grid: SudokuGrid): BoardAnalysis {
        // Calculate candidates for all empty cells
        const candidateGrid = CandidateCalculator.calculateAllCandidates(grid);

        // Find all available moves using different techniques
        const availableMoves = this.findAllAvailableMoves(grid, candidateGrid);

        // Detect any errors in the current state
        const errors = this.detectErrors(grid, candidateGrid);

        // Determine if the board is valid and solvable
        const isValid = SudokuValidator.isValidGrid(grid) && errors.length === 0;
        const isSolvable = isValid && (availableMoves.length > 0 || SudokuValidator.isSolved(grid));

        return {
            availableMoves,
            candidateGrid,
            errors,
            isValid,
            isSolvable
        };
    }

    /**
     * Find the next best move to suggest as a hint
     */
    findNextMove(grid: SudokuGrid): HintMove | null {
        const analysis = this.analyzeBoard(grid);

        if (analysis.errors.length > 0) {
            // If there are errors, don't suggest moves
            return null;
        }

        if (analysis.availableMoves.length === 0) {
            // No moves available
            return null;
        }

        // Sort moves by priority and return the best one
        const sortedMoves = TechniquePriority.sortMovesByPriority(analysis.availableMoves);
        return sortedMoves[0] || null;
    }

    /**
     * Get candidates for a specific cell
     */
    getCandidates(grid: SudokuGrid, row: number, col: number): number[] {
        const candidates = CandidateCalculator.calculateCellCandidates(grid, row, col);
        return Array.from(candidates).sort();
    }

    /**
     * Validate a potential move
     */
    validateMove(grid: SudokuGrid, row: number, col: number, value: number): MoveValidation {
        // Check if the move violates basic Sudoku rules
        const isValid = SudokuValidator.isValidMove(grid, row, col, value);

        if (!isValid) {
            return {
                isValid: false,
                violatesConstraints: true,
                errorType: this.determineConstraintViolationType(grid, row, col, value),
                errorMessage: this.generateConstraintErrorMessage(grid, row, col, value)
            };
        }

        // Check if the move would create a contradiction (no solution possible)
        const testGrid = this.createTestGrid(grid, row, col, value);
        const testAnalysis = this.analyzeBoard(testGrid);

        if (testAnalysis.errors.length > 0) {
            return {
                isValid: false,
                violatesConstraints: false,
                errorType: 'contradiction',
                errorMessage: 'This move would create a contradiction and make the puzzle unsolvable.'
            };
        }

        return {
            isValid: true,
            violatesConstraints: false
        };
    }

    /**
     * Detect errors in the current board state
     */
    detectErrors(grid: SudokuGrid, candidateGrid?: CandidateGrid): ErrorLocation[] {
        const errors: ErrorLocation[] = [];
        const candidates = candidateGrid || CandidateCalculator.calculateAllCandidates(grid);

        // Find cells with no candidates (impossible to fill)
        const emptyCells = CandidateCalculator.findCellsWithNoCandidates(candidates);
        for (const cell of emptyCells) {
            errors.push({
                row: cell.row,
                col: cell.col,
                type: 'no_solution',
                description: `Cell R${cell.row + 1}C${cell.col + 1} has no possible values.`,
                suggestedAction: 'Check recent moves for errors and consider undoing them.'
            });
        }

        // Check for constraint violations in filled cells
        for (let row = 0; row < grid.length; row++) {
            const currentRow = grid[row];
            if (!currentRow) continue;

            for (let col = 0; col < currentRow.length; col++) {
                const value = currentRow[col];
                if (value !== null && typeof value === 'number') {
                    // Temporarily remove the value and check if it would be valid to place
                    const testGrid = grid.map(r => [...r]);
                    if (testGrid[row]) {
                        testGrid[row]![col] = null;
                        if (!SudokuValidator.isValidMove(testGrid, row, col, value)) {
                            errors.push({
                                row,
                                col,
                                type: 'invalid_move',
                                description: `Value ${value} at R${row + 1}C${col + 1} violates Sudoku rules.`,
                                suggestedAction: 'This cell contains an invalid value and should be corrected.'
                            });
                        }
                    }
                }
            }
        }

        return errors;
    }

    /**
     * Update candidates after a player move
     */
    updateCandidates(grid: SudokuGrid, move: PlayerMove): CandidateGrid {
        const currentCandidates = CandidateCalculator.calculateAllCandidates(grid);
        return CandidateCalculator.updateCandidatesAfterMove(grid, currentCandidates, move);
    }

    /**
     * Get the hint penalty in seconds
     */
    getHintPenalty(): number {
        return this.HINT_PENALTY_SECONDS;
    }

    /**
     * Find all available moves using all techniques
     */
    private findAllAvailableMoves(grid: SudokuGrid, candidates: CandidateGrid): HintMove[] {
        const moves: HintMove[] = [];

        // Find naked singles
        const nakedSingles = this.techniques.findNakedSingles(grid, candidates);
        moves.push(...nakedSingles);

        // Find hidden singles
        const hiddenSingles = this.techniques.findHiddenSingles(grid, candidates);
        moves.push(...hiddenSingles);

        // Remove duplicates (same cell, same value)
        return this.removeDuplicateMoves(moves);
    }

    /**
     * Remove duplicate moves that target the same cell with the same value
     */
    private removeDuplicateMoves(moves: HintMove[]): HintMove[] {
        const seen = new Set<string>();
        const uniqueMoves: HintMove[] = [];

        for (const move of moves) {
            const key = `${move.row}-${move.col}-${move.value}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMoves.push(move);
            }
        }

        return uniqueMoves;
    }

    /**
     * Create a test grid with a move applied
     */
    private createTestGrid(grid: SudokuGrid, row: number, col: number, value: number): SudokuGrid {
        const testGrid = grid.map(r => [...r]);
        if (testGrid[row]) {
            testGrid[row]![col] = value;
        }
        return testGrid;
    }

    /**
     * Determine what type of constraint violation occurred
     */
    private determineConstraintViolationType(
        grid: SudokuGrid,
        row: number,
        col: number,
        value: number
    ): 'row' | 'column' | 'box' {
        // Check row violation
        const currentRow = grid[row];
        if (currentRow && currentRow.includes(value)) {
            return 'row';
        }

        // Check column violation
        for (let r = 0; r < grid.length; r++) {
            if (grid[r]?.[col] === value) {
                return 'column';
            }
        }

        // Must be box violation
        return 'box';
    }

    /**
     * Generate error message for constraint violations
     */
    private generateConstraintErrorMessage(
        grid: SudokuGrid,
        row: number,
        col: number,
        value: number
    ): string {
        const violationType = this.determineConstraintViolationType(grid, row, col, value);
        const cellName = `R${row + 1}C${col + 1}`;

        switch (violationType) {
            case 'row':
                return `${value} already appears in row ${row + 1}. Each number can only appear once per row.`;
            case 'column':
                return `${value} already appears in column ${col + 1}. Each number can only appear once per column.`;
            case 'box':
                const boxRow = Math.floor(row / 2) + 1;
                const boxCol = Math.floor(col / 3) + 1;
                return `${value} already appears in box ${boxRow}-${boxCol}. Each number can only appear once per box.`;
            default:
                return `${value} cannot be placed in ${cellName} due to Sudoku constraints.`;
        }
    }
}