import { Puzzle } from '../../shared/types/api';
import BackgroundAnimation from './BackgroundAnimation';
import MascotHeader from './MascotHeader';
import GameButton from './GameButton';
import { useState } from 'react';

interface MenuScreenProps {
  puzzle: Puzzle | null;
  username: string | null;
  onPlay: () => void;
  onShowHowToPlay: () => void;
  onShowLeaderboard: () => void;
  onCreateCustom?: () => void;
  onRefresh?: () => void;
  hasSubmitted?: boolean;
}

export const MenuScreen = ({
  puzzle,
  username,
  onPlay,
  onShowHowToPlay,
  onShowLeaderboard,
  onCreateCustom,
  onRefresh,
  hasSubmitted = false,
}: MenuScreenProps) => {
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  const handleForceNewPuzzle = async () => {
    setDebugLoading(true);
    setDebugMessage(null);
    
    try {
      console.log('[DEBUG] Attempting to force create new puzzle');
      const response = await fetch('/debug/force-new-puzzle');
      const data = await response.json();
      
      if (data.status === 'success') {
        setDebugMessage(`✅ ${data.message}`);
        console.log('[DEBUG] Success:', data);
        // Refresh the app state after creating new puzzle
        if (onRefresh) {
          setTimeout(() => {
            onRefresh();
          }, 1000);
        }
      } else {
        setDebugMessage(`❌ ${data.message}`);
        console.error('[DEBUG] Error:', data);
      }
    } catch (error) {
      console.error('[DEBUG] Failed to force create puzzle:', error);
      setDebugMessage(`❌ Failed to create new puzzle: ${error}`);
    } finally {
      setDebugLoading(false);
      // Clear message after 5 seconds
      setTimeout(() => setDebugMessage(null), 5000);
    }
  };
  if (!puzzle) {
    return (
      <BackgroundAnimation>
        <div className="h-screen-safe flex items-center justify-center p-4">
          <div className="text-center animate-fade-in">
            <img 
              src="/sudomojilogo.png" 
              alt="Sudomoji Logo" 
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 object-contain logo-image"
            />
            <h1 className="text-2xl font-bold text-white mb-2 text-shadow">No Active Puzzle</h1>
            <p className="text-gray-200">Check back later for new Sudomoji challenges!</p>
          </div>
        </div>
      </BackgroundAnimation>
    );
  }

  // Show COMPLETED if user has submitted, otherwise PLAY NOW
  const playButtonText = hasSubmitted ? "COMPLETED" : "PLAY NOW";
  const playButtonIcon = hasSubmitted ? "✅" : "🎮";

  return (
    <BackgroundAnimation>
      <div className="h-screen-safe p-2 sm:p-4 flex items-center justify-center overflow-hidden">
        <div className="max-w-sm sm:max-w-md w-full animate-fade-in flex flex-col justify-center h-full max-h-screen">
          {/* Mascot Header */}
          <MascotHeader username={username} />

          {/* Main Play Button */}
          <div className="flex-shrink-0 mb-4 sm:mb-6">
            <GameButton
              variant="primary"
              icon={playButtonIcon}
              onClick={onPlay}
              className="w-full animate-scale-in game-btn-compact"
              style={{animationDelay: '0.2s'}}
            >
              {playButtonText}
            </GameButton>
          </div>

          {/* Menu Options */}
          <div className="flex-shrink-0 space-y-2 sm:space-y-3 animate-slide-up" style={{animationDelay: '0.3s'}}>
            <GameButton
              variant="secondary"
              icon="🏆"
              onClick={onShowLeaderboard}
              className="w-full game-btn-compact"
            >
              Leaderboard
            </GameButton>

            {onCreateCustom && (
              <GameButton
                variant="creative"
                icon="🎨"
                onClick={onCreateCustom}
                className="w-full game-btn-compact"
              >
                Create Custom Sudomoji
              </GameButton>
            )}

            <GameButton
              variant="secondary"
              icon="📖"
              onClick={onShowHowToPlay}
              className="w-full game-btn-compact"
            >
              How to Play
            </GameButton>

            {/* Debug button - only show if puzzle number is 9 (stuck counter) */}
            {puzzle && puzzle.puzzleNumber === 9 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <GameButton
                  variant="secondary"
                  icon="🔧"
                  onClick={handleForceNewPuzzle}
                  disabled={debugLoading}
                  className="w-full game-btn-compact bg-red-600 hover:bg-red-700 text-white"
                >
                  {debugLoading ? 'Creating...' : 'Fix Stuck Counter (Debug)'}
                </GameButton>
                {debugMessage && (
                  <p className="text-center text-sm mt-2 text-white bg-black/50 rounded p-2">
                    {debugMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </BackgroundAnimation>
  );
};