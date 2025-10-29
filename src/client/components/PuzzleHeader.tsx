import { useState, useEffect } from 'react';
import { Puzzle } from '../../shared/types/api';

interface PuzzleHeaderProps {
  puzzle: Puzzle;
  username: string | null;
  hasSubmitted: boolean;
}

export const PuzzleHeader = ({ puzzle, username, hasSubmitted }: PuzzleHeaderProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(puzzle.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [puzzle.expiresAt]);

  return (
    <div className="text-center mb-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{puzzle.title}</h1>
        <div className="text-3xl mb-2">{puzzle.emojis.join(' ')}</div>
      </div>

      <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
        {username && <p>Hey {username}! 👋</p>}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span>⏰</span>
            <span className="font-mono">{timeLeft} left</span>
          </div>

          {puzzle.winnerUsername && (
            <div className="flex items-center gap-1">
              <span>👑</span>
              <span>{puzzle.winnerUsername} won!</span>
            </div>
          )}
        </div>

        {hasSubmitted && (
          <div className="px-3 py-1 rounded-full text-xs font-medium" style={{backgroundColor: '#E8F5E8', color: '#2E7D32'}}>
            ✅ Solution Submitted
          </div>
        )}
      </div>
    </div>
  );
};
