# Design Document

## Overview

This design document outlines the architectural changes needed to implement game improvements for Sudomoji, including persistent puzzle storage, enhanced puzzle generation, wrong answer feedback, custom puzzle creation with crossposting, and winner customization features.

## Architecture

### Current Architecture Analysis
The current system uses:
- **PuzzleManager**: Handles daily puzzle creation and storage in Redis
- **Client-Server Communication**: Devvit web framework with Redis for persistence
- **Single Daily Puzzle**: Replaces previous puzzles when new ones are created
- **Basic Sudoku Generation**: Uses backtracking algorithm with difficulty-based cell removal

### Proposed Architecture Changes

#### 1. Persistent Puzzle Storage System
- **Puzzle Archive**: Extend Redis storage to maintain historical puzzles indefinitely
- **Date-based Indexing**: Use date keys for efficient puzzle retrieval
- **Puzzle State Management**: Track puzzle lifecycle (active → archived)

#### 2. Enhanced Puzzle Generation
- **Solution Validation**: Implement unique solution verification
- **Difficulty Balancing**: Adjust cell removal algorithms for consistent solvability
- **Generation Pipeline**: Multi-step validation process for puzzle quality

#### 3. Real-time Feedback System
- **Move Validation**: Client-side immediate validation for user moves
- **Visual Feedback**: Cross indicators and time penalty display
- **Timer Integration**: Automatic time penalty application

#### 4. Custom Puzzle Creation
- **Theme Builder**: Interface for custom emoji selection and theme creation
- **Crossposting Integration**: Reddit API integration for sharing to other subreddits
- **Content Moderation**: Text filtering for inappropriate content

## Components and Interfaces

### 1. Enhanced PuzzleManager

```typescript
interface EnhancedPuzzleManager {
  // Existing methods
  getCurrentPuzzle(): Promise<DailyPuzzle | null>
  createDailyPuzzle(winnerTheme?: ThemeData): Promise<DailyPuzzle>
  
  // New methods for persistence
  getPuzzleByDate(date: string): Promise<DailyPuzzle | null>
  getPuzzleHistory(limit?: number, offset?: number): Promise<DailyPuzzle[]>
  archivePuzzle(puzzleId: string): Promise<void>
  
  // Custom puzzle methods
  createCustomPuzzle(theme: CustomTheme, creator: string): Promise<CustomPuzzle>
  validateCustomTheme(theme: CustomTheme): Promise<ValidationResult>
}
```

### 2. Feedback System Components

```typescript
interface FeedbackSystem {
  validateMove(grid: SudokuGrid, row: number, col: number, value: number): MoveValidation
  applyTimePenalty(currentTime: number, penalty: number): number
  showVisualFeedback(cell: CellPosition, type: 'correct' | 'incorrect'): void
}

interface MoveValidation {
  isValid: boolean
  conflictType?: 'row' | 'column' | 'box'
  conflictCells?: CellPosition[]
}
```

### 3. Custom Puzzle System

```typescript
interface CustomPuzzle extends DailyPuzzle {
  creator: string
  isCustom: true
  shareableLink: string
  crosspostData?: CrosspostData
}

interface CrosspostData {
  targetSubreddits: string[]
  customTitle: string
  shareTimestamp: string
}

interface ContentModerator {
  validateTitle(title: string): Promise<ModerationResult>
  validateEmojis(emojis: string[]): Promise<ModerationResult>
}
```

### 4. Winner Customization System

```typescript
interface WinnerCustomization {
  customEmojis: string[]
  customTitle: string
  celebrationMessage?: string
}

interface WinnerInterface {
  showCustomizationForm(): void
  validateWinnerInput(input: WinnerCustomization): Promise<ValidationResult>
  applyWinnerTheme(theme: WinnerCustomization): Promise<void>
}
```

## Data Models

### Enhanced DailyPuzzle Model
```typescript
interface EnhancedDailyPuzzle extends DailyPuzzle {
  // New fields
  dateKey: string // YYYY-MM-DD format for indexing
  isArchived: boolean
  totalAttempts: number
  averageSolveTime?: number
  
  // Enhanced winner data
  winnerCustomization?: WinnerCustomization
}
```

### Custom Theme Model
```typescript
interface CustomTheme {
  title: string
  emojis: string[] // Must be exactly 6 emojis
  category?: string
  creator: string
  isModerated: boolean
  moderationStatus: 'pending' | 'approved' | 'rejected'
}
```

### Feedback State Model
```typescript
interface GameFeedback {
  wrongMoves: WrongMove[]
  totalPenaltyTime: number
  currentStreak: number
  hintsUsed: number
}

interface WrongMove {
  cell: CellPosition
  attemptedValue: number
  timestamp: number
  penaltyApplied: number
}
```

## Error Handling

### 1. Puzzle Generation Failures
- **Fallback Mechanisms**: Use predefined puzzle sets if generation fails
- **Retry Logic**: Attempt generation with different parameters
- **Quality Validation**: Ensure puzzles meet solvability criteria

### 2. Storage Failures
- **Redis Backup**: Implement backup storage for critical puzzle data
- **Graceful Degradation**: Continue with limited functionality if storage fails
- **Data Recovery**: Mechanisms to restore lost puzzle data

### 3. Content Moderation Failures
- **Default Filtering**: Basic word filtering as fallback
- **Manual Review Queue**: Flag suspicious content for human review
- **User Reporting**: Allow community reporting of inappropriate content

### 4. Crossposting Failures
- **API Rate Limiting**: Handle Reddit API rate limits gracefully
- **Permission Errors**: Clear messaging for insufficient permissions
- **Network Failures**: Retry mechanisms with exponential backoff

## Testing Strategy

### 1. Puzzle Generation Testing
- **Solvability Verification**: Automated tests for puzzle uniqueness
- **Difficulty Consistency**: Statistical analysis of generated puzzles
- **Performance Testing**: Generation time benchmarks

### 2. Feedback System Testing
- **Move Validation**: Comprehensive test cases for all conflict types
- **Timer Accuracy**: Precision testing for penalty application
- **UI Responsiveness**: Visual feedback timing and accuracy

### 3. Custom Puzzle Testing
- **Theme Validation**: Test emoji parsing and validation
- **Content Moderation**: Test filtering with various input types
- **Crossposting Integration**: Mock Reddit API testing

### 4. Data Persistence Testing
- **Archive Integrity**: Verify puzzle data preservation
- **Query Performance**: Test retrieval speed for large datasets
- **Concurrent Access**: Multi-user access pattern testing

## Implementation Phases

### Phase 1: Core Infrastructure
1. Enhanced puzzle storage system
2. Improved puzzle generation with validation
3. Basic wrong answer feedback

### Phase 2: User Experience
1. Visual feedback improvements
2. Timer penalty system
3. Puzzle archive interface

### Phase 3: Custom Features
1. Custom puzzle creation interface
2. Content moderation system
3. Winner customization features

### Phase 4: Social Features
1. Crossposting functionality
2. Community sharing features
3. Advanced moderation tools

## Security Considerations

### Content Security
- **Input Sanitization**: All user inputs must be sanitized
- **XSS Prevention**: Proper emoji and text encoding
- **Content Filtering**: Multi-layer inappropriate content detection

### API Security
- **Rate Limiting**: Prevent abuse of puzzle generation and submission
- **Authentication**: Verify user identity for custom puzzle creation
- **Permission Validation**: Ensure users can only modify their own content

### Data Privacy
- **User Data Protection**: Minimal data collection and secure storage
- **Anonymization**: Option to play anonymously
- **Data Retention**: Clear policies for puzzle and user data retention