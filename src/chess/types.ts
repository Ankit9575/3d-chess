export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export type GameMode = 'pvp' | 'pvai' | 'aivai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type BoardThemeId = 'walnut' | 'marble' | 'obsidian';
export type PieceStyleId = 'staunton' | 'imperial' | 'minimalist';
export type CameraPresetId = 'classic' | 'cinematic' | 'top';
export type AppScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type TimeControlSeconds = 180 | 300 | 600 | 0; // 3m, 5m, 10m, Unlimited (0)

export interface BoardPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  square: string;
}

export interface LegalMoveOption {
  from: string;
  to: string;
  flags: string;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PromotionPiece;
  san: string;
  isCapture: boolean;
  isCastling: boolean;
  isEnPassant: boolean;
  isPromotion: boolean;
}

export interface MoveRecord {
  ply: number;
  san: string;
  from: string;
  to: string;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  capturedSquare?: string;
  promotion?: PromotionPiece;
  flags: string;
  fenBefore: string;
  fenAfter: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastling: boolean;
  isEnPassant: boolean;
  rookMove?: { from: string; to: string };
}

export interface GameOutcome {
  status: 'active' | 'checkmate' | 'stalemate' | 'draw_repetition' | 'draw_insufficient' | 'draw_50move' | 'timeout';
  winner: PieceColor | 'draw' | null;
  reason: string;
}

export interface CapturedSummary {
  capturedByWhite: PieceType[]; // Black pieces captured by White
  capturedByBlack: PieceType[]; // White pieces captured by Black
  whiteMaterialAdvantage: number; // Positive = White ahead, Negative = Black ahead
}

export interface PlayerProfile {
  name: string;
  rating: number;
  isAI: boolean;
}

export interface SavedGameState {
  version: 1;
  fen: string;
  history: MoveRecord[];
  mode: GameMode;
  difficulty: Difficulty;
  playerSide: PieceColor;
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
  timeControl: TimeControlSeconds;
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  flipped: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  timeoutWinner: PieceColor | null;
  savedAt: number;
}
