# 🧩 Sudomoji - Daily Emoji Sudoku for Reddit

A fast, full-community daily puzzle where the winner designs tomorrow's world! Each day, players solve a 6×6 emoji Sudoku puzzle, and the fastest solver gets to choose the theme and emojis for the next day's challenge.

## 🎮 Core Concept

- **Daily Challenge**: One new emoji Sudoku puzzle every 24 hours
- **6×6 Grid**: Smaller than traditional Sudoku, using 3×2 boxes instead of 3×3
- **Emoji-Based**: Visual and memeable - no numbers, just emojis!
- **Winner Designs Tomorrow**: The fastest solver chooses next day's theme and emojis
- **Community Leaderboard**: Top 10 fastest solvers displayed

## 🕓 Daily Flow

1. **New Puzzle Posted**: Bot creates daily puzzle thread with title like "Emoji Sudoku #43 — Jungle Jumble 🦊🐝🐸🐼🐧🦄"
2. **Players Solve**: Submit solution + optional theme for tomorrow (in case they win)
3. **Real-time Leaderboard**: Fastest solvers ranked by completion time
4. **Winner Announced**: #1 solver's theme becomes tomorrow's puzzle
5. **Cycle Repeats**: New puzzle uses winner's chosen emojis and title

## 🏆 Features

### Game Mechanics

- **6×6 Sudoku Grid**: Each emoji appears once per row, column, and 3×2 box
- **Visual Puzzle Solving**: Click cells and select emojis to fill the grid
- **Real-time Validation**: Invalid moves are prevented
- **Timer**: Track your solve time from start to submission

### Community Features

- **Leaderboard**: Top 10 fastest solvers with times and rankings
- **Winner's Privilege**: Design tomorrow's puzzle theme and emojis
- **Theme Variety**: Pre-made themes (animals, food, space, etc.) or custom emojis
- **Daily Engagement**: New puzzle every 24 hours keeps community active

### Technical Features

- **Reddit Integration**: Native Devvit app with custom post types
- **Real-time Updates**: Live leaderboard and submission tracking
- **Persistent Storage**: Redis-backed puzzle and user data
- **Mobile Optimized**: Responsive design for all devices

## 🛠 Technical Architecture

### Frontend (React + TypeScript)

- **Components**: SudokuGrid, Leaderboard, PuzzleHeader, SubmissionForm
- **Hooks**: useSudomoji for game state management
- **Styling**: Tailwind CSS with custom puzzle grid layout

### Backend (Node.js + Express)

- **Puzzle Management**: Generation, validation, and storage
- **Leaderboard System**: Real-time ranking and timing
- **Redis Storage**: Persistent game state and user submissions
- **Reddit API**: Post creation and user authentication

### Core Systems

- **Sudoku Generator**: Creates valid 6×6 puzzles with configurable difficulty
- **Sudoku Validator**: Ensures moves are valid and puzzles are solved correctly
- **Theme System**: Manages emoji sets and daily themes
- **Timing System**: Tracks solve times and manages daily cycles

## 🚀 Installation & Setup

1. **Clone and Install**:

   ```bash
   git clone <repository>
   cd sudomoji
   npm install
   ```

2. **Development**:

   ```bash
   npm run dev  # Starts client, server, and Devvit in watch mode
   ```

3. **Build**:

   ```bash
   npm run build  # Builds both client and server
   ```

4. **Deploy**:
   ```bash
   npm run deploy  # Uploads to Reddit
   ```

## 📁 Project Structure

```
sudomoji/
├── src/
│   ├── client/           # React frontend
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   └── App.tsx       # Main app component
│   ├── server/           # Express backend
│   │   ├── core/         # Business logic
│   │   └── index.ts      # Server entry point
│   └── shared/           # Shared types and utilities
│       ├── types/        # TypeScript definitions
│       └── utils/        # Shared utility functions
├── assets/               # Static assets
└── dist/                 # Built files
```

## 🎯 Game Rules

1. **Fill the 6×6 grid** so each emoji appears exactly once in:

   - Each row (6 emojis)
   - Each column (6 emojis)
   - Each 3×2 box (6 emojis)

2. **Submit your solution** with optional theme for tomorrow

3. **Fastest correct solver wins** and designs the next day's puzzle

## 🌈 Why It's Perfect for Reddit

- **Skill-based Competition**: Pure logic race - fastest thinker wins
- **Personal Reward**: Winner literally decides tomorrow's puzzle vibe
- **Endless Variety**: Emoji combinations create hilarious and diverse themes
- **Public Recognition**: Leaderboard builds excitement and friendly competition
- **Community Flavor**: Each day feels different based on winner's creativity

## 🔧 API Endpoints

- `GET /api/init` - Initialize game state
- `POST /api/submit-solution` - Submit puzzle solution
- `GET /api/leaderboard` - Get current leaderboard
- `POST /api/create-puzzle` - Create new daily puzzle
- `POST /internal/daily-puzzle` - Automated daily puzzle creation

## 📊 Data Models

### DailyPuzzle

- Puzzle grid and solution
- Theme title and emojis
- Creation and expiration times
- Winner information

### PlayerSubmission

- User solution and timing
- Optional next-day theme
- Correctness validation

### Leaderboard

- Top 10 fastest solvers
- Solve times and rankings
- Real-time updates

## 🎨 Emoji Themes

Built-in themes include:

- 🦊 Animals: Fox, Frog, Unicorn, Bee, Penguin, Panda
- 🍕 Food: Pizza, Burger, Fries, Taco, Donut, Cookie
- 🌸 Nature: Various flowers and plants
- 🌟 Space: Stars, planets, rockets
- 🐠 Ocean: Sea creatures and shells
- 🍩 Desserts: Sweet treats
- 🍎 Fruits: Fresh fruits
- ☀️ Weather: Sun, rain, snow, rainbow

Players can also create custom themes with any 6 emojis!

## 🏁 Ready to Play?

Install the Sudomoji app in your subreddit and start the daily puzzle tradition! The community will love the combination of logical challenge and creative expression.

**Win today, shape tomorrow!** 🏆

---

## Development Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run check`: Type checks, lints, and prettifies your app

Built with [Devvit](https://developers.reddit.com/), React, TypeScript, and Tailwind CSS.

---

## 🤖 Built with Kiro AI

This project was developed using [Kiro](https://kiro.ai), an AI-powered IDE that accelerated development through intelligent code generation and assistance.

### How Kiro Helped Build Sudomoji

**🧩 Puzzle Generation System**
- Implemented sophisticated Sudoku generation algorithms with logical-move validation
- Created the "Generate Full → Remove One by One → Validate Each Step" approach
- Built robust puzzle validation ensuring unique solutions and logical progression

**🎨 UI/UX Development**
- Designed responsive React components with Tailwind CSS
- Created smooth animations and interactive game elements
- Built custom puzzle grid with emoji-based visual design

**⚡ Backend Architecture**
- Developed Express.js server with Redis integration
- Implemented real-time leaderboard system with proper ranking
- Created puzzle management system with counter validation and recovery

**🔧 System Integration**
- Built Reddit Devvit app integration with custom post creation
- Implemented user authentication and submission tracking
- Created comprehensive error handling and logging systems

**🚀 Development Workflow**
- Rapid prototyping and iterative development
- Automated testing and debugging assistance
- Streamlined build and deployment processes

Kiro's AI assistance enabled rapid development of complex game logic, beautiful UI components, and robust backend systems - turning ideas into a fully functional Reddit game in record time.
