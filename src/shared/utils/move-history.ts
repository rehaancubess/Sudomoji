import { SudokuGrid } from '../types/sudoku';
import {
    MoveHistoryEntry,
    PlayerMove,
    SolvingTechnique,
    ErrorLocation
} from '../types/hint-system';

export class MoveHistoryManager {
    private history: MoveHistoryEntry[] = [];
    private maxHistorySize: number = 100; // Limit history to prevent memory issues

    /**
     * Add a move to the history
     */
    addMove(
        move: PlayerMove,
        boardStateBefore: SudokuGrid,
        wasHintUsed: boolean = false,
        technique?: SolvingTechnique
    ): void {
        const entry: MoveHistoryEntry = {
            move,
            timestamp: Date.now(),
            boardStateBefore: this.deepCopyGrid(boardStateBefore),
            wasHintUsed,
            ...(technique && { technique })
        };

        this.history.push(entry);

        // Trim history if it gets too long
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    /**
     * Get the complete move history
     */
    getHistory(): MoveHistoryEntry[] {
        return [...this.history];
    }

    /**
     * Get the last N moves
     */
    getRecentMoves(count: number): MoveHistoryEntry[] {
        return this.history.slice(-count);
    }

    /**
     * Get the last move
     */
    getLastMove(): MoveHistoryEntry | null {
        return this.history.length > 0 ? this.history[this.history.length - 1]! : null;
    }

    /**
     * Clear all history
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Remove the last move from history (for undo functionality)
     */
    removeLastMove(): MoveHistoryEntry | null {
        return this.history.pop() || null;
    }

    /**
     * Get board state from a specific point in history
     */
    getBoardStateAtIndex(index: number): SudokuGrid | null {
        const entry = this.history[index];
        return entry ? this.deepCopyGrid(entry.boardStateBefore) : null;
    }

    /**
     * Find moves that might have caused errors
     */
    findPotentialErrorMoves(errors: ErrorLocation[]): MoveHistoryEntry[] {
        const errorCells = new Set(errors.map(e => `${e.row}-${e.col}`));
        const potentialErrorMoves: MoveHistoryEntry[] = [];

        // Look at recent moves that affected error cells
        const recentMoves = this.getRecentMoves(10); // Check last 10 moves

        for (const entry of recentMoves) {
            const cellKey = `${entry.move.row}-${entry.move.col}`;
            if (errorCells.has(cellKey)) {
                potentialErrorMoves.push(entry);
            }
        }

        return potentialErrorMoves;
    }

    /**
     * Get statistics about move history
     */
    getStatistics(): {
        totalMoves: number;
        hintsUsed: number;
        hintPercentage: number;
        techniquesUsed: { [key in SolvingTechnique]?: number };
        averageTimeBetweenMoves: number;
    } {
        const totalMoves = this.history.length;
        const hintsUsed = this.history.filter(entry => entry.wasHintUsed).length;
        const hintPercentage = totalMoves > 0 ? (hintsUsed / totalMoves) * 100 : 0;

        // Count techniques used
        const techniquesUsed: { [key in SolvingTechnique]?: number } = {};
        for (const entry of this.history) {
            if (entry.technique) {
                techniquesUsed[entry.technique] = (techniquesUsed[entry.technique] || 0) + 1;
            }
        }

        // Calculate average time between moves
        let averageTimeBetweenMoves = 0;
        if (this.history.length > 1) {
            const timeDifferences: number[] = [];
            for (let i = 1; i < this.history.length; i++) {
                const timeDiff = this.history[i]!.timestamp - this.history[i - 1]!.timestamp;
                timeDifferences.push(timeDiff);
            }
            averageTimeBetweenMoves = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;
        }

        return {
            totalMoves,
            hintsUsed,
            hintPercentage,
            techniquesUsed,
            averageTimeBetweenMoves
        };
    }

    /**
     * Generate suggestions for error recovery
     */
    generateRecoverySuggestions(errors: ErrorLocation[]): string[] {
        const suggestions: string[] = [];
        const errorMoves = this.findPotentialErrorMoves(errors);

        if (errorMoves.length === 0) {
            suggestions.push("Try using a hint to find the next logical move.");
            return suggestions;
        }

        // Suggest undoing recent moves that might have caused errors
        const recentErrorMoves = errorMoves.slice(-3); // Last 3 error-related moves
        for (const move of recentErrorMoves) {
            const cellName = `R${move.move.row + 1}C${move.move.col + 1}`;
            const timeAgo = this.formatTimeAgo(Date.now() - move.timestamp);
            suggestions.push(
                `Consider reviewing the move at ${cellName} (${move.move.value}) made ${timeAgo}.`
            );
        }

        // If many recent moves were hints, suggest manual solving
        const recentHints = this.getRecentMoves(5).filter(entry => entry.wasHintUsed);
        if (recentHints.length >= 3) {
            suggestions.push("Try solving a few moves manually to better understand the puzzle state.");
        }

        return suggestions;
    }

    /**
     * Check if the player is stuck (no progress in recent moves)
     */
    isPlayerStuck(): boolean {
        const recentMoves = this.getRecentMoves(5);

        // If less than 5 moves, not stuck yet
        if (recentMoves.length < 5) {
            return false;
        }

        // Check if all recent moves were hints or undos
        const allHintsOrUndos = recentMoves.every(entry =>
            entry.wasHintUsed || entry.move.isUndo
        );

        return allHintsOrUndos;
    }

    /**
     * Deep copy a grid to preserve history
     */
    private deepCopyGrid(grid: SudokuGrid): SudokuGrid {
        return grid.map(row => [...row]);
    }

    /**
     * Format time difference in human-readable format
     */
    private formatTimeAgo(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
        }
    }

    /**
     * Export history for debugging or analysis
     */
    exportHistory(): string {
        return JSON.stringify(this.history, null, 2);
    }

    /**
     * Import history from exported data
     */
    importHistory(historyData: string): boolean {
        try {
            const imported = JSON.parse(historyData) as MoveHistoryEntry[];

            // Validate the imported data
            if (Array.isArray(imported) && this.validateHistoryEntries(imported)) {
                this.history = imported;
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to import history:', error);
            return false;
        }
    }

    /**
     * Validate history entries structure
     */
    private validateHistoryEntries(entries: any[]): entries is MoveHistoryEntry[] {
        return entries.every(entry =>
            entry &&
            typeof entry.timestamp === 'number' &&
            entry.move &&
            typeof entry.move.row === 'number' &&
            typeof entry.move.col === 'number' &&
            Array.isArray(entry.boardStateBefore) &&
            typeof entry.wasHintUsed === 'boolean'
        );
    }
}