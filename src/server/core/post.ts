import { context, reddit } from '@devvit/web/server';
import { Puzzle } from '../../shared/types/api';

// Generate a thumbnail description based on puzzle emojis
const generateThumbnailData = (puzzle: Puzzle) => {
  // Create a visual grid representation for thumbnail
  const emojis = puzzle.emojis;
  
  // Create a simple 2x3 preview grid showing the emojis
  const miniGrid = `
🧩 SUDOMOJI PUZZLE 🧩
┌─────────┐
│ ${emojis[0]} ${emojis[1]} ${emojis[2]} │
│ ${emojis[3]} ${emojis[4]} ${emojis[5]} │
└─────────┘
6x6 Emoji Sudoku`;

  const thumbnailText = `🧩 ${puzzle.title}\n\n${emojis.join(' ')}`;
  
  // Create a compact emoji string for social sharing
  const emojiString = `🧩${emojis.join('')}🧩`;
  
  return {
    thumbnailText,
    emojiPreview: emojis.join(' '),
    miniGrid,
    emojiString,
  };
};

export const createPost = async (puzzle?: Puzzle) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  let title = 'Sudomoji';
  let description = 'Solve emoji sudoku puzzles and compete on the leaderboard!';
  let thumbnailData = null;

  if (puzzle) {
    title = puzzle.title;
    description = `🧩 ${puzzle.title}\n\nEmojis: ${puzzle.emojis.join(' ')}`;
    thumbnailData = generateThumbnailData(puzzle);
  } else {
    // For initial posts without a specific puzzle, use a generic title
    title = 'Sudomoji';
    description = 'Solve emoji sudoku puzzles and compete on the leaderboard!';
  }

  console.log('[CREATE_POST] Creating post with data:', {
    title,
    puzzleId: puzzle?.id || 'initial',
    gameState: puzzle ? 'active' : 'initial',
    hasThumbnail: !!thumbnailData,
    emojis: puzzle?.emojis
  });

  const postOptions: any = {
    splash: {
      appDisplayName: 'Sudomoji',
      backgroundUri: 'default-splash.png',
      buttonLabel: puzzle ? `🧩 Play ${puzzle.title.split(' - ')[0]}` : '🧩 Play Sudomoji',
      description,
      heading: title,
      appIconUri: 'sudomojilogo.png',
    },
    postData: {
      puzzleId: puzzle?.id || 'initial',
      gameState: puzzle ? 'active' : 'initial',
      ...(thumbnailData && {
        thumbnailText: thumbnailData.thumbnailText,
        emojiPreview: thumbnailData.emojiPreview,
        miniGrid: thumbnailData.miniGrid,
        emojiString: thumbnailData.emojiString,
      }),
    },
    subredditName: subredditName,
    title,
  };

  // Add thumbnail metadata if available
  if (thumbnailData) {
    postOptions.metadata = {
      thumbnail: {
        text: thumbnailData.thumbnailText,
        emojis: puzzle?.emojis.join(' '),
        miniGrid: thumbnailData.miniGrid,
        emojiString: thumbnailData.emojiString,
        type: 'sudomoji-puzzle',
      },
    };
  }

  const postResult = await reddit.submitCustomPost(postOptions);

  console.log('[CREATE_POST] Post created successfully:', {
    id: postResult.id,
    title: postResult.title
  });

  return postResult;
};
