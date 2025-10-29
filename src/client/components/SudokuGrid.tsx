import { useState } from 'react';
import { Puzzle } from '../../shared/types/api';
import { SudokuGrid as SudokuGridType } from '../../shared/types/sudoku';
import { SoundManager } from '../../shared/utils/sound';

interface SudokuGridProps {
  puzzle: Puzzle;
  playerGrid: SudokuGridType;
  selectedCell: [number, number] | null;
  onCellSelect: (cell: [number, number] | null) => void;
  onCellChange: (row: number, col: number, value: number | null) => void;
  onWrongMove?: (row: number, col: number, value: number) => void;
  disabled?: boolean;
}

export const SudokuGrid = ({
  puzzle,
  playerGrid,
  selectedCell,
  onCellSelect,
  onCellChange,
  onWrongMove,
  disabled = false,
}: SudokuGridProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState<number | null>(null);
  const [feedbackCell, setFeedbackCell] = useState<{
    row: number;
    col: number;
    type: 'valid' | 'invalid';
  } | null>(null);
  const [wrongMoves, setWrongMoves] = useState<Set<string>>(new Set());

  const handleCellClick = (row: number, col: number) => {
    console.log('Cell clicked:', row, col, 'disabled:', disabled);
    if (disabled) return;

    // If clicking on a pre-filled cell, don't select it
    const puzzleRow = puzzle.grid[row];
    if (puzzleRow && puzzleRow[col] !== null) {
      console.log('Pre-filled cell, ignoring');
      return;
    }

    // If we have a selected emoji, place it directly
    if (selectedEmoji !== null) {
      const value = selectedEmoji + 1;
      
      // Check against actual solution instead of just validation rules
      const solutionRow = puzzle.solution[row];
      const correctValue = solutionRow ? solutionRow[col] : null;
      const isCorrect = correctValue === value;
      
      // Show feedback based on correctness
      setFeedbackCell({ row, col, type: isCorrect ? 'valid' : 'invalid' });
      setTimeout(() => setFeedbackCell(null), 1500);
      
      // Always place the move (even if incorrect)
      onCellChange(row, col, value);
      setSelectedEmoji(null); // Clear emoji selection after placing
      
      if (isCorrect) {
        // Play correct sound
        SoundManager.playCorrect();
        
        // Remove from wrong moves if it was previously wrong
        setWrongMoves(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${row}-${col}`);
          return newSet;
        });
      } else {
        // Play wrong sound
        SoundManager.playWrong();
        
        // Handle wrong move
        const moveKey = `${row}-${col}`;
        setWrongMoves(prev => new Set(prev).add(moveKey));
        onWrongMove?.(row, col, value);
        
        // Remove wrong move indicator after a delay
        setTimeout(() => {
          setWrongMoves(prev => {
            const newSet = new Set(prev);
            newSet.delete(moveKey);
            return newSet;
          });
        }, 2000);
      }
      return;
    }

    // Otherwise, select the cell
    const newSelection: [number, number] = [row, col];
    onCellSelect(
      selectedCell && selectedCell[0] === row && selectedCell[1] === col ? null : newSelection
    );
  };

  const handleEmojiClick = (emojiIndex: number) => {
    console.log('Emoji clicked:', emojiIndex, 'disabled:', disabled);
    if (disabled) return;

    // If clicking the same emoji, deselect it
    if (selectedEmoji === emojiIndex) {
      setSelectedEmoji(null);
      return;
    }

    // Select this emoji for placement
    setSelectedEmoji(emojiIndex);

    // If we have a selected cell, place the emoji immediately
    if (selectedCell) {
      const [row, col] = selectedCell;
      const value = emojiIndex + 1;
      
      // Check against actual solution instead of just validation rules
      const solutionRow = puzzle.solution[row];
      const correctValue = solutionRow ? solutionRow[col] : null;
      const isCorrect = correctValue === value;

      // Show feedback based on correctness
      setFeedbackCell({ row, col, type: isCorrect ? 'valid' : 'invalid' });
      setTimeout(() => setFeedbackCell(null), 1500);

      // Always place the move (even if incorrect)
      onCellChange(row, col, value);
      setSelectedEmoji(null); // Clear selection after placing
      
      if (isCorrect) {
        // Play correct sound
        SoundManager.playCorrect();
        
        // Remove from wrong moves if it was previously wrong
        setWrongMoves(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${row}-${col}`);
          return newSet;
        });
      } else {
        // Play wrong sound
        SoundManager.playWrong();
        
        // Handle wrong move
        const moveKey = `${row}-${col}`;
        setWrongMoves(prev => new Set(prev).add(moveKey));
        onWrongMove?.(row, col, value);
        
        // Remove wrong move indicator after a delay
        setTimeout(() => {
          setWrongMoves(prev => {
            const newSet = new Set(prev);
            newSet.delete(moveKey);
            return newSet;
          });
        }, 2000);
      }
    }
  };

  const handleClearCell = () => {
    if (!selectedCell || disabled) return;

    const [row, col] = selectedCell;
    onCellChange(row, col, null);
  };

  const getCellClassName = (row: number, col: number) => {
    // Add thicker borders to show 3x2 boxes
    const rightBorder = col === 2 ? 'border-r-4 border-r-gray-800' : 'border-r border-r-gray-300';
    const bottomBorder = row === 1 || row === 3 ? 'border-b-4 border-b-gray-800' : 'border-b border-b-gray-300';
    const leftBorder = 'border-l border-l-gray-300';
    const topBorder = 'border-t border-t-gray-300';
    
    const baseClasses = `w-12 h-12 ${topBorder} ${rightBorder} ${bottomBorder} ${leftBorder} flex items-center justify-center text-2xl cursor-pointer transition-all duration-300`;

    // Pre-filled cells
    const puzzleRow = puzzle.grid[row];
    if (puzzleRow && puzzleRow[col] !== null) {
      return `${baseClasses} bg-gray-100 cursor-not-allowed`;
    }

    // Feedback for valid/invalid moves
    if (feedbackCell && feedbackCell.row === row && feedbackCell.col === col) {
      if (feedbackCell.type === 'valid') {
        return `${baseClasses} bg-green-200 border-green-500 border-2 animate-pulse`;
      } else {
        return `${baseClasses} bg-red-200 border-red-500 border-2 animate-pulse`;
      }
    }

    // Selected cell
    if (selectedCell && selectedCell[0] === row && selectedCell[1] === col) {
      return `${baseClasses} border-2` + ' ' + 'bg-[#FFD700] border-[#4A90E2]';
    }

    // Cells in same row/column/box as selected
    if (selectedCell) {
      const [selRow, selCol] = selectedCell;
      const sameRow = row === selRow;
      const sameCol = col === selCol;
      
      // 3x2 box detection: 3 columns wide, 2 rows high
      const boxRow = Math.floor(row / 2);
      const boxCol = Math.floor(col / 3);
      const selBoxRow = Math.floor(selRow / 2);
      const selBoxCol = Math.floor(selCol / 3);
      const sameBox = boxRow === selBoxRow && boxCol === selBoxCol;

      if (sameRow || sameCol || sameBox) {
        return `${baseClasses}` + ' ' + 'bg-[#E3F2FD]';
      }
    }

    return `${baseClasses} bg-white hover:bg-gray-50`;
  };



  return (
    <div className="flex flex-col items-center gap-4">
      {/* Grid - Simple 6x6 layout */}
      <div className="grid grid-cols-6 gap-1 bg-gray-800 p-2 rounded-lg animate-scale-in">
        {Array.from({ length: 6 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => {
            const playerRow = playerGrid[row];
            const cellValue = playerRow ? playerRow[col] : null;
            const emoji = cellValue ? puzzle.emojis[cellValue - 1] : '';
            const isWrongMove = wrongMoves.has(`${row}-${col}`);
            const showCross = feedbackCell?.row === row && feedbackCell?.col === col && feedbackCell?.type === 'invalid';

            return (
              <div
                key={`cell-${row}-${col}`}
                className={getCellClassName(row, col)}
                onClick={() => handleCellClick(row, col)}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <span className={emoji ? 'animate-scale-in' : ''}>{emoji}</span>
                  {(showCross || isWrongMove) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-red-500 text-3xl font-bold animate-wiggle">✕</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ).flat()}
      </div>

      {/* Emoji Selector */}
      {!disabled && (
        <div className="flex flex-col items-center gap-3 animate-slide-up" style={{animationDelay: '0.3s'}}>
          <div className="flex gap-2">
            {puzzle.emojis.map((emoji, index) => (
              <button
                key={index}
                className={`w-12 h-12 text-2xl border-2 rounded-lg btn-hover-lift ${
                  selectedEmoji === index
                    ? 'text-white border-2 animate-pulse-gentle'
                    : 'bg-white border-gray-300'
                } ${selectedEmoji === index ? 'bg-[#357ABD] border-[#2E5A87]' : 'hover:border-[#357ABD] hover:bg-[#E3F2FD]'}`}
                style={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: selectedEmoji === index ? '0 4px 15px rgba(53, 122, 189, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onClick={() => handleEmojiClick(index)}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 text-sm bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              onClick={handleClearCell}
              disabled={!selectedCell}
            >
              Clear Cell
            </button>
            
            {selectedEmoji !== null && (
              <button
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setSelectedEmoji(null)}
              >
                Cancel Selection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
