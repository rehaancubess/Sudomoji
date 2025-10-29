// Simple script to test puzzle generation
const { SudokuGenerator, SudokuValidator } = require('../dist/server/index.cjs');

console.log('🧩 Testing Sudomoji Puzzle Generation...\n');

try {
  // Generate a puzzle
  const { puzzle, solution } = SudokuGenerator.generatePuzzle();

  console.log('Generated Puzzle:');
  puzzle.forEach((row) => {
    console.log(row.map((cell) => cell || '·').join(' '));
  });

  console.log('\nSolution:');
  solution.forEach((row) => {
    console.log(row.join(' '));
  });

  console.log('\nValidation Results:');
  console.log('✓ Solution is valid:', SudokuValidator.isSolved(solution));
  console.log('✓ Puzzle is valid:', SudokuValidator.isValidGrid(puzzle));

  // Count empty cells
  const emptyCells = puzzle.flat().filter((cell) => cell === null).length;
  console.log('✓ Empty cells:', emptyCells, '/ 36');

  console.log('\n🎉 Puzzle generation successful!');
} catch (error) {
  console.error('❌ Error testing puzzle generation:', error);
}
