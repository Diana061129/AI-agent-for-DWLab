import React, { useState, useEffect } from 'react';
import { UserStats } from '../types';
import { Play, RotateCcw, Grid3X3, CheckCircle2 } from 'lucide-react';

interface GameCenterProps {
  stats: UserStats;
  onUpdateStats: (newStats: UserStats) => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';
type Board = (number | null)[][];

const COST_TO_PLAY_SUDOKU = 50;

const GameCenter: React.FC<GameCenterProps> = ({ stats, onUpdateStats }) => {
  // === SUDOKU STATE ===
  const [isPlayingSudoku, setIsPlayingSudoku] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [initialBoard, setInitialBoard] = useState<Board>([]);
  const [board, setBoard] = useState<Board>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState('');
  const [isWon, setIsWon] = useState(false);

  // === SUDOKU LOGIC ===
  const generateSudoku = (diff: Difficulty) => {
    const newBoard: Board = Array(9).fill(null).map(() => Array(9).fill(null));
    fillDiagonalBox(newBoard, 0);
    fillDiagonalBox(newBoard, 3);
    fillDiagonalBox(newBoard, 6);
    solveSudoku(newBoard);
    
    const attempts = diff === 'easy' ? 30 : diff === 'medium' ? 45 : 56;
    const puzzleBoard = JSON.parse(JSON.stringify(newBoard));
    
    let count = attempts;
    while (count > 0) {
        let i = Math.floor(Math.random() * 9);
        let j = Math.floor(Math.random() * 9);
        if (puzzleBoard[i][j] !== null) {
            puzzleBoard[i][j] = null;
            count--;
        }
    }
    return { solved: newBoard, puzzle: puzzleBoard };
  };

  const fillDiagonalBox = (b: Board, startRow: number) => {
    let num: number;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            do {
                num = Math.floor(Math.random() * 9) + 1;
            } while (!isSafeInBox(b, startRow, startRow, num));
            b[startRow + i][startRow + j] = num;
        }
    }
  };

  const isSafeInBox = (b: Board, rowStart: number, colStart: number, num: number) => {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (b[rowStart + i][colStart + j] === num) return false;
        }
    }
    return true;
  };

  const isSafe = (b: Board, row: number, col: number, num: number) => {
    for (let x = 0; x < 9; x++) {
        if (b[row][x] === num) return false;
        if (b[x][col] === num) return false;
    }
    let startRow = row - row % 3;
    let startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (b[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
  };

  const solveSudoku = (b: Board): boolean => {
    let row = -1, col = -1, isEmpty = true;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (b[i][j] === null) {
                row = i; col = j;
                isEmpty = false;
                break;
            }
        }
        if (!isEmpty) break;
    }
    if (isEmpty) return true;

    for (let num = 1; num <= 9; num++) {
        if (isSafe(b, row, col, num)) {
            b[row][col] = num;
            if (solveSudoku(b)) return true;
            b[row][col] = null;
        }
    }
    return false;
  };

  const checkWin = (current: Board) => {
      for(let i=0; i<9; i++) {
          for(let j=0; j<9; j++) {
              if (current[i][j] === null) return false;
              const val = current[i][j]!;
              const temp = [...current];
              temp[i] = [...current[i]];
              temp[i][j] = null; 
              if (!isSafe(temp, i, j, val)) return false; 
          }
      }
      return true;
  };

  const startGameSudoku = () => {
      if (stats.points < COST_TO_PLAY_SUDOKU) {
          setMessage(`Insufficient Points. Need ${COST_TO_PLAY_SUDOKU}.`);
          return;
      }
      onUpdateStats({ ...stats, points: stats.points - COST_TO_PLAY_SUDOKU });
      
      const { puzzle } = generateSudoku(difficulty);
      setInitialBoard(JSON.parse(JSON.stringify(puzzle)));
      setBoard(puzzle);
      setIsPlayingSudoku(true);
      setIsWon(false);
      setMessage('');
      setSelectedCell(null);
  };

  const handleNumberInput = (num: number) => {
      if (!selectedCell || isWon) return;
      const [r, c] = selectedCell;
      if (initialBoard[r][c] !== null) return;

      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = num;
      setBoard(newBoard);

      if (checkWin(newBoard)) {
          setIsWon(true);
          setMessage("Congratulations! Puzzle Solved!");
          const bonus = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
          onUpdateStats({ ...stats, points: stats.points - COST_TO_PLAY_SUDOKU + bonus });
      }
  };

  const handleDelete = () => {
    if (!selectedCell || isWon) return;
    const [r, c] = selectedCell;
    if (initialBoard[r][c] !== null) return;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = null;
    setBoard(newBoard);
  };

  // Keyboard support for Sudoku
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (!isPlayingSudoku || isWon) return;
        
        if (selectedCell) {
             const num = parseInt(e.key);
             if (!isNaN(num) && num >= 1 && num <= 9) {
                 handleNumberInput(num);
             } else if (e.key === 'Backspace' || e.key === 'Delete') {
                 handleDelete();
             } else if (e.key === 'ArrowUp') {
                 e.preventDefault();
                 setSelectedCell([Math.max(0, selectedCell[0]-1), selectedCell[1]]);
             } else if (e.key === 'ArrowDown') {
                 e.preventDefault();
                 setSelectedCell([Math.min(8, selectedCell[0]+1), selectedCell[1]]);
             } else if (e.key === 'ArrowLeft') {
                 e.preventDefault();
                 setSelectedCell([selectedCell[0], Math.max(0, selectedCell[1]-1)]);
             } else if (e.key === 'ArrowRight') {
                 e.preventDefault();
                 setSelectedCell([selectedCell[0], Math.min(8, selectedCell[1]+1)]);
             }
        }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlayingSudoku, isWon, selectedCell, board]);

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center pb-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Game Center</h1>
        <p className="text-slate-500">Take a break. Earn points.</p>
      </div>

      {!isPlayingSudoku ? (
          <div className="bg-white p-12 rounded-2xl shadow-lg border border-slate-200 text-center max-w-lg w-full">
              <Grid3X3 className="w-16 h-16 text-blue-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Scholar Sudoku</h2>
              
              <div className="mb-8">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Select Difficulty</label>
                  <div className="flex justify-center gap-4">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                          <button
                              key={d}
                              onClick={() => setDifficulty(d)}
                              className={`px-4 py-2 rounded-lg capitalize transition-all ${difficulty === d ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                              {d}
                          </button>
                      ))}
                  </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl mb-6">
                  <p className="text-blue-900 font-bold">Cost: {COST_TO_PLAY_SUDOKU} Points</p>
              </div>

              <p className="text-red-500 text-sm font-medium h-6 mb-2">{message}</p>

              <button 
              onClick={startGameSudoku}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
              >
                  <Play className="w-5 h-5" /> Start Puzzle
              </button>
          </div>
      ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="bg-slate-900 p-2 rounded-lg shadow-2xl">
                  <div className="grid grid-cols-9 gap-[1px] bg-slate-700 border-2 border-slate-700">
                      {board.map((row, rIdx) => (
                          row.map((cell, cIdx) => {
                              const isInitial = initialBoard.length > 0 && initialBoard[rIdx][cIdx] !== null;
                              const isSelected = selectedCell?.[0] === rIdx && selectedCell?.[1] === cIdx;
                              let isConflict = false;
                              if (cell !== null && !isInitial) {
                                  const temp = board.map(r => [...r]);
                                  temp[rIdx][cIdx] = null; 
                                  if (!isSafe(temp, rIdx, cIdx, cell)) isConflict = true;
                              }
                              const borderRight = (cIdx + 1) % 3 === 0 && cIdx !== 8 ? 'border-r-2 border-slate-900' : '';
                              const borderBottom = (rIdx + 1) % 3 === 0 && rIdx !== 8 ? 'border-b-2 border-slate-900' : '';
                              return (
                                  <div 
                                      key={`${rIdx}-${cIdx}`}
                                      onClick={() => setSelectedCell([rIdx, cIdx])}
                                      className={`
                                          w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-lg cursor-pointer select-none
                                          ${borderRight} ${borderBottom}
                                          ${isSelected ? 'bg-blue-500/50' : (isInitial ? 'bg-slate-200' : 'bg-white')}
                                          ${isConflict ? 'bg-red-200' : ''}
                                          ${isInitial ? 'font-bold text-slate-900' : 'text-blue-700'}
                                      `}
                                  >
                                      {cell !== null ? cell : ''}
                                  </div>
                              );
                          })
                      ))}
                  </div>
              </div>

              <div className="flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm w-full md:w-64">
                      {isWon ? (
                          <div className="text-center animate-in zoom-in">
                              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-2" />
                              <h3 className="text-xl font-bold text-green-800">Solved!</h3>
                              <button onClick={() => setIsPlayingSudoku(false)} className="mt-4 text-blue-600 underline">Play Again</button>
                          </div>
                      ) : (
                          <>
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                      <button
                                          key={num}
                                          onClick={() => handleNumberInput(num)}
                                          className="h-12 bg-slate-50 border border-slate-200 rounded-lg text-xl font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                                      >
                                          {num}
                                      </button>
                                  ))}
                              </div>
                              <button 
                                  onClick={handleDelete}
                                  className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                              >
                                  Clear Cell
                              </button>
                          </>
                      )}
                  </div>
                  
                  <div className="text-center">
                      <button 
                          onClick={() => { if(confirm("Give up?")) setIsPlayingSudoku(false); }}
                          className="text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 mx-auto"
                      >
                          <RotateCcw className="w-4 h-4" /> Quit Game
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default GameCenter;