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

interface SudomojiState {
  loading: boolean;
  username: string | null;
  currentPuzzle: Puzzle | null;
  userSubmission: PlayerSubmission | null;
  leaderboard: Leaderboard | null;
  playerGrid: SudokuGrid;
  selectedCell: [number, number] | null;
  startTime: number;
  submitting: boolean;
}

export const useSudomoji = () => {
  const [state, setState] = useState<SudomojiState>({
    loading: true,
    username: null,
    currentPuzzle: null,
    userSubmission: null,
    leaderboard: null,
    playerGrid: Array(6)
      .fill(null)
      .map(() => Array(6).fill(null)),
    selectedCell: null,
    startTime: Date.now(),
    submitting: false,
  });

  // Initialize the game
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();

        if (data.type !== 'init') throw new Error('Unexpected response');

        setState((prev) => ({
          ...prev,
          loading: false,
          username: data.username,
          currentPuzzle: data.currentPuzzle,
          userSubmission: data.userSubmission,
          leaderboard: data.leaderboard,
          playerGrid: data.currentPuzzle ? [...data.currentPuzzle.grid] : prev.playerGrid,
          startTime: Date.now(),
        }));
      } catch (err) {
        console.error('Failed to initialize Sudomoji', err);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    void init();
  }, []);

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
      return { ...prev, playerGrid: newGrid };
    });
  }, []);

  const submitSolution = useCallback(
    async (nextTheme?: { title: string; emojis: string[] }) => {
      if (!state.currentPuzzle) return;

      setState((prev) => ({ ...prev, submitting: true }));

      try {
        const request: SubmitSolutionRequest = {
          solution: state.playerGrid,
          startTime: state.startTime,
          ...(nextTheme && { nextTheme }),
        };

        const res = await fetch('/api/submit-solution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: SubmitSolutionResponse = await res.json();

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

          // Refresh leaderboard
          const leaderboardRes = await fetch('/api/leaderboard');
          if (leaderboardRes.ok) {
            const leaderboardData = await leaderboardRes.json();
            setState((prev) => ({ ...prev, leaderboard: leaderboardData.leaderboard }));
          }
        }
      } catch (err) {
        console.error('Failed to submit solution', err);
      } finally {
        setState((prev) => ({ ...prev, submitting: false }));
      }
    },
    [state.currentPuzzle, state.playerGrid, state.startTime, state.username]
  );

  return {
    ...state,
    setSelectedCell,
    setCellValue,
    submitSolution,
  } as const;
};
