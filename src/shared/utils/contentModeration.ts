// Simple content moderation utilities
const INAPPROPRIATE_WORDS = [
  'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap',
  'piss', 'cock', 'dick', 'pussy', 'tits', 'boobs', 'sex', 'porn',
  'nazi', 'hitler', 'kill', 'die', 'death', 'suicide', 'murder',
  'hate', 'racist', 'nigger', 'faggot', 'retard', 'stupid', 'idiot'
];

const SUSPICIOUS_PATTERNS = [
  /(.)\1{4,}/, // Repeated characters (aaaaa)
  /[A-Z]{10,}/, // Too many caps
  /\d{10,}/, // Too many numbers
];

export interface ModerationResult {
  isAppropriate: boolean;
  reason?: string;
  suggestedAlternative?: string;
}

export class ContentModerator {
  static validateTitle(title: string): ModerationResult {
    if (!title || title.trim().length === 0) {
      return {
        isAppropriate: false,
        reason: 'Title cannot be empty',
      };
    }

    const cleanTitle = title.trim().toLowerCase();

    // Check for inappropriate words
    for (const word of INAPPROPRIATE_WORDS) {
      if (cleanTitle.includes(word)) {
        return {
          isAppropriate: false,
          reason: 'Title contains inappropriate language',
          suggestedAlternative: 'Please use family-friendly language',
        };
      }
    }

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(title)) {
        return {
          isAppropriate: false,
          reason: 'Title contains suspicious patterns',
          suggestedAlternative: 'Please use normal text formatting',
        };
      }
    }

    // Check length
    if (title.length > 100) {
      return {
        isAppropriate: false,
        reason: 'Title is too long',
        suggestedAlternative: 'Please keep titles under 100 characters',
      };
    }

    if (title.length < 3) {
      return {
        isAppropriate: false,
        reason: 'Title is too short',
        suggestedAlternative: 'Please provide a more descriptive title',
      };
    }

    return { isAppropriate: true };
  }

  static validateEmojis(emojis: string[]): ModerationResult {
    if (!emojis || emojis.length !== 6) {
      return {
        isAppropriate: false,
        reason: 'Must provide exactly 6 emojis',
      };
    }

    // Check for duplicates
    const uniqueEmojis = new Set(emojis);
    if (uniqueEmojis.size !== emojis.length) {
      return {
        isAppropriate: false,
        reason: 'All emojis must be unique',
        suggestedAlternative: 'Please choose 6 different emojis',
      };
    }

    // Basic emoji validation (check if they look like emojis)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    
    for (const emoji of emojis) {
      if (!emojiRegex.test(emoji) && emoji.length > 2) {
        return {
          isAppropriate: false,
          reason: 'Invalid emoji detected',
          suggestedAlternative: 'Please use only valid emoji characters',
        };
      }
    }

    return { isAppropriate: true };
  }

  static sanitizeTitle(title: string): string {
    // Remove extra whitespace and trim
    let sanitized = title.trim().replace(/\s+/g, ' ');
    
    // Remove potentially harmful characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    
    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 97) + '...';
    }
    
    return sanitized;
  }
}