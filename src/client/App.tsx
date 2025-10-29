import { useState, useEffect } from 'react';
import { useSudomoji } from './hooks/useSudomoji';
import { SudokuGrid } from './components/SudokuGrid';

import { SubmissionForm } from './components/SubmissionForm';
import { LoadingSpinner } from './components/LoadingSpinner';
import { MenuScreen } from './components/MenuScreen';
import { HowToPlayScreen } from './components/HowToPlayScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { CustomPuzzleCreator } from './components/CustomPuzzleCreator';
import { SoundManager } from '../shared/utils/sound';
type Screen = 'menu' | 'game' | 'howToPlay' | 'leaderboard' | 'customPuzzle';

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [creatingCustomPuzzle, setCreatingCustomPuzzle] = useState(false);

  // Log version for debugging
  console.log('🧩 Sudomoji Menu First!');

  // Initialize sound system
  useEffect(() => {
    SoundManager.initialize();
  }, []);

  const {
    loading,
    username,
    currentPuzzle,
    userSubmission,
    leaderboard,
    leaderboardLoading,
    playerGrid,
    selectedCell,
    setSelectedCell,
    setCellValue,
    submitSolution,
    submitting,
    handleWrongMove,
    timePenalty,
    wrongMoveCount,
    refreshCurrentPuzzle,

  } = useSudomoji();

  // Play completion sound when puzzle is solved
  useEffect(() => {
    if (userSubmission?.isCorrect) {
      // Play a special completion sound (we can use the correct sound for now)
      SoundManager.playCorrect();
    }
  }, [userSubmission?.isCorrect]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen animate-fade-in">
        <LoadingSpinner />
      </div>
    );
  }

  // Menu Screen
  if (currentScreen === 'menu') {
    return (
      <MenuScreen
        puzzle={currentPuzzle}
        username={username}
        onPlay={() => setCurrentScreen('game')}
        onShowHowToPlay={() => setCurrentScreen('howToPlay')}
        onShowLeaderboard={() => setCurrentScreen('leaderboard')}
        onCreateCustom={() => setCurrentScreen('customPuzzle')}
        onRefresh={refreshCurrentPuzzle}
        hasSubmitted={!!userSubmission}
      />
    );
  }

  // How to Play Screen
  if (currentScreen === 'howToPlay') {
    return <HowToPlayScreen onBack={() => setCurrentScreen('menu')} />;
  }

  // Leaderboard Screen
  if (currentScreen === 'leaderboard') {
    return (
      <LeaderboardScreen
        leaderboard={leaderboard}
        currentUser={username}
        puzzleTitle={currentPuzzle?.title || 'Current Puzzle'}
        onBack={() => setCurrentScreen('menu')}
        loading={leaderboardLoading}
      />
    );
  }

  // Custom Puzzle Creator Screen
  if (currentScreen === 'customPuzzle') {
    const handleCreateCustomPuzzle = async (requestData: { theme: any }) => {
      setCreatingCustomPuzzle(true);
      try {
        const response = await fetch('/api/create-custom-puzzle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: requestData.theme }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create custom puzzle');
        }

        const responseData = await response.json();
        console.log('Custom puzzle created:', responseData);
        
        // Show success message with puzzle details
        const puzzle = responseData.puzzle;
        const message = `🎉 Created successfully and posted to our subreddit!\n\n` +
                       `Look for the latest post with your title and username:\n` +
                       `"${puzzle.title}"\n\n` +
                       `Your custom Sudomoji is now live for everyone to play!`;
        
        alert(message);
        setCreatingCustomPuzzle(false);
        setCurrentScreen('menu');
      } catch (error) {
        console.error('Failed to create custom puzzle:', error);
        alert(`Failed to create custom puzzle: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setCreatingCustomPuzzle(false);
      }
    };

    return (
      <CustomPuzzleCreator
        onBack={() => setCurrentScreen('menu')}
        onCreatePuzzle={handleCreateCustomPuzzle}
        creating={creatingCustomPuzzle}
      />
    );
  }



  // Game Screen - only show if we have a puzzle and user clicked play
  if (currentScreen === 'game') {
    if (!currentPuzzle) {
      // If no puzzle available, go back to menu
      setCurrentScreen('menu');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      );
    }

    const hasSubmitted = !!userSubmission;
    const isCompleted = currentPuzzle.state === 'completed';

    return (
      <div className="game-background min-h-screen p-4 animate-fade-in">
        <div className="max-w-md mx-auto animate-slide-up relative z-10">
          {/* Game Header with Back Button */}
          <div className="flex items-center justify-between mb-4 pt-4">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="game-btn game-btn-secondary"
              style={{ minHeight: '40px', padding: '8px 16px', fontSize: '14px' }}
            >
              <span className="game-btn-icon">←</span>
              Menu
            </button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-white">{currentPuzzle.title}</h1>
              <div className="text-2xl">{currentPuzzle.emojis.join(' ')}</div>
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>

          <div className="bg-blue-600 bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 mb-6 animate-scale-in border border-blue-400 border-opacity-30">
            <SudokuGrid
              puzzle={currentPuzzle}
              playerGrid={playerGrid}
              selectedCell={selectedCell}
              onCellSelect={setSelectedCell}
              onCellChange={setCellValue}
              onWrongMove={handleWrongMove}
              disabled={hasSubmitted || isCompleted}
            />
          </div>

          {!hasSubmitted && !isCompleted && (
            <SubmissionForm
              puzzle={currentPuzzle}
              playerGrid={playerGrid}
              onSubmit={() => submitSolution()}
              submitting={submitting}
            />
          )}

          {hasSubmitted && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50 animate-fade-in">
              <div className="bg-blue-600 bg-opacity-95 backdrop-blur-sm rounded-2xl p-6 mx-4 max-w-sm w-full border border-blue-400 border-opacity-30 animate-scale-in">
                <div className="text-center">
                  {userSubmission.isCorrect ? (
                    <div>
                      <div className="text-4xl mb-3">🎉 🏆 🌟</div>
                      <h3 className="text-xl font-bold mb-3 text-white">Puzzle Solved!</h3>
                      {userSubmission.solveTime && (
                        <p className="text-blue-100 mb-4">
                          Completed in {Math.floor(userSubmission.solveTime / 1000)}s
                          {wrongMoveCount > 0 && (
                            <span className="text-red-300 text-sm ml-2">
                              (+{Math.floor(timePenalty / 1000)}s penalty)
                            </span>
                          )}
                        </p>
                      )}
                      
                      {/* Leaderboard update status */}
                      <div className="mb-4">
                        {leaderboardLoading ? (
                          <div className="flex items-center justify-center gap-2 text-blue-100">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Updating leaderboard...</span>
                          </div>
                        ) : (
                          <div className="text-green-300 text-sm">
                            ✅ Leaderboard updated!
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-3">
                        <button
                          onClick={() => setCurrentScreen('leaderboard')}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                          🏆 View Leaderboard
                        </button>
                        <button
                          onClick={() => setCurrentScreen('menu')}
                          className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                          🏠 Go to Home
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-3">❌</div>
                      <h3 className="text-xl font-bold mb-3 text-white">Keep Trying!</h3>
                      <p className="text-blue-100 mb-4">That's not quite right. Give it another shot!</p>
                      <button
                        onClick={() => setCurrentScreen('menu')}
                        className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                      >
                        🏠 Back to Menu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // This should never be reached, but just in case, default to menu
  return (
    <MenuScreen
      puzzle={currentPuzzle}
      username={username}
      onPlay={() => setCurrentScreen('game')}
      onShowHowToPlay={() => setCurrentScreen('howToPlay')}
      onShowLeaderboard={() => setCurrentScreen('leaderboard')}
      hasSubmitted={!!userSubmission}
    />
  );
};
