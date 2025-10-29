import { redis } from '@devvit/web/server';
import { Puzzle, PlayerSubmission } from '../../shared/types/api';
import { SudokuGenerator, SudokuValidator } from '../../shared/utils/sudoku';
import { EMOJI_THEMES } from '../../shared/types/sudoku';

import { LeaderboardManager } from './leaderboardManager';

export class PuzzleManager {
    private leaderboardManager = new LeaderboardManager();

    // Method to recover and validate puzzle counter
    private async validateAndRecoverCounter(): Promise<number> {
        console.log(`[COUNTER] Validating puzzle counter`);

        const counterValue = await redis.get('puzzle_counter');
        console.log(`[COUNTER] Current counter value: ${counterValue}`);

        if (!counterValue) {
            console.log(`[COUNTER] No counter found, scanning for highest puzzle number`);
            return await this.recoverCounterFromExistingPuzzles();
        }

        const counter = parseInt(counterValue);
        if (isNaN(counter) || counter < 0) {
            console.warn(`[COUNTER] Invalid counter value: ${counterValue}, recovering`);
            return await this.recoverCounterFromExistingPuzzles();
        }

        // Verify counter matches actual puzzles with more robust checking
        const highestPuzzle = await this.findHighestPuzzleNumber();
        console.log(`[COUNTER] Highest existing puzzle number: ${highestPuzzle}, current counter: ${counter}`);

        if (highestPuzzle > counter) {
            console.warn(`[COUNTER] Counter (${counter}) is behind highest puzzle (${highestPuzzle}), updating`);
            await redis.set('puzzle_counter', highestPuzzle.toString());
            console.log(`[COUNTER] Updated counter to match highest puzzle: ${highestPuzzle}`);
            return highestPuzzle;
        }

        // Additional check: if counter is significantly ahead of highest puzzle, there might be an issue
        if (counter > highestPuzzle + 10) {
            console.warn(`[COUNTER] Counter (${counter}) is significantly ahead of highest puzzle (${highestPuzzle})`);
            console.warn(`[COUNTER] This might indicate missing puzzle data or counter corruption`);
            // Don't auto-correct this case, just log it for investigation
        }

        console.log(`[COUNTER] Counter validation passed: ${counter}`);
        return counter;
    }

    private async recoverCounterFromExistingPuzzles(): Promise<number> {
        console.log(`[COUNTER] Recovering counter from existing puzzles`);
        const highestNumber = await this.findHighestPuzzleNumber();
        console.log(`[COUNTER] Found highest puzzle number: ${highestNumber}`);

        await redis.set('puzzle_counter', highestNumber.toString());
        console.log(`[COUNTER] Set counter to: ${highestNumber}`);

        return highestNumber;
    }

    private async findHighestPuzzleNumber(): Promise<number> {
        console.log(`[COUNTER] Scanning for highest puzzle number`);
        let highest = 0;
        let consecutiveEmpty = 0;
        const maxConsecutiveEmpty = 20; // Stop after 20 consecutive empty slots
        const maxScan = 2000; // Reasonable upper limit

        // More efficient scanning with early termination
        for (let i = 1; i <= maxScan; i++) {
            try {
                const exists = await redis.get(`puzzle_by_number:${i}`);
                if (exists) {
                    highest = i;
                    consecutiveEmpty = 0; // Reset counter when we find a puzzle
                    console.log(`[COUNTER] Found puzzle #${i}`);
                } else {
                    consecutiveEmpty++;
                    if (consecutiveEmpty >= maxConsecutiveEmpty && highest > 0) {
                        // If we haven't found a puzzle in many consecutive numbers, stop
                        console.log(`[COUNTER] Stopping scan after ${consecutiveEmpty} consecutive empty slots`);
                        break;
                    }
                }
            } catch (error) {
                console.error(`[COUNTER] Error checking puzzle #${i}:`, error);
                // Continue scanning despite individual errors
            }
        }

        console.log(`[COUNTER] Highest puzzle number found: ${highest} (scanned up to ${Math.min(highest + consecutiveEmpty, maxScan)})`);
        return highest;
    }

    // Simplified puzzle validation - no more complex migration logic
    private async validatePuzzleTitle(puzzle: Puzzle): Promise<Puzzle> {
        // Ensure puzzle has correct title format
        const expectedTitle = `Sudomoji #${puzzle.puzzleNumber}`;
        if (puzzle.title !== expectedTitle) {
            console.log(`[VALIDATE] Updating puzzle title from "${puzzle.title}" to "${expectedTitle}"`);
            puzzle.title = expectedTitle;

            // Update stored puzzle with correct title
            await Promise.all([
                redis.set('current_puzzle', JSON.stringify(puzzle)),
                redis.set(`puzzle:${puzzle.id}`, JSON.stringify(puzzle)),
                redis.set(`puzzle_by_number:${puzzle.puzzleNumber}`, JSON.stringify(puzzle)),
            ]);
        }
        return puzzle;
    }

    async getCurrentPuzzle(): Promise<Puzzle | null> {
        console.log(`[GET_CURRENT] Retrieving current puzzle`);
        const puzzleData = await redis.get('current_puzzle');
        if (!puzzleData) {
            // Create first puzzle if none exists
            console.log('[GET_CURRENT] No current puzzle found, creating new one');
            return await this.createNewPuzzle();
        }

        const puzzle: Puzzle = JSON.parse(puzzleData);
        console.log(`[GET_CURRENT] Found current puzzle: ${puzzle.title} (ID: ${puzzle.id})`);

        // Check what the current counter is
        const currentCounter = await redis.get('puzzle_counter');
        console.log(`[GET_CURRENT] Current puzzle counter: ${currentCounter}`);
        console.log(`[GET_CURRENT] Current puzzle number: ${puzzle.puzzleNumber}`);

        // If the counter is higher than the current puzzle number, we might need a new current puzzle
        if (currentCounter && parseInt(currentCounter) > puzzle.puzzleNumber) {
            console.log(`[GET_CURRENT] Counter (${currentCounter}) is higher than current puzzle (${puzzle.puzzleNumber}), checking for newer puzzle`);
            const newerPuzzleData = await redis.get(`puzzle_by_number:${currentCounter}`);
            if (newerPuzzleData) {
                const newerPuzzle = JSON.parse(newerPuzzleData);
                console.log(`[GET_CURRENT] Found newer puzzle: ${newerPuzzle.title}, setting as current`);
                await redis.set('current_puzzle', JSON.stringify(newerPuzzle));
                return newerPuzzle;
            }
        }

        // Validate puzzle title format
        return await this.validatePuzzleTitle(puzzle);
    }

    async createNewPuzzle(): Promise<Puzzle> {
        console.log(`[CREATE] Starting new puzzle creation - always increments counter`);

        // Validate and recover counter if needed
        await this.validateAndRecoverCounter();

        // Always increment counter for each new puzzle
        let puzzleNumber: number | undefined;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            attempts++;
            console.log(`[CREATE] Attempt ${attempts} to get next puzzle number`);

            try {
                // Get current counter value
                const currentNumber = await redis.get('puzzle_counter');
                console.log(`[CREATE] Current puzzle counter from Redis: ${currentNumber}`);

                puzzleNumber = currentNumber ? parseInt(currentNumber) + 1 : 1;
                console.log(`[CREATE] Attempting to reserve puzzle number: ${puzzleNumber}`);

                // Check if puzzle with this number already exists before incrementing
                const existingPuzzle = await redis.get(`puzzle_by_number:${puzzleNumber}`);
                if (existingPuzzle) {
                    console.warn(`[CREATE] Puzzle #${puzzleNumber} already exists, finding next available`);
                    // Find the next available number
                    let nextNumber = puzzleNumber + 1;
                    while (await redis.get(`puzzle_by_number:${nextNumber}`)) {
                        nextNumber++;
                        if (nextNumber > puzzleNumber + 100) {
                            throw new Error('Too many existing puzzles, possible data corruption');
                        }
                    }
                    puzzleNumber = nextNumber;
                    console.log(`[CREATE] Found next available number: ${puzzleNumber}`);
                }

                // Atomically set the new counter
                await redis.set('puzzle_counter', puzzleNumber.toString());
                console.log(`[CREATE] Successfully reserved puzzle number: ${puzzleNumber}`);

                // Verify the counter was set correctly
                const verifyCounter = await redis.get('puzzle_counter');
                if (parseInt(verifyCounter || '0') !== puzzleNumber) {
                    console.warn(`[CREATE] Counter verification failed on attempt ${attempts}, retrying`);
                    continue;
                }

                // Success - break out of retry loop
                break;

            } catch (error) {
                console.error(`[CREATE] Error on attempt ${attempts}:`, error);
                if (attempts >= maxAttempts) {
                    throw new Error(`Failed to reserve puzzle number after ${maxAttempts} attempts: ${error}`);
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            }
        }

        if (puzzleNumber === undefined) {
            throw new Error('Failed to determine puzzle number after all attempts');
        }

        // Generate the puzzle with harder difficulty (now includes built-in logical-move validation)
        console.log(`[CREATE] Generating puzzle with hard difficulty`);
        const { puzzle, solution } = SudokuGenerator.generatePuzzle('hard');

        // Random theme selection
        const themeNames = Object.keys(EMOJI_THEMES);
        const randomTheme = themeNames[Math.floor(Math.random() * themeNames.length)];
        const emojis = randomTheme ? EMOJI_THEMES[randomTheme as keyof typeof EMOJI_THEMES] : EMOJI_THEMES.animals;
        console.log(`[CREATE] Selected theme: ${randomTheme}`);

        const now = new Date();
        // Puzzles don't expire - they're permanent challenges
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

        const puzzle_obj: Puzzle = {
            id: `puzzle_${puzzleNumber}_${now.getTime()}`,
            puzzleNumber,
            title: `Sudomoji #${puzzleNumber}`,
            emojis,
            grid: puzzle,
            solution,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            state: 'active',
        };

        console.log(`[CREATE] Created puzzle object: ${puzzle_obj.title} (ID: ${puzzle_obj.id})`);

        // Store the puzzle with simple keys
        console.log(`[CREATE] Storing puzzle to Redis with keys:`);
        console.log(`[CREATE] - current_puzzle`);
        console.log(`[CREATE] - puzzle_counter: ${puzzleNumber}`);
        console.log(`[CREATE] - puzzle:${puzzle_obj.id}`);
        console.log(`[CREATE] - puzzle_by_number:${puzzleNumber}`);

        try {
            // Store puzzle data with transactional approach
            console.log(`[CREATE] Storing puzzle data for puzzle #${puzzleNumber}`);

            // First, store the puzzle data (but not as current puzzle yet)
            const puzzleDataOperations = [
                { key: `puzzle:${puzzle_obj.id}`, value: JSON.stringify(puzzle_obj), description: 'puzzle by ID' },
                { key: `puzzle_by_number:${puzzleNumber}`, value: JSON.stringify(puzzle_obj), description: 'puzzle by number' },
            ];

            for (const op of puzzleDataOperations) {
                try {
                    await redis.set(op.key, op.value);
                    console.log(`[CREATE] Successfully stored ${op.description}: ${op.key}`);
                } catch (error) {
                    console.error(`[CREATE] Error storing ${op.description} (${op.key}):`, error);
                    throw error;
                }
            }

            // Set as current puzzle so the client can find it
            await redis.set('current_puzzle', JSON.stringify(puzzle_obj));
            console.log(`[CREATE] Successfully set as current puzzle: ${puzzle_obj.title}`);

            console.log(`[CREATE] Successfully stored all puzzle data to Redis`);
        } catch (error) {
            console.error(`[CREATE] Error storing puzzle to Redis:`, error);

            // Comprehensive rollback - remove any partially created data
            try {
                console.log(`[CREATE] Starting rollback for puzzle #${puzzleNumber}`);

                // Remove puzzle data that might have been created
                await Promise.all([
                    redis.del(`puzzle:${puzzle_obj.id}`),
                    redis.del(`puzzle_by_number:${puzzleNumber}`)
                ]);

                // Rollback the counter to previous value
                const rollbackNumber = puzzleNumber - 1;
                await redis.set('puzzle_counter', rollbackNumber.toString());
                console.log(`[CREATE] Rolled back puzzle counter to ${rollbackNumber} and cleaned up partial data`);

                // Verify rollback
                const verifyRollback = await redis.get('puzzle_counter');
                console.log(`[CREATE] Rollback verification - counter is now: ${verifyRollback}`);

            } catch (rollbackError) {
                console.error(`[CREATE] CRITICAL: Error during rollback for puzzle #${puzzleNumber}:`, rollbackError);
                console.error(`[CREATE] CRITICAL: System may be in inconsistent state - manual intervention may be required`);
            }
            throw error;
        }

        // Verify the counter was updated and all data is consistent
        const verifyCounter = await redis.get('puzzle_counter');
        console.log(`[CREATE] Verified puzzle counter after update: ${verifyCounter}`);

        if (parseInt(verifyCounter || '0') !== puzzleNumber) {
            console.error(`[CREATE] Counter verification failed! Expected: ${puzzleNumber}, Got: ${verifyCounter}`);
            throw new Error(`Puzzle counter verification failed`);
        }

        // Verify the puzzle was stored correctly
        const verifyPuzzle = await redis.get(`puzzle_by_number:${puzzleNumber}`);
        if (!verifyPuzzle) {
            console.error(`[CREATE] Puzzle verification failed! Puzzle #${puzzleNumber} not found in storage`);
            throw new Error(`Puzzle storage verification failed`);
        }

        const storedPuzzle = JSON.parse(verifyPuzzle);
        if (storedPuzzle.puzzleNumber !== puzzleNumber) {
            console.error(`[CREATE] Puzzle number mismatch! Expected: ${puzzleNumber}, Stored: ${storedPuzzle.puzzleNumber}`);
            throw new Error(`Puzzle number verification failed`);
        }

        console.log(`[CREATE] All verifications passed for puzzle #${puzzleNumber}`);

        // Final validation: ensure puzzle is properly accessible
        const finalCheck = await this.getPuzzleById(puzzle_obj.id);
        if (!finalCheck) {
            console.error(`[CREATE] Final validation failed: puzzle ${puzzle_obj.id} not retrievable`);
            throw new Error('Puzzle creation validation failed');
        }

        console.log(`[CREATE] Puzzle creation completed successfully: ${finalCheck.title}`);
        return puzzle_obj;
    }

    async submitSolution(
        puzzleId: string,
        username: string,
        solution: number[][],
        startTime?: number
    ): Promise<{ isCorrect: boolean; rank?: number; solveTime?: number }> {
        const submissionId = `${puzzleId}_${username}_${Date.now()}`;
        console.log(`[SUBMIT] Starting submission ${submissionId} for user ${username}, puzzle ${puzzleId}`);
        console.log(`[SUBMIT] Start time provided: ${startTime}, current time: ${Date.now()}`);

        // Track submission processing state
        const processingState = {
            submissionId,
            puzzleId,
            username,
            startedAt: new Date().toISOString(),
            solutionValidated: false,
            submissionStored: false,
            leaderboardUpdated: false,
            nextPuzzleCreated: false,
            errors: [] as string[],
            completedAt: undefined as string | undefined,
        };

        try {
            const puzzle = await this.getPuzzleById(puzzleId);
            if (!puzzle) {
                console.error(`[SUBMIT] Puzzle not found: ${puzzleId}`);
                processingState.errors.push('Puzzle not found');
                throw new Error('Puzzle not found');
            }

            console.log(`[SUBMIT] Found puzzle: ${puzzle.title} (${puzzle.id})`);

            // No more migration checks - process all submissions normally

            const isCorrect =
                SudokuValidator.isSolved(solution) &&
                JSON.stringify(solution) === JSON.stringify(puzzle.solution);

            console.log(`[SUBMIT] Solution validation - isSolved: ${SudokuValidator.isSolved(solution)}, matches: ${JSON.stringify(solution) === JSON.stringify(puzzle.solution)}, isCorrect: ${isCorrect}`);
            processingState.solutionValidated = true;

            const submittedAt = new Date().toISOString();
            const solveTime = startTime ? Date.now() - startTime : undefined;

            console.log(`[SUBMIT] Calculated solve time: ${solveTime}ms`);

            const submission: PlayerSubmission = {
                username,
                solution,
                submittedAt,
                isCorrect,
                ...(solveTime !== undefined && { solveTime }),
            };

            // Store the submission
            console.log(`[SUBMIT] Storing submission to Redis: submission:${puzzleId}:${username}`);
            try {
                await redis.set(`submission:${puzzleId}:${username}`, JSON.stringify(submission));
                console.log(`[SUBMIT] Submission stored successfully`);
                processingState.submissionStored = true;
            } catch (error) {
                console.error(`[SUBMIT] Error storing submission:`, error);
                processingState.errors.push(`Submission storage failed: ${error}`);
                throw error;
            }

            let rank: number | undefined;

            console.log(`[SUBMIT] Checking leaderboard eligibility - isCorrect: ${isCorrect}, solveTime: ${solveTime}, solveTime !== undefined: ${solveTime !== undefined}`);
            if (isCorrect && solveTime !== undefined) {
                console.log(`[SUBMIT] Adding entry to leaderboard for puzzle ${puzzleId}`);
                try {
                    // Add to leaderboard
                    rank = await this.leaderboardManager.addEntry(puzzleId, {
                        username,
                        solveTime,
                        submittedAt,
                    });
                    console.log(`[SUBMIT] Successfully added to leaderboard with rank: ${rank}`);
                    processingState.leaderboardUpdated = true;

                    // No automatic puzzle creation - each puzzle is independent
                    console.log(`[SUBMIT] Puzzle ${puzzleId} solved by ${username}. Each puzzle is independent with its own leaderboard.`);
                } catch (error) {
                    console.error(`[SUBMIT] Error adding to leaderboard:`, error);
                    processingState.errors.push(`Leaderboard update failed: ${error}`);
                    // Don't throw here, just log the error so submission still succeeds
                }
            } else {
                console.log(`[SUBMIT] Not eligible for leaderboard - isCorrect: ${isCorrect}, solveTime: ${solveTime}, solveTime !== undefined: ${solveTime !== undefined}`);
                if (isCorrect && solveTime === undefined) {
                    console.warn(`[SUBMIT] WARNING: Correct solution but no solve time provided - this should not happen`);
                }
            }

            const result = {
                isCorrect,
                ...(rank !== undefined && { rank }),
                ...(solveTime !== undefined && { solveTime }),
            };

            // Log final processing state
            processingState.completedAt = new Date().toISOString();
            console.log(`[SUBMIT] Processing state for ${submissionId}:`, {
                solutionValidated: processingState.solutionValidated,
                submissionStored: processingState.submissionStored,
                leaderboardUpdated: processingState.leaderboardUpdated,
                nextPuzzleCreated: processingState.nextPuzzleCreated,
                errors: processingState.errors,
            });

            console.log(`[SUBMIT] Returning result:`, result);
            return result;

        } catch (error) {
            processingState.errors.push(`Submission failed: ${error}`);
            processingState.completedAt = new Date().toISOString();
            console.error(`[SUBMIT] Submission ${submissionId} failed:`, processingState);
            throw error;
        }
    }

    async getUserSubmission(puzzleId: string, username: string): Promise<PlayerSubmission | null> {
        const submissionData = await redis.get(`submission:${puzzleId}:${username}`);
        if (!submissionData) return null;

        const submission = JSON.parse(submissionData);
        console.log(`[GET_SUBMISSION] Found submission for puzzle ${puzzleId}, user ${username}`);
        return submission;
    }

    async clearUserSubmission(puzzleId: string, username: string): Promise<void> {
        await redis.del(`submission:${puzzleId}:${username}`);
    }

    async getPuzzleById(puzzleId: string): Promise<Puzzle | null> {
        const puzzleData = await redis.get(`puzzle:${puzzleId}`);
        return puzzleData ? JSON.parse(puzzleData) : null;
    }

    // Remove expiration logic - puzzles are permanent challenges

    // Puzzles are permanent challenges - no archiving needed

    // Remove date-based puzzle retrieval - using challenge numbers instead

    async getPuzzleHistory(limit: number = 10, offset: number = 0): Promise<Puzzle[]> {
        const counter = await redis.get('puzzle_counter');
        if (!counter) return [];

        const currentNumber = parseInt(counter);
        const puzzles: Puzzle[] = [];
        const startNumber = Math.max(1, currentNumber - offset - limit + 1);
        const endNumber = Math.max(1, currentNumber - offset);

        for (let i = startNumber; i <= endNumber; i++) {
            const puzzleData = await redis.get(`puzzle_by_number:${i}`);
            if (puzzleData) {
                puzzles.push(JSON.parse(puzzleData));
            }
        }

        return puzzles.sort((a, b) => b.puzzleNumber - a.puzzleNumber);
    }

    async getAllAvailablePuzzles(): Promise<Puzzle[]> {
        const counter = await redis.get('puzzle_counter');
        if (!counter) return [];

        const currentNumber = parseInt(counter);
        const puzzles: Puzzle[] = [];

        // Get all puzzles from 1 to current number
        for (let i = 1; i <= currentNumber; i++) {
            const puzzleData = await redis.get(`puzzle_by_number:${i}`);
            if (puzzleData) {
                puzzles.push(JSON.parse(puzzleData));
            }
        }

        return puzzles.sort((a, b) => b.puzzleNumber - a.puzzleNumber);
    }

    async createCustomPuzzle(theme: { title: string; emojis: string[] }, creator: string): Promise<Puzzle> {
        console.log(`[CREATE_CUSTOM] Creating custom puzzle "${theme.title}" by ${creator}`);

        // Validate and recover counter if needed (same as regular puzzles)
        await this.validateAndRecoverCounter();

        // Use the main puzzle counter - custom puzzles are part of the main sequence
        let puzzleNumber: number | undefined;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            attempts++;
            console.log(`[CREATE_CUSTOM] Attempt ${attempts} to get next puzzle number`);

            try {
                // Get current counter value
                const currentNumber = await redis.get('puzzle_counter');
                console.log(`[CREATE_CUSTOM] Current puzzle counter from Redis: ${currentNumber}`);

                puzzleNumber = currentNumber ? parseInt(currentNumber) + 1 : 1;
                console.log(`[CREATE_CUSTOM] Attempting to reserve puzzle number: ${puzzleNumber}`);

                // Check if puzzle with this number already exists before incrementing
                const existingPuzzle = await redis.get(`puzzle_by_number:${puzzleNumber}`);
                if (existingPuzzle) {
                    console.warn(`[CREATE_CUSTOM] Puzzle #${puzzleNumber} already exists, finding next available`);
                    // Find the next available number
                    let nextNumber = puzzleNumber + 1;
                    while (await redis.get(`puzzle_by_number:${nextNumber}`)) {
                        nextNumber++;
                        if (nextNumber > puzzleNumber + 100) {
                            throw new Error('Too many existing puzzles, possible data corruption');
                        }
                    }
                    puzzleNumber = nextNumber;
                    console.log(`[CREATE_CUSTOM] Found next available number: ${puzzleNumber}`);
                }

                // Atomically set the new counter
                await redis.set('puzzle_counter', puzzleNumber.toString());
                console.log(`[CREATE_CUSTOM] Successfully reserved puzzle number: ${puzzleNumber}`);

                // Verify the counter was set correctly
                const verifyCounter = await redis.get('puzzle_counter');
                if (parseInt(verifyCounter || '0') !== puzzleNumber) {
                    console.warn(`[CREATE_CUSTOM] Counter verification failed on attempt ${attempts}, retrying`);
                    continue;
                }

                // Success - break out of retry loop
                break;

            } catch (error) {
                console.error(`[CREATE_CUSTOM] Error on attempt ${attempts}:`, error);
                if (attempts >= maxAttempts) {
                    throw new Error(`Failed to reserve puzzle number after ${maxAttempts} attempts: ${error}`);
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            }
        }

        if (puzzleNumber === undefined) {
            throw new Error('Failed to determine puzzle number after all attempts');
        }

        // Generate the puzzle with harder difficulty (now includes built-in logical-move validation)
        const { puzzle, solution } = SudokuGenerator.generatePuzzle('hard');

        const now = new Date();
        // Custom puzzles are permanent like regular puzzles
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

        const customPuzzle: Puzzle = {
            id: `puzzle_${puzzleNumber}_${now.getTime()}`,
            puzzleNumber,
            title: `${theme.title} - Sudomoji #${puzzleNumber} by ${creator}`,
            emojis: theme.emojis,
            grid: puzzle,
            solution,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            state: 'active',
            creator, // Add creator field
        };

        console.log(`[CREATE_CUSTOM] Created custom puzzle object: ${customPuzzle.title} (ID: ${customPuzzle.id}) by ${creator}`);

        // Store the custom puzzle in the main puzzle sequence (not separate storage)
        console.log(`[CREATE_CUSTOM] Storing custom puzzle to Redis with keys:`);
        console.log(`[CREATE_CUSTOM] - puzzle:${customPuzzle.id}`);
        console.log(`[CREATE_CUSTOM] - puzzle_by_number:${puzzleNumber}`);

        try {
            // Store puzzle data
            const puzzleDataOperations = [
                { key: `puzzle:${customPuzzle.id}`, value: JSON.stringify(customPuzzle), description: 'custom puzzle by ID' },
                { key: `puzzle_by_number:${puzzleNumber}`, value: JSON.stringify(customPuzzle), description: 'custom puzzle by number' },
            ];

            for (const op of puzzleDataOperations) {
                try {
                    await redis.set(op.key, op.value);
                    console.log(`[CREATE_CUSTOM] Successfully stored ${op.description}: ${op.key}`);
                } catch (error) {
                    console.error(`[CREATE_CUSTOM] Error storing ${op.description} (${op.key}):`, error);
                    throw error;
                }
            }

            console.log(`[CREATE_CUSTOM] Successfully stored all custom puzzle data to Redis`);
        } catch (error) {
            console.error(`[CREATE_CUSTOM] Error storing custom puzzle to Redis:`, error);

            // Comprehensive rollback - remove any partially created data
            try {
                console.log(`[CREATE_CUSTOM] Starting rollback for custom puzzle #${puzzleNumber}`);

                // Remove puzzle data that might have been created
                await Promise.all([
                    redis.del(`puzzle:${customPuzzle.id}`),
                    redis.del(`puzzle_by_number:${puzzleNumber}`)
                ]);

                // Rollback the counter to previous value
                const rollbackNumber = puzzleNumber - 1;
                await redis.set('puzzle_counter', rollbackNumber.toString());
                console.log(`[CREATE_CUSTOM] Rolled back puzzle counter to ${rollbackNumber} and cleaned up partial data`);

            } catch (rollbackError) {
                console.error(`[CREATE_CUSTOM] CRITICAL: Error during rollback for custom puzzle #${puzzleNumber}:`, rollbackError);
            }
            throw error;
        }

        // Verify the counter was updated and all data is consistent
        const verifyCounter = await redis.get('puzzle_counter');
        console.log(`[CREATE_CUSTOM] Verified puzzle counter after custom puzzle creation: ${verifyCounter}`);

        if (parseInt(verifyCounter || '0') !== puzzleNumber) {
            console.error(`[CREATE_CUSTOM] Counter verification failed! Expected: ${puzzleNumber}, Got: ${verifyCounter}`);
            throw new Error(`Custom puzzle counter verification failed`);
        }

        // Verify the puzzle was stored correctly
        const verifyPuzzle = await redis.get(`puzzle_by_number:${puzzleNumber}`);
        if (!verifyPuzzle) {
            console.error(`[CREATE_CUSTOM] Custom puzzle verification failed! Puzzle #${puzzleNumber} not found in storage`);
            throw new Error(`Custom puzzle storage verification failed`);
        }

        console.log(`[CREATE_CUSTOM] All verifications passed for custom puzzle #${puzzleNumber} by ${creator}`);

        return customPuzzle;
    }

    // Method to force create and set a new current puzzle
    async forceCreateNewCurrentPuzzle(): Promise<Puzzle> {
        console.log(`[FORCE_CREATE] Force creating new puzzle with incremented number`);

        // Create new puzzle (always increments)
        const newPuzzle = await this.createNewPuzzle();

        // Set it as current puzzle
        await redis.set('current_puzzle', JSON.stringify(newPuzzle));
        console.log(`[FORCE_CREATE] Set new puzzle as current: ${newPuzzle.title}`);

        console.log(`[FORCE_CREATE] Created fresh puzzle: ${newPuzzle.title}`);
        return newPuzzle;
    }

    // Method to clear migration marker for current puzzle
    async clearCurrentPuzzleMigration(): Promise<void> {
        console.log(`[CLEAR_MIGRATION] Clearing migration marker for current puzzle`);
        const currentPuzzle = await redis.get('current_puzzle');
        if (currentPuzzle) {
            const currentPuzzleObj = JSON.parse(currentPuzzle);
            console.log(`[CLEAR_MIGRATION] Clearing migration marker for: ${currentPuzzleObj.id}`);
            await redis.del(`migrated:${currentPuzzleObj.id}`);
            console.log(`[CLEAR_MIGRATION] Migration marker cleared - submissions will now be accepted`);
        } else {
            console.log(`[CLEAR_MIGRATION] No current puzzle found`);
        }
    }

    // Method for testing and validating system state
    async validateSystemState(): Promise<{ isValid: boolean; issues: string[]; details: any }> {
        console.log(`[VALIDATE] Starting system state validation`);
        const issues: string[] = [];
        const details: any = {};

        try {
            // Check puzzle counter consistency
            const counter = await redis.get('puzzle_counter');
            details.counter = counter;

            if (!counter) {
                issues.push('Puzzle counter is missing');
            } else {
                const counterNum = parseInt(counter);
                details.counterNum = counterNum;

                if (isNaN(counterNum) || counterNum < 0) {
                    issues.push(`Invalid puzzle counter: ${counter}`);
                }

                // Check if counter matches highest puzzle
                const highestPuzzle = await this.findHighestPuzzleNumber();
                details.highestPuzzle = highestPuzzle;

                if (highestPuzzle > counterNum) {
                    issues.push(`Counter (${counterNum}) is behind highest puzzle (${highestPuzzle})`);
                }

                if (counterNum > highestPuzzle + 10) {
                    issues.push(`Counter (${counterNum}) is significantly ahead of highest puzzle (${highestPuzzle}) - possible corruption`);
                }
            }

            // Check current puzzle exists and is valid
            const currentPuzzle = await redis.get('current_puzzle');
            if (!currentPuzzle) {
                issues.push('No current puzzle found');
                details.currentPuzzle = null;
            } else {
                try {
                    const puzzle = JSON.parse(currentPuzzle);
                    details.currentPuzzle = {
                        id: puzzle.id,
                        puzzleNumber: puzzle.puzzleNumber,
                        title: puzzle.title
                    };

                    if (!puzzle.id || !puzzle.puzzleNumber || !puzzle.title) {
                        issues.push('Current puzzle is missing required fields');
                    }

                    // Verify puzzle is accessible by ID
                    const puzzleById = await this.getPuzzleById(puzzle.id);
                    if (!puzzleById) {
                        issues.push(`Current puzzle ${puzzle.id} not accessible by ID`);
                    }

                    // Check if current puzzle is migrated
                    const isMigrated = await redis.get(`migrated:${puzzle.id}`);
                    details.currentPuzzleMigrated = !!isMigrated;

                } catch (error) {
                    issues.push(`Current puzzle data is corrupted: ${error}`);
                    details.currentPuzzleError = error;
                }
            }

            console.log(`[VALIDATE] Validation completed. Issues found: ${issues.length}`);
            console.log(`[VALIDATE] Details:`, details);

            return {
                isValid: issues.length === 0,
                issues,
                details
            };

        } catch (error) {
            console.error(`[VALIDATE] Validation failed:`, error);
            issues.push(`Validation error: ${error}`);
            return {
                isValid: false,
                issues,
                details: { ...details, validationError: error }
            };
        }
    }

    // Method to fix stuck counter issues
    async fixStuckCounter(): Promise<{ success: boolean; message: string; details: any }> {
        console.log(`[FIX_COUNTER] Starting stuck counter fix`);

        try {
            const validation = await this.validateSystemState();
            console.log(`[FIX_COUNTER] Current state:`, validation);

            if (validation.isValid) {
                return {
                    success: true,
                    message: 'Counter is not stuck - system state is valid',
                    details: validation.details
                };
            }

            // Force recovery of counter
            console.log(`[FIX_COUNTER] Forcing counter recovery`);
            const recoveredCounter = await this.recoverCounterFromExistingPuzzles();

            // Validate the fix
            const postFixValidation = await this.validateSystemState();

            if (postFixValidation.isValid) {
                return {
                    success: true,
                    message: `Counter fixed successfully - recovered to ${recoveredCounter}`,
                    details: {
                        beforeFix: validation.details,
                        afterFix: postFixValidation.details,
                        recoveredCounter
                    }
                };
            } else {
                return {
                    success: false,
                    message: 'Counter fix attempted but issues remain',
                    details: {
                        beforeFix: validation.details,
                        afterFix: postFixValidation.details,
                        remainingIssues: postFixValidation.issues
                    }
                };
            }

        } catch (error) {
            console.error(`[FIX_COUNTER] Error during counter fix:`, error);
            return {
                success: false,
                message: `Counter fix failed: ${error}`,
                details: { error }
            };
        }
    }

    // Method to purge all data and start fresh
    async purgeAllData(): Promise<{ success: boolean; message: string; details: any }> {
        console.log(`[PURGE] Starting complete data purge`);

        try {
            const purgeResults = {
                puzzlesDeleted: 0,
                submissionsDeleted: 0,
                leaderboardsDeleted: 0,
                migrationMarkersDeleted: 0,
                countersReset: 0
            };

            // Get current counter to know how many puzzles to check
            const currentCounter = await redis.get('puzzle_counter');
            const maxPuzzles = currentCounter ? parseInt(currentCounter) + 10 : 100; // Add buffer

            console.log(`[PURGE] Scanning up to ${maxPuzzles} puzzles for deletion`);

            // Delete all puzzle data
            for (let i = 1; i <= maxPuzzles; i++) {
                try {
                    // Delete puzzle by number
                    const puzzleByNumber = await redis.get(`puzzle_by_number:${i}`);
                    if (puzzleByNumber) {
                        const puzzle = JSON.parse(puzzleByNumber);

                        // Delete all related data for this puzzle
                        await Promise.all([
                            redis.del(`puzzle_by_number:${i}`),
                            redis.del(`puzzle:${puzzle.id}`),
                            redis.del(`leaderboard:${puzzle.id}`),
                            redis.del(`migrated:${puzzle.id}`)
                        ]);

                        purgeResults.puzzlesDeleted++;
                        purgeResults.leaderboardsDeleted++;
                        purgeResults.migrationMarkersDeleted++;

                        console.log(`[PURGE] Deleted puzzle #${i}: ${puzzle.title}`);
                    }
                } catch (error) {
                    console.warn(`[PURGE] Error deleting puzzle #${i}:`, error);
                }
            }

            // Delete submissions (scan for common patterns)
            console.log(`[PURGE] Scanning for submissions to delete`);
            for (let i = 1; i <= maxPuzzles; i++) {
                try {
                    // This is a simplified approach - in a real Redis setup, you'd use SCAN
                    // For now, we'll just delete known patterns
                    const puzzleData = await redis.get(`puzzle_by_number:${i}`);
                    if (puzzleData) {
                        const puzzle = JSON.parse(puzzleData);
                        // Try to delete common submission patterns
                        const commonUsernames = ['Cubosaic-RehaanCubes', 'anonymous', 'testuser'];
                        for (const username of commonUsernames) {
                            const submissionKey = `submission:${puzzle.id}:${username}`;
                            try {
                                await redis.del(submissionKey);
                                purgeResults.submissionsDeleted++;
                                console.log(`[PURGE] Deleted submission: ${submissionKey}`);
                            } catch (error) {
                                console.warn(`[PURGE] Error deleting submission ${submissionKey}:`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`[PURGE] Error deleting submissions for puzzle #${i}:`, error);
                }
            }

            // Reset all counters and current puzzle
            await Promise.all([
                redis.del('puzzle_counter'),
                redis.del('custom_puzzle_counter'),
                redis.del('current_puzzle')
            ]);
            purgeResults.countersReset = 3;

            console.log(`[PURGE] Purge completed:`, purgeResults);

            return {
                success: true,
                message: 'All data purged successfully',
                details: purgeResults
            };

        } catch (error) {
            console.error(`[PURGE] Error during data purge:`, error);
            return {
                success: false,
                message: `Data purge failed: ${error}`,
                details: { error }
            };
        }
    }
}
