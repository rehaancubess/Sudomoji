import { SudokuGrid, GRID_SIZE } from '../types/sudoku';
import { 
  PathValidatedGenerator as IPathValidatedGenerator,
  ValidatedPuzzle,
  MoveTrail,
  SolvingTechnique,
  PuzzleMetadata
} from '../types/hint-system';
import { SudokuGenerator } from './sudoku';
import { HintEngine } from './hint-engine';
import { TechniquePriority } from './solving-techniques';

export class PathValidatedGenerator implements IPathValidatedGenerator {
  private hintEngine: HintEngine;
  private maxRetries: number = 50;
  private minMovesRequired: number = 2;

  constructor() {
    this.hintEngine = new HintEngine();
  }

  /**
   * Generate a puzzle that meets all validation requirements
   */
  generatePuzzle(theme?: string): ValidatedPuzzle {
    let attempts = 0;
    
    while (attempts < this.maxRetries) {
      try {
        // Generate a base puzzle using existing generator
        const basePuzzle = SudokuGenerator.generatePuzzle('easy');
        
        // Validate that it meets our requirements
        if (this.validatePuzzleRequirements(basePuzzle.puzzle)) {
          const moveTrail = this.createMoveTrail(basePuzzle.puzzle, basePuzzle.solution);
          
          if (moveTrail && this.validateMultipleMovesRequirement(basePuzzle.puzzle)) {
            const metadata = this.createPuzzleMetadata(basePuzzle.puzzle, theme);
            
            return {
              puzzle: basePuzzle.puzzle,
              solution: basePuzzle.solution,
              moveTrail,
              requiredTechniques: this.extractRequiredTechniques(moveTrail),
              metadata
            };
          }
        }
      } catch (error) {
        console.warn(`Puzzle generation attempt ${attempts + 1} failed:`, error);
      }
      
      attempts++;
    }

    // Fallback: generate a simpler puzzle if we can't meet requirements
    console.warn('Could not generate puzzle meeting all requirements, using fallback');
    return this.generateFallbackPuzzle(theme);
  }

  /**
   * Validate that a puzzle has a complete solvability path using only easy techniques
   */
  validateSolvabilityPath(puzzle: SudokuGrid): MoveTrail | null {
    return this.createMoveTrail(puzzle, null);
  }

  /**
   * Ensure puzzle only requires easy difficulty techniques
   */
  ensureEasyDifficulty(puzzle: SudokuGrid): boolean {
    const moveTrail = this.createMoveTrail(puzzle, null);
    
    if (!moveTrail) {
      return false;
    }

    // Check that all moves use only easy techniques
    return moveTrail.moves.every(move => 
      TechniquePriority.isEasyTechnique(move.technique)
    );
  }

  /**
   * Create a complete move trail from puzzle to solution
   */
  createMoveTrail(puzzle: SudokuGrid, solution: SudokuGrid | null): MoveTrail | null {
    const moves: any[] = [];
    const currentGrid = puzzle.map(row => [...row]);
    let maxTechniqueLevel = SolvingTechnique.NAKED_SINGLE;

    while (!this.isSolved(currentGrid)) {
      const analysis = this.hintEngine.analyzeBoard(currentGrid);
      
      if (analysis.errors.length > 0) {
        // Puzzle has errors, cannot be solved
        return null;
      }

      if (analysis.availableMoves.length === 0) {
        // No moves available, puzzle cannot be solved with current techniques
        return null;
      }

      // Check if we have at least the minimum required moves
      if (analysis.availableMoves.length < this.minMovesRequired) {
        return null;
      }

      // Take the first available move (highest priority)
      const nextMove = analysis.availableMoves[0];
      if (!nextMove) {
        return null;
      }

      // Apply the move
      if (currentGrid[nextMove.row]) {
        currentGrid[nextMove.row]![nextMove.col] = nextMove.value;
      }

      moves.push(nextMove);

      // Track the highest technique level used
      const moveLevel = TechniquePriority.getTechniquePriority(nextMove.technique);
      const currentMaxLevel = TechniquePriority.getTechniquePriority(maxTechniqueLevel);
      if (moveLevel > currentMaxLevel) {
        maxTechniqueLevel = nextMove.technique;
      }

      // Safety check to prevent infinite loops
      if (moves.length > GRID_SIZE * GRID_SIZE) {
        console.warn('Move trail generation exceeded maximum moves');
        return null;
      }
    }

    return {
      moves,
      isComplete: true,
      maxTechniqueLevel,
      startState: puzzle.map(row => [...row]),
      endState: currentGrid
    };
  }

  /**
   * Validate that puzzle always has at least 2 logical moves available
   */
  validateMultipleMovesRequirement(puzzle: SudokuGrid): boolean {
    const currentGrid = puzzle.map(row => [...row]);
    
    while (!this.isSolved(currentGrid)) {
      const analysis = this.hintEngine.analyzeBoard(currentGrid);
      
      if (analysis.errors.length > 0) {
        return false;
      }

      // Check if we have at least the minimum required moves
      if (analysis.availableMoves.length < this.minMovesRequired) {
        return false;
      }

      // Apply the first move and continue
      const nextMove = analysis.availableMoves[0];
      if (!nextMove) {
        return false;
      }

      if (currentGrid[nextMove.row]) {
        currentGrid[nextMove.row]![nextMove.col] = nextMove.value;
      }
    }

    return true;
  }

  /**
   * Validate that puzzle meets all our requirements
   */
  private validatePuzzleRequirements(puzzle: SudokuGrid): boolean {
    // Check basic validity
    if (!this.isValidPuzzle(puzzle)) {
      return false;
    }

    // Check that it can be solved with easy techniques
    if (!this.ensureEasyDifficulty(puzzle)) {
      return false;
    }

    // Check that it always has multiple moves available
    if (!this.validateMultipleMovesRequirement(puzzle)) {
      return false;
    }

    return true;
  }

  /**
   * Generate a fallback puzzle when requirements cannot be met
   */
  private generateFallbackPuzzle(theme?: string): ValidatedPuzzle {
    // Create a very simple puzzle with many clues
    const basePuzzle = SudokuGenerator.generatePuzzle('easy');
    
    // Create a basic move trail (may not meet all requirements)
    const moveTrail: MoveTrail = {
      moves: [],
      isComplete: false,
      maxTechniqueLevel: SolvingTechnique.NAKED_SINGLE,
      startState: basePuzzle.puzzle,
      endState: basePuzzle.solution
    };

    const metadata = this.createPuzzleMetadata(basePuzzle.puzzle, theme);

    return {
      puzzle: basePuzzle.puzzle,
      solution: basePuzzle.solution,
      moveTrail,
      requiredTechniques: [SolvingTechnique.NAKED_SINGLE],
      metadata
    };
  }

  /**
   * Create puzzle metadata
   */
  private createPuzzleMetadata(puzzle: SudokuGrid, theme?: string): PuzzleMetadata {
    return {
      id: this.generatePuzzleId(),
      number: 0, // Will be set by post manager
      title: '', // Will be set by post manager
      creator: 'system',
      theme,
      createdAt: new Date(),
      difficulty: 'easy',
      requiredTechniques: [SolvingTechnique.NAKED_SINGLE, SolvingTechnique.HIDDEN_SINGLE],
      solutionPath: {
        moves: [],
        isComplete: false,
        maxTechniqueLevel: SolvingTechnique.NAKED_SINGLE,
        startState: puzzle,
        endState: puzzle
      }
    };
  }

  /**
   * Extract required techniques from move trail
   */
  private extractRequiredTechniques(moveTrail: MoveTrail): SolvingTechnique[] {
    const techniques = new Set<SolvingTechnique>();
    
    for (const move of moveTrail.moves) {
      techniques.add(move.technique);
    }

    return Array.from(techniques);
  }

  /**
   * Check if puzzle is basically valid
   */
  private isValidPuzzle(puzzle: SudokuGrid): boolean {
    // Check grid structure
    if (puzzle.length !== GRID_SIZE) {
      return false;
    }

    for (const row of puzzle) {
      if (!row || row.length !== GRID_SIZE) {
        return false;
      }
    }

    // Check that puzzle has some empty cells
    const emptyCells = puzzle.flat().filter(cell => cell === null).length;
    if (emptyCells === 0) {
      return false; // Already solved
    }

    if (emptyCells > GRID_SIZE * GRID_SIZE - 8) {
      return false; // Too few clues
    }

    return true;
  }

  /**
   * Check if grid is completely solved
   */
  private isSolved(grid: SudokuGrid): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row]?.[col] === null) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Generate unique puzzle ID
   */
  private generatePuzzleId(): string {
    return `puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set minimum moves required (for testing/configuration)
   */
  setMinimumMovesRequired(count: number): void {
    this.minMovesRequired = Math.max(1, count);
  }

  /**
   * Get current minimum moves requirement
   */
  getMinimumMovesRequired(): number {
    return this.minMovesRequired;
  }
}