export type SudokuCell = number | null;
export type SudokuGrid = SudokuCell[][];
export type EmojiGrid = (string | null)[][];

export const GRID_SIZE = 6;
export const BOX_WIDTH = 3;
export const BOX_HEIGHT = 2;

export interface SudokuValidator {
  isValidGrid(grid: SudokuGrid): boolean;
  isValidMove(grid: SudokuGrid, row: number, col: number, value: number): boolean;
  isSolved(grid: SudokuGrid): boolean;
}

export interface SudokuGenerator {
  generatePuzzle(difficulty?: 'easy' | 'medium' | 'hard'): {
    puzzle: SudokuGrid;
    solution: SudokuGrid;
  };
}

export const DEFAULT_EMOJIS = ['🦊', '🐸', '🦄', '🐝', '🐧', '🐼'];

export const EMOJI_THEMES = {
  animals: ['🦊', '🐸', '🦄', '🐝', '🐧', '🐼'],
  food: ['🍕', '🍔', '🍟', '🌮', '🍩', '🍪'],
  nature: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼'],
  space: ['🌟', '⭐', '🌙', '☀️', '🪐', '🚀'],
  ocean: ['🐠', '🐙', '🦈', '🐢', '🦀', '🐚'],
  dessert: ['🍩', '🍰', '🍪', '🍫', '🍦', '🧁'],
  fruits: ['🍎', '🍌', '🍓', '🍊', '🍇', '🥝'],
  weather: ['☀️', '🌧️', '⛈️', '🌈', '❄️', '⛅'],
};
