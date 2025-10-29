import { useState } from 'react';
import { EMOJI_THEMES } from '../../shared/types/sudoku';
import BackgroundAnimation from './BackgroundAnimation';
import GameButton from './GameButton';

// Helper function to extract emojis from a string
const extractEmojis = (text: string): string[] => {
  // More comprehensive emoji regex that handles compound emojis
  const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
  
  const matches = text.match(emojiRegex);
  return matches ? [...matches] : [];
};

interface CustomPuzzleCreatorProps {
  onBack: () => void;
  onCreatePuzzle: (data: { theme: CustomTheme }) => void;
  creating: boolean;
}

interface CustomTheme {
  title: string;
  emojis: string[];
  category?: string;
}

export const CustomPuzzleCreator = ({
  onBack,
  onCreatePuzzle,
  creating,
}: CustomPuzzleCreatorProps) => {
  const [title, setTitle] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof EMOJI_THEMES>('animals');
  const [customEmojis, setCustomEmojis] = useState('');
  const [useCustomEmojis, setUseCustomEmojis] = useState(false);

  const handleSubmit = () => {
    let emojis: string[];

    if (useCustomEmojis && customEmojis.trim()) {
      // Parse individual emojis from the string
      emojis = extractEmojis(customEmojis.trim());
      
      if (emojis.length !== 6) {
        alert('Please provide exactly 6 emojis');
        return;
      }
      
      // Check for uniqueness
      const uniqueEmojis = [...new Set(emojis)];
      if (uniqueEmojis.length !== 6) {
        alert('All 6 emojis must be unique (no duplicates)');
        return;
      }
      
      emojis = uniqueEmojis;
    } else {
      // Use predefined theme
      emojis = EMOJI_THEMES[selectedTheme];
    }

    const theme: CustomTheme = {
      title: title.trim() || `${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure`,
      emojis,
      category: selectedTheme,
    };

    onCreatePuzzle({ theme });
  };

  const isValid = () => {
    if (useCustomEmojis) {
      const emojis = extractEmojis(customEmojis.trim());
      const uniqueEmojis = [...new Set(emojis)];
      return uniqueEmojis.length === 6 && title.trim().length > 0;
    }
    return title.trim().length > 0;
  };

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
            <h1 className="text-2xl font-bold text-white">🎨 Create Custom</h1>
          </div>

          <div className="bg-blue-600 bg-opacity-80 backdrop-blur-sm rounded-2xl p-6 mb-6 animate-scale-in border border-blue-400 border-opacity-30 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Puzzle Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Ocean Adventure, Space Journey, Music Mania"
                  className="w-full px-3 py-2 bg-white border border-blue-300 border-opacity-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder-gray-500"
                  maxLength={50}
                />
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Choose Theme Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center text-blue-100">
                    <input
                      type="radio"
                      checked={!useCustomEmojis}
                      onChange={() => setUseCustomEmojis(false)}
                      className="mr-2"
                    />
                    <span>Use predefined theme</span>
                  </label>
                  <label className="flex items-center text-blue-100">
                    <input
                      type="radio"
                      checked={useCustomEmojis}
                      onChange={() => setUseCustomEmojis(true)}
                      className="mr-2"
                    />
                    <span>Create custom emoji set</span>
                  </label>
                </div>
              </div>

              {/* Predefined Theme Selector */}
              {!useCustomEmojis && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Select Theme
                  </label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value as keyof typeof EMOJI_THEMES)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 border-opacity-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900"
                  >
                    {Object.entries(EMOJI_THEMES).map(([key, emojis]) => (
                      <option key={key} value={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1)} - {emojis.join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Emojis Input */}
              {useCustomEmojis && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Custom Emojis (exactly 6 unique emojis) *
                  </label>
                  <input
                    type="text"
                    value={customEmojis}
                    onChange={(e) => setCustomEmojis(e.target.value)}
                    placeholder="🎵🎸🎹🎤🥁🎺"
                    className="w-full px-3 py-2 bg-white border border-blue-300 border-opacity-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder-gray-500 text-center text-2xl"
                    maxLength={12}
                  />
                  <p className="text-xs text-blue-200 mt-1">
                    Enter exactly 6 unique emojis (no spaces or separators needed)
                  </p>
                </div>
              )}

              {/* Info about sharing */}
              <div className="p-3 rounded-lg bg-blue-400 bg-opacity-30 border border-blue-300 border-opacity-50">
                <p className="text-sm text-blue-100">
                  🎯 Your custom puzzle will become the next official Sudomoji (e.g., #9, #10) and be posted to r/sudomoji for everyone to play and share!
                </p>
              </div>

              {/* Preview */}
              <div className="bg-white bg-opacity-20 rounded-lg p-4 border border-white border-opacity-30">
                <h3 className="text-sm font-medium text-white mb-2">Preview</h3>
                <div className="text-center">
                  <div className="text-lg font-semibold mb-1 text-white">
                    {title || 'Your Custom Puzzle Title'} - Sudomoji #[next] by [you]
                  </div>
                  <div className="text-2xl">
                    {useCustomEmojis
                      ? extractEmojis(customEmojis.trim()).slice(0, 6).join(' ') || '🎯 🎯 🎯 🎯 🎯 🎯'
                      : EMOJI_THEMES[selectedTheme].join(' ')
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <GameButton
            variant="creative"
            icon="🎨"
            onClick={handleSubmit}
            disabled={!isValid() || creating}
            className="w-full"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Custom Sudomoji...
              </span>
            ) : (
              'Create Custom Sudomoji'
            )}
          </GameButton>

          {/* Info */}
          <div className="mt-6 text-center text-xs text-blue-200">
            <p>Your custom puzzle will be generated with guaranteed logical progression</p>
            <p className="mt-1">Posted as "[Your Title] - Sudomoji #[number] by [username]" to r/sudomoji!</p>
          </div>
        </div>
      </div>
    </BackgroundAnimation>
  );
};