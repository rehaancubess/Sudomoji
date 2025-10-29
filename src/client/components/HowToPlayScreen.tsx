import BackgroundAnimation from './BackgroundAnimation';
import GameButton from './GameButton';

interface HowToPlayScreenProps {
  onBack: () => void;
}

export const HowToPlayScreen = ({ onBack }: HowToPlayScreenProps) => {
  return (
    <BackgroundAnimation>
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="max-w-md w-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center mb-6">
            <GameButton
              variant="secondary"
              icon="←"
              onClick={onBack}
              className="mr-4"
            >
              Back
            </GameButton>
            <h1 className="text-2xl font-bold text-white">📖 How to Play</h1>
          </div>

          <div className="bg-blue-600 bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 space-y-6 animate-scale-in border border-blue-400 border-opacity-30 max-h-[70vh] overflow-y-auto">
            {/* Basic Rules */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-white">🎯 Basic Rules</h2>
              <div className="space-y-2 text-sm text-blue-100">
                <p>Fill the 6×6 grid so each emoji appears exactly once in:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Each row (6 emojis)</li>
                  <li>Each column (6 emojis)</li>
                  <li>Each 3×2 box (6 emojis)</li>
                </ul>
              </div>
            </div>

            {/* How to Play */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-white">🎮 How to Play</h2>
              <div className="space-y-3 text-sm text-blue-100">
                <div className="bg-blue-400 bg-opacity-30 p-3 rounded-lg border border-blue-300 border-opacity-50">
                  <p className="font-medium text-blue-100 mb-1">Method 1: Select Cell First</p>
                  <p className="text-blue-200">Tap a cell → Choose an emoji to place</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 p-3 rounded-lg border border-green-300 border-opacity-50">
                  <p className="font-medium text-green-100 mb-1">Method 2: Select Emoji First</p>
                  <p className="text-green-200">Tap an emoji → Tap cells to place it</p>
                </div>
              </div>
            </div>

            {/* Visual Feedback */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-white">🎨 Visual Feedback</h2>
              <div className="space-y-2 text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-400 bg-opacity-50 border border-green-300 rounded"></div>
                  <span>Valid move - emoji placed successfully</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-400 bg-opacity-50 border border-red-300 rounded"></div>
                  <span>Invalid move - conflicts with rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 bg-opacity-50 border border-blue-300 rounded"></div>
                  <span>Selected cell or related cells</span>
                </div>
              </div>
            </div>

            {/* Competition */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-white">🏆 Competition</h2>
              <div className="space-y-2 text-sm text-blue-100">
                <p>• Timer starts on your first move</p>
                <p>• Fastest correct solver wins the day</p>
                <p>• Winner designs tomorrow's puzzle theme</p>
                <p>• Top 10 solvers shown on leaderboard</p>
              </div>
            </div>

            {/* Example Grid */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-white">📝 Example</h2>
              <div className="bg-white bg-opacity-20 p-4 rounded-lg border border-white border-opacity-30">
                <div className="grid grid-cols-6 gap-1 w-fit mx-auto">
                  {[
                    ['🦊', '🐸', '🦄', '🐝', '🐧', '🐼'],
                    ['🐝', '🐧', '🐼', '🦊', '🐸', '🦄'],
                    ['🐸', '🦄', '🦊', '🐧', '🐼', '🐝'],
                    ['🐧', '🐼', '🐝', '🐸', '🦄', '🦊'],
                    ['🦄', '🦊', '🐸', '🐼', '🐝', '🐧'],
                    ['🐼', '🐝', '🐧', '🦄', '🦊', '🐸'],
                  ].map((row, i) =>
                    row.map((emoji, j) => (
                      <div
                        key={`${i}-${j}`}
                        className="w-6 h-6 text-xs flex items-center justify-center border border-blue-300 bg-white bg-opacity-80"
                      >
                        {emoji}
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-blue-200 text-center mt-2">
                  Complete solution example
                </p>
              </div>
            </div>
          </div>

          <GameButton
            variant="primary"
            icon="🎮"
            onClick={onBack}
            className="w-full mt-6"
          >
            Got it! Let's Play
          </GameButton>
        </div>
      </div>
    </BackgroundAnimation>
  );
};