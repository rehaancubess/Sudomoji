import { Leaderboard } from '../../shared/types/api';
import { formatTime } from '../../shared/utils/time';
import BackgroundAnimation from './BackgroundAnimation';
import GameButton from './GameButton';

interface LeaderboardScreenProps {
  leaderboard: Leaderboard | null;
  currentUser: string | null;
  puzzleTitle: string;
  onBack: () => void;
  loading?: boolean;
}

export const LeaderboardScreen = ({
  leaderboard,
  currentUser,
  puzzleTitle,
  onBack,
  loading = false,
}: LeaderboardScreenProps) => {
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}.`;
    }
  };

  const getRankClassName = (rank: number, username: string) => {
    const baseClasses = 'w-full p-3 sm:p-4 rounded-lg backdrop-blur-sm border';

    if (username === currentUser) {
      return `${baseClasses} bg-blue-400 bg-opacity-30 border-blue-300 border-opacity-50`;
    }

    if (rank === 1) {
      return `${baseClasses} bg-yellow-400 bg-opacity-20 border-yellow-300 border-opacity-50`;
    }

    return `${baseClasses} bg-white bg-opacity-20 border-white border-opacity-30`;
  };

  return (
    <BackgroundAnimation>
      <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center mb-4 sm:mb-6">
            <GameButton
              variant="secondary"
              icon="←"
              onClick={onBack}
              className="mr-3 sm:mr-4"
            >
              Back
            </GameButton>
            <h1 className="text-xl sm:text-2xl font-bold text-white">🏆 Leaderboard</h1>
          </div>

          <div className="bg-blue-600 bg-opacity-80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 animate-scale-in border border-blue-400 border-opacity-30">
            <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{puzzleTitle}</h2>
            <div className="text-sm text-blue-100">
              {leaderboard?.entries.length || 0} solver{(leaderboard?.entries.length || 0) !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white mb-2">Loading rankings...</p>
              <p className="text-sm text-blue-200">Please wait</p>
            </div>
          ) : !leaderboard || leaderboard.entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-white mb-2">No solutions yet!</p>
              <p className="text-sm text-blue-200">Be the first to solve this puzzle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.entries.map((entry) => (
                <div key={entry.username} className={getRankClassName(entry.rank, entry.username)}>
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-lg font-bold min-w-[2rem] text-center flex-shrink-0">
                      {getRankEmoji(entry.rank)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                        <span className="truncate">{entry.username}</span>
                        {entry.username === currentUser && (
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full flex-shrink-0">
                            You
                          </span>
                        )}
                        {entry.rank === 1 && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full flex-shrink-0">
                            👑 Winner
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-blue-100">
                        Solved in {formatTime(entry.solveTime)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {leaderboard.entries.length >= 10 && (
                <p className="text-xs text-blue-200 text-center mt-4 pt-4 border-t border-blue-400 border-opacity-30">
                  Showing top 10 fastest solvers
                </p>
              )}
            </div>
          )}
          </div>

          <GameButton
            variant="secondary"
            icon="🏠"
            onClick={onBack}
            className="w-full mt-6"
          >
            Back to Menu
          </GameButton>
        </div>
      </div>
    </BackgroundAnimation>
  );
};