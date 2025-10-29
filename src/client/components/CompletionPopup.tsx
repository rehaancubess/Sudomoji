import { useEffect } from 'react';

interface CompletionPopupProps {
  isOpen: boolean;
  onViewLeaderboard: () => void;
  onClose: () => void;
}

export const CompletionPopup = ({
  isOpen,
  onViewLeaderboard,
  onClose,
}: CompletionPopupProps) => {
  // Close popup when clicking outside or pressing escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center animate-scale-in">
        {/* Celebration Icon */}
        <div className="text-6xl mb-4">🎉</div>
        
        {/* Great Work Message */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Great Work!</h2>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onViewLeaderboard}
            className="w-full py-3 px-4 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            View Leaderboard
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};