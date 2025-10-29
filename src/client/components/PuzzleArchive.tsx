import { useState } from 'react';
import { Puzzle } from '../../shared/types/api';

interface PuzzleArchiveProps {
  onBack: () => void;
  onSelectPuzzle: (date: string) => void;
  puzzleHistory: Puzzle[];
  loading: boolean;
  onLoadMore: () => void;
}

export const PuzzleArchive = ({
  onBack,
  onSelectPuzzle,
  puzzleHistory,
  loading,
  onLoadMore,
}: PuzzleArchiveProps) => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDateKey = (dateString: string | undefined) => {
    if (!dateString) return '';
    return dateString.split('T')[0]; // Extract YYYY-MM-DD
  };

  const handleDateSelect = () => {
    if (selectedDate) {
      onSelectPuzzle(selectedDate);
    }
  };

  const handlePuzzleClick = (puzzle: Puzzle) => {
    const dateKey = getDateKey(puzzle.createdAt);
    if (dateKey) {
      onSelectPuzzle(dateKey);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Puzzle Archive</h1>
          <div className="w-10"></div>
        </div>

        {/* Date Picker */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Jump to Date</h2>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={new Date().toISOString().split('T')[0]}
            />
            <button
              onClick={handleDateSelect}
              disabled={!selectedDate}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Go
            </button>
          </div>
        </div>

        {/* Puzzle History */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Recent Puzzles</h2>

          {loading && puzzleHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading puzzle history...</p>
            </div>
          ) : puzzleHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🧩</div>
              <p className="text-gray-600">No puzzles found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {puzzleHistory.map((puzzle) => (
                <div
                  key={puzzle.id}
                  onClick={() => handlePuzzleClick(puzzle)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        Puzzle #{puzzle.puzzleNumber}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(puzzle.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {puzzle.title}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-lg mb-1">
                        {puzzle.emojis.slice(0, 3).join(' ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {puzzle.state === 'completed' ? '✅ Completed' : '🔄 Active'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {puzzleHistory.length > 0 && (
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:text-gray-400"
                >
                  {loading ? 'Loading...' : 'Load More Puzzles'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-center text-xs text-gray-500">
          <p>Browse and replay any previous Sudomoji puzzle</p>
          <p className="mt-1">Your progress is saved for each puzzle</p>
        </div>
      </div>
    </div>
  );
};