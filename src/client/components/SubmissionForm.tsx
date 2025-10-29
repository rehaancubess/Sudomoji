import { useEffect } from 'react';
import { Puzzle } from '../../shared/types/api';
import { SudokuGrid } from '../../shared/types/sudoku';
import { SudokuValidator } from '../../shared/utils/sudoku';

interface SubmissionFormProps {
  puzzle: Puzzle;
  playerGrid: SudokuGrid;
  onSubmit: () => void;
  submitting: boolean;
}

export const SubmissionForm = ({
  playerGrid,
  onSubmit,
  submitting,
}: SubmissionFormProps) => {
  const isSolved = SudokuValidator.isSolved(playerGrid);

  // Automatically submit when puzzle is solved
  useEffect(() => {
    if (isSolved && !submitting) {
      console.log('[COMPLETION] Puzzle solved! Auto-submitting...');
      onSubmit(); // Automatically submit the solution
    }
  }, [isSolved, submitting, onSubmit]);

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className="bg-blue-600 bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-blue-400 border-opacity-30">
      <div className="text-center mb-4">
        <div className="text-lg font-semibold mb-2 text-white">
          {isSolved ? '🎉 Puzzle Complete!' : '🧩 Keep Going!'}
        </div>

        {!isSolved && (
          <p className="text-sm text-blue-200 mb-4">Complete the puzzle to submit your solution</p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || isSolved}
        className={`w-full py-3 px-4 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300`}
        style={{
          backgroundColor: submitting ? '#3b82f6' : isSolved ? '#10b981' : '#6b7280',
          color: 'white'
        }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Submitting...
          </span>
        ) : isSolved ? (
          '✅ Solution Submitted!'
        ) : (
          'Complete puzzle to submit'
        )}
      </button>
    </div>
  );
};
