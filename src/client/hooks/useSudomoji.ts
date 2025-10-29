import { useCallback, useEffect, useState } from 'react';
import type {
  InitResponse,
  Puzzle,
  PlayerSubmission,
  Leaderboard,
  SubmitSolutionRequest,
  SubmitSolutionResponse,
} from '../../shared/types/api';
import { SudokuGrid } from '../../shared/types/sudoku';

interface LeaderboardState {
  data: Leaderboard | null;
  loading: boolean;
  puzzleId: string | null;
}

interface SudomojiState {
  loading: boolean;
  username: string | null;
  currentPuzzle: Puzzle | null;
  userSubmission: PlayerSubmission | null;
  leaderboard: LeaderboardState;
  playerGrid: SudokuGrid;
  selectedCell: [number, number] | null;
  startTime: number | null;
  submitting: boolean;
  hasStarted: boolean;
  puzzleHistory: Puzzle[];
  historyLoading: boolean;
  timePenalty: number;
  wrongMoveCount: number;
  submissionError: string | null;
  leaderboardError: string | null;
}

export const useSudomoji = () => {
  // Helper functions for leaderboard state management
  const clearLeaderboardState = (): LeaderboardState => ({
    data: null,
    loading: true,
    puzzleId: null
  });

  const updateLeaderboardState = (leaderboard: Leaderboard | null, puzzleId: string | null): LeaderboardState => ({
    data: leaderboard,
    loading: false,
    puzzleId
  });

  // Validate that leaderboard data matches current puzzle
  const validateLeaderboardData = (leaderboard: Leaderboard | null, currentPuzzleId: string | null): boolean => {
    if (!leaderboard || !currentPuzzleId) return true; // Allow null states
    const isValid = leaderboard.puzzleId === currentPuzzleId;
    if (!isValid) {
      console.warn('Leaderboard puzzle ID mismatch:', leaderboard.puzzleId, 'vs current:', currentPuzzleId);
    }
    return isValid;
  };

  const [state, setState] = useState<SudomojiState>({
    loading: true,
    username: null,
    currentPuzzle: null,
    userSubmission: null,
    leaderboard: clearLeaderboardState(),
    playerGrid: Array(6)
      .fill(null)
      .map(() => Array(6).fill(null)),
    selectedCell: null,
    startTime: null,
    submitting: false,
    hasStarted: false,
    puzzleHistory: [],
    historyLoading: false,
    timePenalty: 0,
    wrongMoveCount: 0,
    submissionError: null,
    leaderboardError: null,
  });

  // Initialize the game
  useEffect(() => {
    const init = async () => {
      try {
        // Clear leaderboard state before fetching new data
        setState((prev) => ({
          ...prev,
          leaderboard: clearLeaderboardState()
        }));

        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();

        if (data.type !== 'init') throw new Error('Unexpected response');

        // Validate leaderboard data matches current puzzle
        const currentPuzzleId = data.currentPuzzle?.id || null;
        const isValidLeaderboard = validateLeaderboardData(data.leaderboard, currentPuzzleId);
        
        console.log('[INIT] Current puzzle:', data.currentPuzzle?.title, 'ID:', currentPuzzleId);
        console.log('[INIT] Puzzle number:', data.currentPuzzle?.puzzleNumber);
        console.log('[INIT] Leaderboard puzzle ID:', data.leaderboard?.puzzleId);
        console.log('[INIT] Leaderboard entries:', data.leaderboard?.entries?.length || 0);
        console.log('[INIT] Is valid leaderboard:', isValidLeaderboard);
        
        // Validate puzzle numbering consistency
        if (data.currentPuzzle) {
          const expectedTitle = `Sudomoji #${data.currentPuzzle.puzzleNumber}`;
          if (data.currentPuzzle.title !== expectedTitle) {
            console.warn('[INIT] Puzzle title inconsistency:', data.currentPuzzle.title, 'vs expected:', expectedTitle);
          }
        }
        
        setState((prev) => ({
          ...prev,
          loading: false,
          username: data.username,
          currentPuzzle: data.currentPuzzle,
          userSubmission: data.userSubmission,
          leaderboard: updateLeaderboardState(
            isValidLeaderboard ? data.leaderboard : null, 
            currentPuzzleId
          ),
          playerGrid: data.currentPuzzle ? [...data.currentPuzzle.grid] : prev.playerGrid,
          // Reset game state for new puzzle
          startTime: null,
          hasStarted: false,
          selectedCell: null,
          timePenalty: 0,
          wrongMoveCount: 0,
        }));
      } catch (err) {
        console.error('Failed to initialize Sudomoji', err);
        setState((prev) => ({ 
          ...prev, 
          loading: false,
          leaderboard: updateLeaderboardState(null, null)
        }));
      }
    };

    void init();
  }, []);

  // Monitor puzzle changes and clear stale data
  useEffect(() => {
    const currentPuzzleId = state.currentPuzzle?.id || null;
    const leaderboardPuzzleId = state.leaderboard.puzzleId;
    
    // If puzzle ID changed and we have data for a different puzzle, clear it
    if (currentPuzzleId && leaderboardPuzzleId && currentPuzzleId !== leaderboardPuzzleId) {
      console.log('Puzzle changed, clearing stale data');
      setState((prev) => ({
        ...prev,
        leaderboard: clearLeaderboardState(),
        userSubmission: null, // Also clear user submission for different puzzle
      }));
    }
  }, [state.currentPuzzle?.id, state.leaderboard.puzzleId]);

  const setSelectedCell = useCallback((cell: [number, number] | null) => {
    setState((prev) => ({ ...prev, selectedCell: cell }));
  }, []);

  const setCellValue = useCallback((row: number, col: number, value: number | null) => {
    setState((prev) => {
      const newGrid = prev.playerGrid.map((r) => [...r]);
      const targetRow = newGrid[row];
      if (targetRow) {
        targetRow[col] = value;
      }
      
      // Start timer on first move (only when placing a value, not clearing)
      const newState = { ...prev, playerGrid: newGrid };
      if (!prev.hasStarted && value !== null) {
        console.log('Starting timer!', Date.now()); // Debug log
        newState.startTime = Date.now();
        newState.hasStarted = true;
      }
      
      return newState;
    });
  }, []);

  const submitSolution = useCallback(
    async (nextTheme?: { title: string; emojis: string[] }) => {
      if (!state.currentPuzzle) return;

      setState((prev) => ({ 
        ...prev, 
        submitting: true, 
        submissionError: null,
        leaderboardError: null 
      }));

      try {
        const request: SubmitSolutionRequest = {
          solution: state.playerGrid,
          startTime: state.startTime || Date.now(),
          ...(nextTheme && { nextTheme }),
        };

        const res = await fetch('/api/submit-solution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[SUBMIT] Server error:', res.status, errorText);
          throw new Error(`Server error: ${res.status} - ${errorText}`);
        }

        const data: SubmitSolutionResponse = await res.json();
        console.log('[SUBMIT] Server response:', data);

        if (data.success) {
          // Create user submission object
          const submission: PlayerSubmission = {
            username: state.username || 'anonymous',
            solution: state.playerGrid,
            submittedAt: new Date().toISOString(),
            isCorrect: data.isCorrect,
            ...(data.solveTime !== undefined && { solveTime: data.solveTime }),
            ...(nextTheme && { nextTheme }),
          };

          setState((prev) => ({ ...prev, userSubmission: submission }));

          // Refresh leaderboard for current puzzle with retry logic
          if (state.currentPuzzle) {
            console.log('[SUBMIT] Refreshing leaderboard after successful submission');
            setState((prev) => ({
              ...prev,
              leaderboard: { ...prev.leaderboard, loading: true }
            }));

            const maxRetries = 3;
            let retryCount = 0;
            let leaderboardRefreshed = false;

            while (retryCount < maxRetries && !leaderboardRefreshed) {
              try {
                console.log(`[SUBMIT] Fetching leaderboard (attempt ${retryCount + 1}/${maxRetries})`);
                const leaderboardRes = await fetch('/api/leaderboard');
                
                if (leaderboardRes.ok) {
                  const leaderboardData = await leaderboardRes.json();
                  console.log('[SUBMIT] Successfully fetched updated leaderboard:', leaderboardData.leaderboard?.entries?.length || 0, 'entries');
                  
                  setState((prev) => ({ 
                    ...prev, 
                    leaderboard: updateLeaderboardState(
                      leaderboardData.leaderboard, 
                      state.currentPuzzle?.id || null
                    )
                  }));
                  leaderboardRefreshed = true;
                } else {
                  console.error(`[SUBMIT] Leaderboard fetch failed with status: ${leaderboardRes.status}`);
                  throw new Error(`HTTP ${leaderboardRes.status}`);
                }
              } catch (leaderboardErr) {
                retryCount++;
                console.error(`[SUBMIT] Failed to refresh leaderboard (attempt ${retryCount}/${maxRetries}):`, leaderboardErr);
                
                if (retryCount < maxRetries) {
                  const delay = Math.pow(2, retryCount) * 500; // 1s, 2s, 4s
                  console.log(`[SUBMIT] Retrying leaderboard refresh in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                  console.error('[SUBMIT] Failed to refresh leaderboard after all retries');
                  setState((prev) => ({
                    ...prev,
                    leaderboard: updateLeaderboardState(null, state.currentPuzzle?.id || null),
                    leaderboardError: 'Failed to update leaderboard. Your solution was submitted successfully, but the leaderboard may not reflect your entry immediately.'
                  }));
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[SUBMIT] Failed to submit solution:', err);
        
        let errorMessage = 'Failed to submit solution. Please try again.';
        if (err instanceof Error) {
          if (err.message.includes('already submitted')) {
            errorMessage = 'You have already submitted a solution for this puzzle.';
          } else if (err.message.includes('Server error: 500')) {
            errorMessage = 'Server error occurred. Your solution may have been saved. Please refresh the page.';
          } else if (err.message.includes('Network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
        }
        
        setState((prev) => ({ 
          ...prev, 
          submitting: false,
          submissionError: errorMessage
        }));
      } finally {
        setState((prev) => ({ ...prev, submitting: false }));
      }
    },
    [state.currentPuzzle, state.playerGrid, state.startTime, state.username]
  );

  const loadPuzzleHistory = useCallback(async (limit: number = 10, offset: number = 0) => {
    setState((prev) => ({ ...prev, historyLoading: true }));
    
    try {
      const res = await fetch(`/api/puzzle-history?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setState((prev) => ({ 
        ...prev, 
        puzzleHistory: data.puzzles,
        historyLoading: false 
      }));
    } catch (err) {
      console.error('Failed to load puzzle history', err);
      setState((prev) => ({ ...prev, historyLoading: false }));
    }
  }, []);

  const loadPuzzleByDate = useCallback(async (date: string) => {
    setState((prev) => ({ 
      ...prev, 
      loading: true,
      leaderboard: clearLeaderboardState()
    }));
    
    try {
      const res = await fetch(`/api/puzzle/${date}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      // Validate leaderboard data matches the loaded puzzle
      const puzzleId = data.puzzle?.id || null;
      const isValidLeaderboard = validateLeaderboardData(data.leaderboard, puzzleId);
      
      setState((prev) => ({
        ...prev,
        loading: false,
        currentPuzzle: data.puzzle,
        userSubmission: data.userSubmission,
        leaderboard: updateLeaderboardState(
          isValidLeaderboard ? data.leaderboard : null, 
          puzzleId
        ),
        playerGrid: data.puzzle ? [...data.puzzle.grid] : prev.playerGrid,
        startTime: null,
        hasStarted: false,
        selectedCell: null,
        timePenalty: 0,
        wrongMoveCount: 0,
      }));
    } catch (err) {
      console.error('Failed to load puzzle by date', err);
      setState((prev) => ({ 
        ...prev, 
        loading: false,
        leaderboard: updateLeaderboardState(null, null)
      }));
    }
  }, []);

  const handleWrongMove = useCallback((_row: number, _col: number, _value: number) => {
    setState((prev) => ({
      ...prev,
      timePenalty: prev.timePenalty + 10000, // Add 10 seconds in milliseconds
      wrongMoveCount: prev.wrongMoveCount + 1,
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setState((prev) => ({ 
      ...prev, 
      submissionError: null, 
      leaderboardError: null 
    }));
  }, []);

  const refreshCurrentPuzzle = useCallback(async () => {
    console.log('[REFRESH] Refreshing current puzzle state');
    setState((prev) => ({ 
      ...prev, 
      loading: true, 
      submissionError: null, 
      leaderboardError: null 
    }));
    
    try {
      const res = await fetch('/api/init');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: InitResponse = await res.json();

      if (data.type !== 'init') throw new Error('Unexpected response');

      const currentPuzzleId = data.currentPuzzle?.id || null;
      const isValidLeaderboard = validateLeaderboardData(data.leaderboard, currentPuzzleId);
      
      console.log('[REFRESH] Updated puzzle:', data.currentPuzzle?.title, 'ID:', currentPuzzleId);
      console.log('[REFRESH] Updated leaderboard entries:', data.leaderboard?.entries?.length || 0);
      
      setState((prev) => ({
        ...prev,
        loading: false,
        currentPuzzle: data.currentPuzzle,
        userSubmission: data.userSubmission,
        leaderboard: updateLeaderboardState(
          isValidLeaderboard ? data.leaderboard : null, 
          currentPuzzleId
        ),
        playerGrid: data.currentPuzzle ? [...data.currentPuzzle.grid] : prev.playerGrid,
        // Reset game state for new puzzle
        startTime: null,
        hasStarted: false,
        selectedCell: null,
        timePenalty: 0,
        wrongMoveCount: 0,
      }));
    } catch (err) {
      console.error('[REFRESH] Failed to refresh puzzle state:', err);
      setState((prev) => ({ 
        ...prev, 
        loading: false 
      }));
    }
  }, []);

  return {
    ...state,
    // Expose leaderboard data for backward compatibility
    leaderboard: state.leaderboard.data,
    leaderboardLoading: state.leaderboard.loading,
    leaderboardPuzzleId: state.leaderboard.puzzleId,
    setSelectedCell,
    setCellValue,
    submitSolution,
    loadPuzzleHistory,
    loadPuzzleByDate,
    handleWrongMove,
    refreshCurrentPuzzle,
    clearErrors,
  } as const;
};
