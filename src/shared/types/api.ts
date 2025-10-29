// Sudoku types
export type SudokuGrid = (number | null)[][];
export type EmojiGrid = (string | null)[][];

export type GameState = 'active' | 'completed' | 'results';

export type Puzzle = {
  id: string;
  puzzleNumber: number;
  title: string;
  emojis: string[];
  grid: SudokuGrid;
  solution: SudokuGrid;
  createdAt: string;
  expiresAt: string;
  state: GameState;
  winnerUsername?: string;
  creator?: string; // For custom puzzles
  nextTheme?: {
    title: string;
    emojis: string[];
  };
};

export type PlayerSubmission = {
  username: string;
  solution: SudokuGrid;
  nextTheme?: {
    title: string;
    emojis: string[];
  };
  submittedAt: string;
  isCorrect: boolean;
  solveTime?: number; // in milliseconds
};

export type Leaderboard = {
  puzzleId: string;
  entries: LeaderboardEntry[];
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  solveTime: number;
  submittedAt: string;
};

// API Response types
export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  currentPuzzle: Puzzle | null;
  userSubmission: PlayerSubmission | null;
  leaderboard: Leaderboard | null;
};

export type SubmitSolutionRequest = {
  solution: SudokuGrid;
  nextTheme?: {
    title: string;
    emojis: string[];
  };
  startTime: number;
};

export type SubmitSolutionResponse = {
  type: 'submit';
  success: boolean;
  isCorrect: boolean;
  rank?: number;
  solveTime?: number;
  message: string;
};

export type GetLeaderboardResponse = {
  type: 'leaderboard';
  leaderboard: Leaderboard;
};

export type CreatePuzzleResponse = {
  type: 'create';
  puzzle: Puzzle;
};

export type CustomTheme = {
  title: string;
  emojis: string[];
  category?: string;
  creator?: string;
};

export type CreateCustomPuzzleRequest = {
  theme: CustomTheme;
  targetSubreddits?: string[];
};

export type CreateCustomPuzzleResponse = {
  type: 'custom-create';
  puzzle: Puzzle;
  shareableLink?: string;
  crosspostSuggestions?: string[];
  postId?: string;
};
