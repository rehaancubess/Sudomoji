import express from 'express';
import { redis } from '@devvit/web/server';
import {
  InitResponse,
  SubmitSolutionRequest,
  SubmitSolutionResponse,
  GetLeaderboardResponse,
  CreatePuzzleResponse,
  CreateCustomPuzzleRequest,
  CreateCustomPuzzleResponse,
} from '../shared/types/api';
import { reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { PuzzleManager } from './core/puzzleManager';
import { LeaderboardManager } from './core/leaderboardManager';
import { ContentModerator } from '../shared/utils/contentModeration';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();
const puzzleManager = new PuzzleManager();
const leaderboardManager = new LeaderboardManager();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      console.log(`[INIT_API] ===== STARTING INIT FOR POST ${postId} =====`);

      const username = await reddit.getCurrentUsername();
      console.log(`[INIT_API] Username: ${username}`);

      // Get the puzzle ID specific to this post
      console.log(`[INIT_API] Getting post data for postId: ${postId}`);
      const post = await reddit.getPostById(postId);
      console.log(`[INIT_API] Post data:`, {
        id: post.id,
        title: post.title,
        postData: (post as any).postData
      });

      let puzzleId = (post as any).postData?.puzzleId;
      console.log(`[INIT_API] Extracted puzzle ID from postData: ${puzzleId}`);

      // Fallback: if postData is missing, try to extract puzzle number from title
      if (!puzzleId || puzzleId === 'initial') {
        const titleMatch = post.title.match(/Sudomoji #(\d+)/);
        if (titleMatch && titleMatch[1]) {
          const puzzleNumber = parseInt(titleMatch[1]);
          console.log(`[INIT_API] Extracted puzzle number ${puzzleNumber} from title: "${post.title}"`);

          // Try to get puzzle by number
          try {
            const puzzleData = await redis.get(`puzzle_by_number:${puzzleNumber}`);
            if (puzzleData) {
              const puzzleByNumber = JSON.parse(puzzleData);
              puzzleId = puzzleByNumber.id;
              console.log(`[INIT_API] Found puzzle ID by number: ${puzzleId}`);
            } else {
              console.warn(`[INIT_API] No puzzle found for number: ${puzzleNumber}`);
            }
          } catch (error) {
            console.error(`[INIT_API] Error getting puzzle by number: ${error}`);
          }
        }
      }

      let puzzle = null;
      let userSubmission = null;
      let leaderboard = null;

      if (puzzleId && puzzleId !== 'initial') {
        console.log(`[INIT_API] Loading puzzle with ID: ${puzzleId}`);
        // Load the specific puzzle for this post
        puzzle = await puzzleManager.getPuzzleById(puzzleId);

        if (puzzle) {
          console.log(`[INIT_API] Puzzle found:`, {
            id: puzzle.id,
            title: puzzle.title,
            puzzleNumber: puzzle.puzzleNumber
          });

          userSubmission = await puzzleManager.getUserSubmission(puzzle.id, username ?? 'anonymous');
          console.log(`[INIT_API] User submission found: ${!!userSubmission}`);

          leaderboard = await leaderboardManager.getLeaderboard(puzzle.id);
          console.log(`[INIT_API] Leaderboard entries: ${leaderboard?.entries?.length || 0}`);
        } else {
          console.warn(`[INIT_API] WARNING: Puzzle not found for ID: ${puzzleId}`);
          console.log(`[INIT_API] No fallback - each post should only show its own puzzle`);
        }
      } else {
        console.log(`[INIT_API] No specific puzzle ID (${puzzleId}) - this post has no puzzle`);
      }

      res.json({
        type: 'init',
        postId: postId,
        username: username ?? 'anonymous',
        currentPuzzle: puzzle,
        userSubmission,
        leaderboard,
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<
  Record<string, never>,
  SubmitSolutionResponse | { status: string; message: string },
  SubmitSolutionRequest
>('/api/submit-solution', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { solution, nextTheme, startTime } = req.body;

    // Get the puzzle ID specific to this post
    const postId = context.postId;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'Post ID is required',
      });
      return;
    }

    const post = await reddit.getPostById(postId);
    let puzzleId = (post as any).postData?.puzzleId;
    console.log(`[SUBMIT] Extracted puzzle ID from postData: ${puzzleId}`);

    // Fallback: if postData is missing, try to extract puzzle number from title
    if (!puzzleId || puzzleId === 'initial') {
      const titleMatch = post.title.match(/Sudomoji #(\d+)/);
      if (titleMatch && titleMatch[1]) {
        const puzzleNumber = parseInt(titleMatch[1]);
        console.log(`[SUBMIT] Extracted puzzle number ${puzzleNumber} from title: "${post.title}"`);

        // Try to get puzzle by number
        try {
          const puzzleData = await redis.get(`puzzle_by_number:${puzzleNumber}`);
          if (puzzleData) {
            const puzzleByNumber = JSON.parse(puzzleData);
            puzzleId = puzzleByNumber.id;
            console.log(`[SUBMIT] Found puzzle ID by number: ${puzzleId}`);
          } else {
            console.warn(`[SUBMIT] No puzzle found for number: ${puzzleNumber}`);
          }
        } catch (error) {
          console.error(`[SUBMIT] Error getting puzzle by number: ${error}`);
        }
      }
    }

    if (!puzzleId || puzzleId === 'initial') {
      res.status(400).json({
        status: 'error',
        message: 'No puzzle found for this post',
      });
      return;
    }

    const puzzle = await puzzleManager.getPuzzleById(puzzleId);
    if (!puzzle) {
      res.status(400).json({
        status: 'error',
        message: 'Puzzle not found',
      });
      return;
    }

    // Validate winner theme if provided
    if (nextTheme) {
      const titleValidation = ContentModerator.validateTitle(nextTheme.title);
      if (!titleValidation.isAppropriate) {
        res.status(400).json({
          status: 'error',
          message: `Winner theme title: ${titleValidation.reason}`,
        });
        return;
      }

      const emojiValidation = ContentModerator.validateEmojis(nextTheme.emojis);
      if (!emojiValidation.isAppropriate) {
        res.status(400).json({
          status: 'error',
          message: `Winner theme emojis: ${emojiValidation.reason}`,
        });
        return;
      }
    }

    if (puzzle.state !== 'active') {
      res.status(400).json({
        status: 'error',
        message: 'Puzzle is no longer active',
      });
      return;
    }

    // Check if user already submitted
    const existingSubmission = await puzzleManager.getUserSubmission(puzzle.id, username);
    if (existingSubmission) {
      res.status(400).json({
        status: 'error',
        message: 'You have already submitted a solution for this puzzle',
      });
      return;
    }

    const result = await puzzleManager.submitSolution(
      puzzle.id,
      username,
      solution as number[][],
      startTime
    );

    const response: SubmitSolutionResponse = {
      type: 'submit',
      success: true,
      isCorrect: result.isCorrect,
      message: result.isCorrect
        ? `Correct! You solved it in ${result.rank ? `#${result.rank}` : 'unranked'} place!`
        : 'Incorrect solution. Try again tomorrow!',
      ...(result.rank !== undefined && { rank: result.rank }),
      ...(result.solveTime !== undefined && { solveTime: result.solveTime }),
    };

    res.json(response);
  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit solution',
    });
  }
});

router.get<Record<string, never>, GetLeaderboardResponse | { status: string; message: string }>(
  '/api/leaderboard',
  async (req, res): Promise<void> => {
    try {
      // Allow optional puzzle ID parameter for specific puzzle leaderboards
      const puzzleId = req.query.puzzleId as string;

      let targetPuzzleId: string;
      if (puzzleId) {
        // Validate puzzle exists
        const puzzle = await puzzleManager.getPuzzleById(puzzleId);
        if (!puzzle) {
          res.status(404).json({
            status: 'error',
            message: 'Puzzle not found',
          });
          return;
        }
        targetPuzzleId = puzzleId;
      } else {
        // Default to current puzzle
        const currentPuzzle = await puzzleManager.getCurrentPuzzle();
        if (!currentPuzzle) {
          res.status(400).json({
            status: 'error',
            message: 'No active puzzle found',
          });
          return;
        }
        targetPuzzleId = currentPuzzle.id;
      }

      const leaderboard = await leaderboardManager.getLeaderboard(targetPuzzleId);

      // Ensure leaderboard has correct puzzle ID
      if (leaderboard.puzzleId !== targetPuzzleId) {
        console.warn(`Leaderboard puzzle ID mismatch: expected ${targetPuzzleId}, got ${leaderboard.puzzleId}`);
        leaderboard.puzzleId = targetPuzzleId;
      }

      res.json({
        type: 'leaderboard',
        leaderboard,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get leaderboard',
      });
    }
  }
);

// New endpoint for puzzle history
router.get<Record<string, never>, { puzzles: any[] } | { status: string; message: string }>(
  '/api/puzzle-history',
  async (req, res): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const puzzles = await puzzleManager.getPuzzleHistory(limit, offset);
      res.json({ puzzles });
    } catch (error) {
      console.error('Get puzzle history error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get puzzle history',
      });
    }
  }
);

// New endpoint for getting puzzle by date
router.get<{ date: string }, any | { status: string; message: string }>(
  '/api/puzzle/:date',
  async (req, res): Promise<void> => {
    try {
      const { date } = req.params;

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD',
        });
        return;
      }

      // Convert date to puzzle number lookup (simplified for now)
      const puzzleData = await redis.get(`puzzle_by_date:${date}`);
      const puzzle = puzzleData ? JSON.parse(puzzleData) : null;
      if (!puzzle) {
        res.status(404).json({
          status: 'error',
          message: 'No puzzle found for this date',
        });
        return;
      }

      const username = await reddit.getCurrentUsername();
      const userSubmission = username
        ? await puzzleManager.getUserSubmission(puzzle.id, username)
        : null;
      const leaderboard = await leaderboardManager.getLeaderboard(puzzle.id);

      res.json({
        puzzle,
        userSubmission,
        leaderboard,
      });
    } catch (error) {
      console.error('Get puzzle by date error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get puzzle',
      });
    }
  }
);

router.post<Record<string, never>, CreatePuzzleResponse | { status: string; message: string }>(
  '/api/create-puzzle',
  async (_req, res): Promise<void> => {
    try {
      const puzzle = await puzzleManager.createNewPuzzle();
      res.json({
        type: 'create',
        puzzle,
      });
    } catch (error) {
      console.error('Create puzzle error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create puzzle',
      });
    }
  }
);

// New endpoint for custom puzzle creation
router.post<
  Record<string, never>,
  CreateCustomPuzzleResponse | { status: string; message: string },
  CreateCustomPuzzleRequest
>('/api/create-custom-puzzle', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { theme, targetSubreddits } = req.body;

    // Validate theme
    if (!theme.title || !theme.emojis || theme.emojis.length !== 6) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid theme: title and exactly 6 emojis required',
      });
      return;
    }

    // Content moderation
    const titleValidation = ContentModerator.validateTitle(theme.title);
    if (!titleValidation.isAppropriate) {
      res.status(400).json({
        status: 'error',
        message: titleValidation.reason || 'Title contains inappropriate content',
      });
      return;
    }

    const emojiValidation = ContentModerator.validateEmojis(theme.emojis);
    if (!emojiValidation.isAppropriate) {
      res.status(400).json({
        status: 'error',
        message: emojiValidation.reason || 'Invalid emojis provided',
      });
      return;
    }

    const puzzle = await puzzleManager.createCustomPuzzle(theme, username);

    // Create a Reddit post for the custom puzzle in the main subreddit
    let postResult;
    try {
      console.log(`[CUSTOM_POST] Creating Reddit post for custom puzzle: ${puzzle.title}`);
      postResult = await createPost(puzzle);
      console.log(`[CUSTOM_POST] Successfully created post: ${postResult.id}`);
    } catch (postError) {
      console.error(`[CUSTOM_POST] Error creating Reddit post for custom puzzle:`, postError);
      // Don't fail the entire request if post creation fails
    }

    // Generate shareable link using the actual post if created
    const shareableLink = postResult 
      ? `https://reddit.com/r/${context.subredditName}/comments/${postResult.id}`
      : `https://reddit.com/r/${context.subredditName}`;

    // Generate crosspost suggestions if target subreddits provided
    let crosspostSuggestions: string[] = [];
    if (targetSubreddits && Array.isArray(targetSubreddits)) {
      crosspostSuggestions = targetSubreddits.map((_sub: string) =>
        `Check out this custom ${theme.title} Sudomoji puzzle by u/${username}! ${shareableLink}`
      );
    }

    const response: CreateCustomPuzzleResponse = {
      type: 'custom-create',
      puzzle,
      shareableLink,
      crosspostSuggestions,
    };

    if (postResult?.id) {
      response.postId = postResult.id;
    }

    res.json(response);
  } catch (error) {
    console.error('Create custom puzzle error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create custom puzzle',
    });
  }
});

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    // Create initial puzzle
    await puzzleManager.createNewPuzzle();

    const post = await createPost();

    res.json({
      status: 'success',
      message: `Sudomoji installed! Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error on app install: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to initialize Sudomoji',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    console.log('[POST_CREATE] ===== STARTING POST CREATION =====');

    // Create a new puzzle first
    console.log('[POST_CREATE] Step 1: Creating new puzzle...');
    const puzzle = await puzzleManager.createNewPuzzle();
    console.log(`[POST_CREATE] Step 1 SUCCESS: Puzzle created:`, {
      id: puzzle.id,
      title: puzzle.title,
      puzzleNumber: puzzle.puzzleNumber,
      emojis: puzzle.emojis
    });

    // Verify the puzzle was stored correctly
    console.log('[POST_CREATE] Step 2: Verifying puzzle storage...');
    const verifyPuzzle = await puzzleManager.getPuzzleById(puzzle.id);
    console.log(`[POST_CREATE] Step 2 RESULT: Puzzle verification:`, {
      found: !!verifyPuzzle,
      id: verifyPuzzle?.id,
      title: verifyPuzzle?.title
    });

    // Verify current puzzle was set
    console.log('[POST_CREATE] Step 3: Verifying current puzzle...');
    const currentPuzzle = await puzzleManager.getCurrentPuzzle();
    console.log(`[POST_CREATE] Step 3 RESULT: Current puzzle:`, {
      found: !!currentPuzzle,
      id: currentPuzzle?.id,
      title: currentPuzzle?.title,
      matches: currentPuzzle?.id === puzzle.id
    });

    // Create a post with the puzzle
    console.log('[POST_CREATE] Step 4: Creating post...');
    const post = await createPost(puzzle);
    console.log(`[POST_CREATE] Step 4 SUCCESS: Post created:`, {
      id: post.id,
      title: post.title
    });

    console.log('[POST_CREATE] ===== POST CREATION COMPLETE =====');
    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`[POST_CREATE] ===== ERROR DURING POST CREATION =====`);
    console.error(`[POST_CREATE] Error details:`, error);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Purge data and restart endpoint for mod tools
router.post('/internal/menu/purge-restart', async (_req, res): Promise<void> => {
  try {
    console.log('[MOD_TOOLS] Starting data purge and restart via mod tools');

    // Purge all puzzle-related data
    const purgeResults = await puzzleManager.purgeAllData();

    if (!purgeResults.success) {
      throw new Error(purgeResults.message);
    }

    // Reset counter to 0 so next puzzle will be #1
    await redis.set('puzzle_counter', '0');
    console.log('[PURGE_RESTART] Reset puzzle counter to 0 - next puzzle will be #1');

    console.log('[PURGE_RESTART] Purge completed successfully - ready for new puzzles');

    res.json({
      status: 'success',
      message: 'Data purged successfully! Next puzzle will be #1. Use "Create Sudomoji" to create the first puzzle.'
    });
  } catch (error) {
    console.error(`[MOD_TOOLS] Error during purge and restart: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to purge and restart',
    });
  }
});



// New puzzle creation endpoint
router.post('/internal/new-puzzle', async (_req, res): Promise<void> => {
  try {
    console.log('[NEW_PUZZLE] New puzzle creation requested via mod tools');

    // Get current state before creating new puzzle
    const currentPuzzle = await puzzleManager.getCurrentPuzzle();
    console.log(`[NEW_PUZZLE] Current puzzle before creation: ${currentPuzzle?.title} (${currentPuzzle?.id})`);

    // Create new puzzle (always increments)
    const puzzle = await puzzleManager.createNewPuzzle();
    console.log(`[NEW_PUZZLE] New puzzle created: ${puzzle.title} (${puzzle.id})`);

    // Create a new post for the puzzle
    const post = await createPost(puzzle);
    console.log(`[NEW_PUZZLE] New post created: ${post.id}`);

    res.json({
      status: 'success',
      message: `New puzzle #${puzzle.puzzleNumber} created with post ${post.id}`,
      puzzle,
    });
  } catch (error) {
    console.error(`[NEW_PUZZLE] Error creating new puzzle: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create new puzzle',
    });
  }
});

// Check system state endpoint (for debugging/testing)
router.get('/internal/system-state', async (_req, res): Promise<void> => {
  try {
    const validation = await puzzleManager.validateSystemState();
    const currentPuzzle = await puzzleManager.getCurrentPuzzle();
    const counter = await redis.get('puzzle_counter');

    res.json({
      status: 'success',
      systemState: validation,
      currentPuzzle: currentPuzzle ? {
        id: currentPuzzle.id,
        title: currentPuzzle.title,
        puzzleNumber: currentPuzzle.puzzleNumber
      } : null,
      puzzleCounter: counter,
    });
  } catch (error) {
    console.error(`Error checking system state: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check system state',
    });
  }
});

// Clear migration marker for current puzzle (for debugging/testing)
router.post('/internal/clear-migration', async (_req, res): Promise<void> => {
  try {
    await puzzleManager.clearCurrentPuzzleMigration();

    res.json({
      status: 'success',
      message: 'Migration marker cleared for current puzzle - submissions will now be accepted',
    });
  } catch (error) {
    console.error(`Error clearing migration: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear migration marker',
    });
  }
});

// Force new current puzzle endpoint (for debugging/testing)
router.post('/internal/force-new-puzzle', async (_req, res): Promise<void> => {
  try {
    const puzzle = await puzzleManager.forceCreateNewCurrentPuzzle();

    res.json({
      status: 'success',
      message: `New current puzzle created: ${puzzle.title}`,
      puzzle,
    });
  } catch (error) {
    console.error(`Error creating new puzzle: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create new puzzle',
    });
  }
});

// Fix stuck counter endpoint (for debugging/testing)
router.post('/internal/fix-counter', async (_req, res): Promise<void> => {
  try {
    const result = await puzzleManager.fixStuckCounter();

    if (result.success) {
      res.json({
        status: 'success',
        message: result.message,
        details: result.details,
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.message,
        details: result.details,
      });
    }
  } catch (error) {
    console.error(`Error fixing counter: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fix counter',
    });
  }
});

// Reset current puzzle endpoint (for debugging/testing)
router.post('/internal/reset-puzzle', async (_req, res): Promise<void> => {
  try {
    // Get current puzzle to clear its data
    const currentPuzzle = await puzzleManager.getCurrentPuzzle();
    if (currentPuzzle) {
      console.log('Clearing leaderboard for current puzzle:', currentPuzzle.id);
      await leaderboardManager.clearLeaderboard(currentPuzzle.id);
    }

    // Clear current puzzle and force creation of a new one
    await redis.del('current_puzzle');

    const puzzle = await puzzleManager.createNewPuzzle();

    res.json({
      status: 'success',
      message: `Puzzle reset! New puzzle #${puzzle.puzzleNumber} created with clean leaderboard`,
      puzzle,
    });
  } catch (error) {
    console.error(`Error resetting puzzle: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset puzzle',
    });
  }
});

// Clear leaderboard endpoint (for debugging/testing)
router.post('/internal/clear-leaderboard', async (req, res): Promise<void> => {
  try {
    const puzzleId = req.body.puzzleId;
    if (!puzzleId) {
      res.status(400).json({
        status: 'error',
        message: 'puzzleId is required',
      });
      return;
    }

    await leaderboardManager.clearLeaderboard(puzzleId);

    res.json({
      status: 'success',
      message: `Leaderboard cleared for puzzle ${puzzleId}`,
    });
  } catch (error) {
    console.error(`Error clearing leaderboard: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear leaderboard',
    });
  }
});

// Clear user submission endpoint (for debugging/testing)
router.post('/internal/clear-submission', async (req, res): Promise<void> => {
  try {
    const { puzzleId, username } = req.body;
    if (!puzzleId || !username) {
      res.status(400).json({
        status: 'error',
        message: 'puzzleId and username are required',
      });
      return;
    }

    await puzzleManager.clearUserSubmission(puzzleId, username);

    res.json({
      status: 'success',
      message: `Submission cleared for user ${username} on puzzle ${puzzleId}`,
    });
  } catch (error) {
    console.error(`Error clearing submission: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear submission',
    });
  }
});

// Clear current user's submission for current puzzle (for debugging/testing)
router.post('/internal/clear-my-submission', async (_req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const currentPuzzle = await puzzleManager.getCurrentPuzzle();
    if (!currentPuzzle) {
      res.status(400).json({
        status: 'error',
        message: 'No current puzzle found',
      });
      return;
    }

    await puzzleManager.clearUserSubmission(currentPuzzle.id, username);

    res.json({
      status: 'success',
      message: `Your submission cleared for puzzle ${currentPuzzle.title}`,
    });
  } catch (error) {
    console.error(`Error clearing user submission: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear submission',
    });
  }
});

// Simple GET endpoint to force create new puzzle (accessible via browser)
router.get('/debug/force-new-puzzle', async (_req, res): Promise<void> => {
  try {
    console.log('[DEBUG] Force creating new puzzle via GET endpoint');
    const puzzle = await puzzleManager.forceCreateNewCurrentPuzzle();

    res.json({
      status: 'success',
      message: `New current puzzle created: ${puzzle.title}`,
      puzzle: {
        id: puzzle.id,
        title: puzzle.title,
        puzzleNumber: puzzle.puzzleNumber
      },
    });
  } catch (error) {
    console.error(`[DEBUG] Error creating new puzzle: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create new puzzle',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Simple GET endpoint to check system state (accessible via browser)
router.get('/debug/system-state', async (_req, res): Promise<void> => {
  try {
    console.log('[DEBUG] Checking system state via GET endpoint');
    const validation = await puzzleManager.validateSystemState();
    const currentPuzzle = await puzzleManager.getCurrentPuzzle();

    res.json({
      status: 'success',
      systemState: validation,
      currentPuzzle: currentPuzzle ? {
        id: currentPuzzle.id,
        title: currentPuzzle.title,
        puzzleNumber: currentPuzzle.puzzleNumber
      } : null,
    });
  } catch (error) {
    console.error(`[DEBUG] Error checking system state: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check system state',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Complete data purge and fresh start endpoint
router.get('/debug/purge-and-restart', async (_req, res): Promise<void> => {
  try {
    console.log('[DEBUG] Starting complete data purge and fresh restart');

    // Purge all puzzle-related data
    const purgeResults = await puzzleManager.purgeAllData();

    // Create fresh puzzle #1
    const newPuzzle = await puzzleManager.createNewPuzzle();

    console.log('[DEBUG] Purge and restart completed successfully');

    res.json({
      status: 'success',
      message: 'All data purged and fresh puzzle created',
      purgeResults,
      newPuzzle: {
        id: newPuzzle.id,
        title: newPuzzle.title,
        puzzleNumber: newPuzzle.puzzleNumber
      }
    });
  } catch (error) {
    console.error(`[DEBUG] Error during purge and restart: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to purge and restart',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
