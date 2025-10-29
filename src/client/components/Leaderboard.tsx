import { Leaderboard as LeaderboardType } from '../../shared/types/api';
import { formatTime } from '../../shared/utils/time';

interface LeaderboardProps {
  leaderboard: LeaderboardType | null;
  currentUser: string | null;
  loading?: boolean;
}

export const Leaderboard = ({ leaderboard, currentUser, loading = false }: LeaderboardProps) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-center">🏆 Leaderboard</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Loading rankings...</span>
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-center">🏆 Leaderboard</h3>
        <p className="text-gray-500 text-center">No solutions yet. Be the first!</p>
      </div>
    );
  }

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
    const baseClasses = 'flex items-center justify-between p-3 rounded-lg';

    if (username === currentUser) {
      return `${baseClasses} bg-blue-50 border border-blue-200`;
    }

    if (rank === 1) {
      return `${baseClasses} bg-yellow-50 border border-yellow-200`;
    }

    return `${baseClasses} bg-gray-50`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-center">🏆 Leaderboard</h3>

      <div className="space-y-2">
        {leaderboard.entries.map((entry) => (
          <div key={entry.username} className={getRankClassName(entry.rank, entry.username)}>
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium min-w-[2rem]">{getRankEmoji(entry.rank)}</span>
              <div>
                <div className="font-medium text-gray-900">
                  {entry.username}
                  {entry.username === currentUser && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">{formatTime(entry.solveTime)}</div>
              </div>
            </div>

            {entry.rank === 1 && (
              <div className="text-right">
                <div className="text-xs text-yellow-600 font-medium">👑 Winner</div>
                <div className="text-xs text-gray-500">Designs tomorrow</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {leaderboard.entries.length >= 10 && (
        <p className="text-xs text-gray-500 text-center mt-4">Showing top 10 fastest solvers</p>
      )}
    </div>
  );
};
