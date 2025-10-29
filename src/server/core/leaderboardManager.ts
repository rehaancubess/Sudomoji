import { redis } from '@devvit/web/server';
import { Leaderboard, LeaderboardEntry } from '../../shared/types/api';

export class LeaderboardManager {
  async addEntry(puzzleId: string, entry: Omit<LeaderboardEntry, 'rank'>): Promise<number> {
    console.log(`[LEADERBOARD] Adding entry for user ${entry.username} to puzzle ${puzzleId}`);
    console.log(`[LEADERBOARD] Entry data:`, { username: entry.username, solveTime: entry.solveTime, submittedAt: entry.submittedAt });
    
    // Validate required fields
    if (!puzzleId) {
      console.error(`[LEADERBOARD] Invalid puzzleId: ${puzzleId}`);
      throw new Error('puzzleId is required');
    }
    
    if (!entry.username) {
      console.error(`[LEADERBOARD] Invalid username: ${entry.username}`);
      throw new Error('username is required');
    }
    
    if (typeof entry.solveTime !== 'number' || entry.solveTime < 0) {
      console.error(`[LEADERBOARD] Invalid solveTime: ${entry.solveTime}`);
      throw new Error('solveTime must be a non-negative number');
    }
    
    if (!entry.submittedAt) {
      console.error(`[LEADERBOARD] Invalid submittedAt: ${entry.submittedAt}`);
      throw new Error('submittedAt is required');
    }
    
    console.log(`[LEADERBOARD] Entry validation passed`);
    
    const leaderboard = await this.getLeaderboard(puzzleId);
    console.log(`[LEADERBOARD] Current leaderboard has ${leaderboard.entries.length} entries`);

    // Add new entry
    const newEntry: LeaderboardEntry = {
      ...entry,
      rank: 0, // Will be calculated after sorting
    };

    leaderboard.entries.push(newEntry);
    console.log(`[LEADERBOARD] Added new entry, total entries now: ${leaderboard.entries.length}`);

    // Sort by solve time (fastest first)
    leaderboard.entries.sort((a, b) => a.solveTime - b.solveTime);
    console.log(`[LEADERBOARD] Sorted entries by solve time`);

    // Update ranks
    leaderboard.entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    console.log(`[LEADERBOARD] Updated ranks for all entries`);

    // Keep only top 10
    const originalLength = leaderboard.entries.length;
    leaderboard.entries = leaderboard.entries.slice(0, 10);
    console.log(`[LEADERBOARD] Trimmed leaderboard from ${originalLength} to ${leaderboard.entries.length} entries`);

    // Store updated leaderboard with retry logic
    console.log(`[LEADERBOARD] Storing updated leaderboard to Redis: leaderboard:${puzzleId}`);
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await redis.set(`leaderboard:${puzzleId}`, JSON.stringify(leaderboard));
        console.log(`[LEADERBOARD] Successfully stored leaderboard to Redis on attempt ${retryCount + 1}`);
        break;
      } catch (error) {
        retryCount++;
        console.error(`[LEADERBOARD] Error storing leaderboard to Redis (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error(`[LEADERBOARD] Failed to store leaderboard after ${maxRetries} attempts`);
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 100; // 200ms, 400ms, 800ms
        console.log(`[LEADERBOARD] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Return the rank of the new entry
    const userEntry = leaderboard.entries.find((e) => e.username === entry.username);
    const finalRank = userEntry?.rank || -1;
    console.log(`[LEADERBOARD] User ${entry.username} final rank: ${finalRank}`);
    
    return finalRank;
  }

  async getLeaderboard(puzzleId: string): Promise<Leaderboard> {
    console.log(`[LEADERBOARD] Getting leaderboard for puzzle ${puzzleId}`);
    
    const leaderboardData = await redis.get(`leaderboard:${puzzleId}`);

    if (leaderboardData) {
      const leaderboard = JSON.parse(leaderboardData);
      console.log(`[LEADERBOARD] Found existing leaderboard with ${leaderboard.entries?.length || 0} entries`);
      return leaderboard;
    }

    console.log(`[LEADERBOARD] No existing leaderboard found, returning empty leaderboard`);
    // Return empty leaderboard if none exists
    return {
      puzzleId,
      entries: [],
    };
  }

  async getUserRank(puzzleId: string, username: string): Promise<number | null> {
    const leaderboard = await this.getLeaderboard(puzzleId);
    const entry = leaderboard.entries.find((e) => e.username === username);
    return entry?.rank || null;
  }

  async getTopSolvers(puzzleId: string, limit: number = 3): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getLeaderboard(puzzleId);
    return leaderboard.entries.slice(0, limit);
  }

  async clearLeaderboard(puzzleId: string): Promise<void> {
    await redis.del(`leaderboard:${puzzleId}`);
  }
}
