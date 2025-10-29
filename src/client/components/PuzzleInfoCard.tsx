import React from 'react';
import { formatTimeUntil } from '../../shared/utils/time';

interface PuzzleInfoCardProps {
  puzzleTitle: string;
  themeEmojis: string[];
  expiresAt: string;
  topSolver?: {
    username: string;
    solveTime: number;
  } | null;
}

const PuzzleInfoCard: React.FC<PuzzleInfoCardProps> = ({
  puzzleTitle,
  themeEmojis,
  expiresAt,
  topSolver
}) => {
  return (
    <div className="bg-blue-600 bg-opacity-80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 lg:p-6 animate-scale-in border border-blue-400 border-opacity-30">
      {/* Puzzle Title */}
      <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-2 sm:mb-3">
        {puzzleTitle}
      </h2>
      
      {/* Theme Emojis and Time */}
      <div className="text-center mb-3 sm:mb-4">
        <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">
          {themeEmojis.join(' ')}
        </div>
        <div className="text-xs sm:text-sm text-blue-100">
          ⏰ {formatTimeUntil(expiresAt)} remaining
        </div>
      </div>

      {/* Current Leader */}
      {topSolver && (
        <div className="bg-yellow-400 bg-opacity-20 rounded-lg p-2 sm:p-3 border border-yellow-400 border-opacity-30">
          <div className="text-center">
            <div className="text-xs sm:text-sm font-medium text-yellow-200">
              👑 Current Leader
            </div>
            <div className="text-yellow-100 font-semibold text-sm sm:text-base">
              {topSolver.username}
            </div>
            <div className="text-xs text-yellow-200">
              {Math.floor(topSolver.solveTime / 1000)}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleInfoCard;