import { SudokuGrid } from './sudoku';

// Core solving technique enumeration
export enum SolvingTechnique {
  NAKED_SINGLE = 'naked_single',
  HIDDEN_SINGLE = 'hidden_single'
}

// Hint move representation
export interface HintMove {
  type: 'place' | 'eliminate';
  row: number;
  col: number;
  value: number;
  technique: SolvingTechnique;
  explanation: string;
  confidence: number;
}

// Board analysis result
export interface BoardAnalysis {
  availableMoves: HintMove[];
  candidateGrid: CandidateGrid;
  errors: ErrorLocation[];
  isValid: boolean;
  isSolvable: boolean;
}

// Move validation result
export interface MoveValidation {
  isValid: boolean;
  violatesConstraints: boolean;
  errorType?: 'row' | 'column' | 'box' | 'contradiction';
  errorMessage?: string;
}

// Candidate tracking
export interface CandidateGrid {
  [row: number]: {
    [col: number]: Set<number>;
  };
}

// Error location and description
export interface ErrorLocation {
  row: number;
  col: number;
  type: 'contradiction' | 'invalid_move' | 'no_solution';
  description: string;
  suggestedAction?: string;
}

// Move trail for path validation
export interface MoveTrail {
  moves: HintMove[];
  isComplete: boolean;
  maxTechniqueLevel: SolvingTechnique;
  startState: SudokuGrid;
  endState: SudokuGrid;
}

// Enhanced board state with hint system data
export interface EnhancedBoardState {
  grid: SudokuGrid;
  candidates: CandidateGrid;
  moveHistory: MoveHistoryEntry[];
  errors: ErrorLocation[];
  availableHints: HintMove[];
  isShowingCandidates: boolean;
  lastAnalysis?: BoardAnalysis;
}

// Move history tracking
export interface MoveHistoryEntry {
  move: PlayerMove;
  timestamp: number;
  boardStateBefore: SudokuGrid;
  wasHintUsed: boolean;
  technique?: SolvingTechnique | undefined;
}

// Player move representation
export interface PlayerMove {
  row: number;
  col: number;
  value: number | null; // null for clearing a cell
  isUndo?: boolean;
}

// Validated puzzle with solution path
export interface ValidatedPuzzle {
  puzzle: SudokuGrid;
  solution: SudokuGrid;
  moveTrail: MoveTrail;
  requiredTechniques: SolvingTechnique[];
  metadata: PuzzleMetadata;
}

// Puzzle metadata for posting system
export interface PuzzleMetadata {
  id: string;
  number: number;
  title: string;
  creator: 'system' | string; // 'system' for official, username for user-created
  theme?: string;
  createdAt: Date;
  difficulty: 'easy';
  requiredTechniques: SolvingTechnique[];
  solutionPath: MoveTrail;
  redditPostId?: string;
}

// Post data for subreddit posting
export interface PostData {
  title: string;
  puzzleNumber: number;
  content: string;
  attribution?: string;
  theme?: string;
  puzzleGrid: SudokuGrid;
  emojiTheme: string[];
}

// Post result from subreddit submission
export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  retryable: boolean;
}

// Hint engine interface
export interface HintEngine {
  analyzeBoard(grid: SudokuGrid): BoardAnalysis;
  findNextMove(grid: SudokuGrid): HintMove | null;
  getCandidates(grid: SudokuGrid, row: number, col: number): number[];
  validateMove(grid: SudokuGrid, row: number, col: number, value: number): MoveValidation;
  detectErrors(grid: SudokuGrid): ErrorLocation[];
  updateCandidates(grid: SudokuGrid, move: PlayerMove): CandidateGrid;
  getHintPenalty(): number; // Returns 20 seconds
}

// Technique library interface
export interface TechniqueLibrary {
  findNakedSingles(grid: SudokuGrid, candidates: CandidateGrid): HintMove[];
  findHiddenSingles(grid: SudokuGrid, candidates: CandidateGrid): HintMove[];
  explainTechnique(technique: SolvingTechnique, move: HintMove): string;
  getAllTechniques(): SolvingTechnique[];
}

// Path-validated puzzle generator interface
export interface PathValidatedGenerator {
  generatePuzzle(theme?: string): ValidatedPuzzle;
  validateSolvabilityPath(puzzle: SudokuGrid): MoveTrail | null;
  ensureEasyDifficulty(puzzle: SudokuGrid): boolean;
  createMoveTrail(puzzle: SudokuGrid, solution: SudokuGrid): MoveTrail | null;
  validateMultipleMovesRequirement(puzzle: SudokuGrid): boolean;
}

// Post manager interface
export interface PostManager {
  getNextPuzzleNumber(): Promise<number>;
  createOfficialPost(puzzle: ValidatedPuzzle, theme: string): PostData;
  createUserPost(puzzle: ValidatedPuzzle, username: string): PostData;
  submitToSubreddit(postData: PostData): Promise<PostResult>;
  incrementCounter(): Promise<number>;
}

// Technique validator interface
export interface TechniqueValidator {
  validatePuzzleRequirements(puzzle: SudokuGrid, allowedTechniques: SolvingTechnique[]): boolean;
  findRequiredTechniques(puzzle: SudokuGrid): SolvingTechnique[];
  isWithinDifficultyLevel(requiredTechniques: SolvingTechnique[], maxLevel: SolvingTechnique): boolean;
}