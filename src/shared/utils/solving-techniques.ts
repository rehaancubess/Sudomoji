import { SudokuGrid } from '../types/sudoku';
import { 
  HintMove, 
  SolvingTechnique, 
  CandidateGrid, 
  TechniqueLibrary 
} from '../types/hint-system';
import { CandidateCalculator } from './candidate-calculator';

export class SolvingTechniques implements TechniqueLibrary {
  /**
   * Find all naked singles in the current grid state
   * A naked single is a cell that has only one possible candidate
   */
  findNakedSingles(grid: SudokuGrid, candidates: CandidateGrid): HintMove[] {
    const moves: HintMove[] = [];
    const nakedSingles = CandidateCalculator.findNakedSingles(candidates);

    for (const single of nakedSingles) {
      const move: HintMove = {
        type: 'place',
        row: single.row,
        col: single.col,
        value: single.value,
        technique: SolvingTechnique.NAKED_SINGLE,
        explanation: this.explainNakedSingle(single.row, single.col, single.value),
        confidence: 1.0 // Naked singles are always certain
      };
      moves.push(move);
    }

    return moves;
  }

  /**
   * Find all hidden singles in the current grid state
   * A hidden single is a digit that can only be placed in one location within a unit
   */
  findHiddenSingles(grid: SudokuGrid, candidates: CandidateGrid): HintMove[] {
    const moves: HintMove[] = [];
    const hiddenSingles = CandidateCalculator.findHiddenSingles(grid, candidates);

    for (const single of hiddenSingles) {
      const move: HintMove = {
        type: 'place',
        row: single.row,
        col: single.col,
        value: single.value,
        technique: SolvingTechnique.HIDDEN_SINGLE,
        explanation: this.explainHiddenSingle(
          single.row, 
          single.col, 
          single.value, 
          single.unit
        ),
        confidence: 1.0 // Hidden singles are always certain
      };
      moves.push(move);
    }

    return moves;
  }

  /**
   * Generate explanation for a naked single move
   */
  private explainNakedSingle(row: number, col: number, value: number): string {
    const cellName = this.getCellName(row, col);
    return `${cellName} can only be ${value}. This is the only number that fits in this cell based on the numbers already placed in its row, column, and box.`;
  }

  /**
   * Generate explanation for a hidden single move
   */
  private explainHiddenSingle(
    row: number, 
    col: number, 
    value: number, 
    unit: 'row' | 'column' | 'box'
  ): string {
    const cellName = this.getCellName(row, col);
    const unitName = this.getUnitName(row, col, unit);
    
    return `${cellName} must be ${value}. This is the only place where ${value} can go in ${unitName}.`;
  }

  /**
   * Get all available solving techniques
   */
  getAllTechniques(): SolvingTechnique[] {
    return [SolvingTechnique.NAKED_SINGLE, SolvingTechnique.HIDDEN_SINGLE];
  }

  /**
   * Explain a technique with context
   */
  explainTechnique(technique: SolvingTechnique, move: HintMove): string {
    switch (technique) {
      case SolvingTechnique.NAKED_SINGLE:
        return this.explainNakedSingleTechnique(move);
      case SolvingTechnique.HIDDEN_SINGLE:
        return this.explainHiddenSingleTechnique(move);
      default:
        return move.explanation;
    }
  }

  /**
   * Detailed explanation of the naked single technique
   */
  private explainNakedSingleTechnique(move: HintMove): string {
    const cellName = this.getCellName(move.row, move.col);
    return `**Naked Single**: ${cellName} has only one possible value: ${move.value}. ` +
           `When you eliminate all the numbers that already appear in the same row, column, ` +
           `and box, only ${move.value} remains as a possibility for this cell.`;
  }

  /**
   * Detailed explanation of the hidden single technique
   */
  private explainHiddenSingleTechnique(move: HintMove): string {
    const cellName = this.getCellName(move.row, move.col);
    return `**Hidden Single**: ${move.value} can only go in ${cellName}. ` +
           `Even though this cell might have other possible numbers, ${move.value} has ` +
           `nowhere else to go in this row, column, or box, so it must be placed here.`;
  }

  /**
   * Get human-readable cell name (e.g., "R1C2")
   */
  private getCellName(row: number, col: number): string {
    return `R${row + 1}C${col + 1}`;
  }

  /**
   * Get human-readable unit name
   */
  private getUnitName(row: number, col: number, unit: 'row' | 'column' | 'box'): string {
    switch (unit) {
      case 'row':
        return `row ${row + 1}`;
      case 'column':
        return `column ${col + 1}`;
      case 'box':
        const boxRow = Math.floor(row / 2) + 1;
        const boxCol = Math.floor(col / 3) + 1;
        return `box ${boxRow}-${boxCol}`;
      default:
        return 'unit';
    }
  }
}

/**
 * Technique priority manager for hint selection
 */
export class TechniquePriority {
  private static readonly TECHNIQUE_ORDER = [
    SolvingTechnique.NAKED_SINGLE,
    SolvingTechnique.HIDDEN_SINGLE
  ];

  /**
   * Sort moves by technique priority (simpler techniques first)
   */
  static sortMovesByPriority(moves: HintMove[]): HintMove[] {
    return moves.sort((a, b) => {
      const priorityA = this.TECHNIQUE_ORDER.indexOf(a.technique);
      const priorityB = this.TECHNIQUE_ORDER.indexOf(b.technique);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same technique, sort by confidence (higher first)
      return b.confidence - a.confidence;
    });
  }

  /**
   * Get the priority level of a technique (lower number = higher priority)
   */
  static getTechniquePriority(technique: SolvingTechnique): number {
    const index = this.TECHNIQUE_ORDER.indexOf(technique);
    return index === -1 ? 999 : index;
  }

  /**
   * Check if a technique is within the easy difficulty level
   */
  static isEasyTechnique(technique: SolvingTechnique): boolean {
    return this.TECHNIQUE_ORDER.includes(technique);
  }

  /**
   * Get the maximum technique level used in a set of moves
   */
  static getMaxTechniqueLevel(moves: HintMove[]): SolvingTechnique {
    let maxLevel = SolvingTechnique.NAKED_SINGLE;
    let maxPriority = -1;

    for (const move of moves) {
      const priority = this.getTechniquePriority(move.technique);
      if (priority > maxPriority) {
        maxPriority = priority;
        maxLevel = move.technique;
      }
    }

    return maxLevel;
  }
}