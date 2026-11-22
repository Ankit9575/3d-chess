import { Chess, type Square } from 'chess.js';
import type {
  CapturedSummary,
  Difficulty,
  GameMode,
  GameOutcome,
  LegalMoveOption,
  MoveRecord,
  PieceColor,
  PieceType,
  PlayerProfile,
  PromotionPiece,
  SavedGameState,
} from './types';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export function squareToCoords(square: string): { file: number; rank: number } {
  const file = square.charCodeAt(0) - 97; // 'a' -> 0
  const rank = Number(square[1]) - 1; // '1' -> 0
  return { file, rank };
}

export function coordsToSquare(file: number, rank: number): string {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    throw new Error(`Invalid board coordinates (${file}, ${rank})`);
  }
  return `${FILES[file]}${rank + 1}`;
}

/**
 * Maps algebraic square to 3D world coordinates centered at (0, 0, 0).
 * White sits toward +Z, Black toward -Z. File a is -X, File h is +X.
 */
export function squareToWorldXZ(square: string, squareSize = 1): { x: number; z: number } {
  const { file, rank } = squareToCoords(square);
  const x = (file - 3.5) * squareSize;
  const z = (3.5 - rank) * squareSize;
  return { x, z };
}

export function getLegalMovesForSquare(fen: string, square: string): LegalMoveOption[] {
  const chess = new Chess(fen);
  const verbose = chess.moves({ square: square as Square, verbose: true });
  return verbose.map((m) => ({
    from: m.from,
    to: m.to,
    flags: m.flags,
    piece: m.piece as PieceType,
    captured: m.captured as PieceType | undefined,
    promotion: m.promotion as PromotionPiece | undefined,
    san: m.san,
    isCapture: Boolean(m.captured) || m.flags.includes('e'),
    isCastling: m.flags.includes('k') || m.flags.includes('q'),
    isEnPassant: m.flags.includes('e'),
    isPromotion: m.flags.includes('p'),
  }));
}

export function isPromotionMove(fen: string, from: string, to: string): boolean {
  const moves = getLegalMovesForSquare(fen, from);
  return moves.some((m) => m.to === to && m.isPromotion);
}

export function applyChessMove(
  fen: string,
  from: string,
  to: string,
  promotion: PromotionPiece = 'q',
  plyNumber = 1
): MoveRecord | null {
  const chess = new Chess(fen);
  try {
    const result = chess.move({
      from: from as Square,
      to: to as Square,
      promotion,
    });
    if (!result) return null;

    const isCastling = result.flags.includes('k') || result.flags.includes('q');
    const isEnPassant = result.flags.includes('e');
    const rank = result.color === 'w' ? '1' : '8';
    let rookMove: { from: string; to: string } | undefined;
    if (result.flags.includes('k')) {
      rookMove = { from: `h${rank}`, to: `f${rank}` };
    } else if (result.flags.includes('q')) {
      rookMove = { from: `a${rank}`, to: `d${rank}` };
    }

    let capturedSquare: string | undefined;
    if (result.captured) {
      if (isEnPassant) {
        const capturedRank = result.color === 'w' ? Number(result.to[1]) - 1 : Number(result.to[1]) + 1;
        capturedSquare = `${result.to[0]}${capturedRank}`;
      } else {
        capturedSquare = result.to;
      }
    }

    return {
      ply: plyNumber,
      san: result.san,
      from: result.from,
      to: result.to,
      piece: result.piece as PieceType,
      color: result.color as PieceColor,
      captured: result.captured as PieceType | undefined,
      capturedSquare,
      promotion: result.promotion as PromotionPiece | undefined,
      flags: result.flags,
      fenBefore: fen,
      fenAfter: chess.fen(),
      isCheck: chess.inCheck(),
      isCheckmate: chess.isCheckmate(),
      isCastling,
      isEnPassant,
      rookMove,
    };
  } catch {
    return null;
  }
}

export function parseUciMove(uci: string): { from: string; to: string; promotion?: PromotionPiece } | null {
  const cleaned = uci.trim();
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(cleaned)) {
    return null;
  }
  return {
    from: cleaned.slice(0, 2),
    to: cleaned.slice(2, 4),
    promotion: cleaned.length === 5 ? (cleaned[4] as PromotionPiece) : undefined,
  };
}

export function evaluateGameOutcome(fen: string, timeoutWinner: PieceColor | null = null): GameOutcome {
  if (timeoutWinner) {
    return {
      status: 'timeout',
      winner: timeoutWinner,
      reason: `${timeoutWinner === 'w' ? 'White' : 'Black'} wins on time`,
    };
  }

  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    const winner: PieceColor = chess.turn() === 'w' ? 'b' : 'w';
    return {
      status: 'checkmate',
      winner,
      reason: `Checkmate — ${winner === 'w' ? 'White' : 'Black'} is victorious`,
    };
  }

  if (chess.isStalemate()) {
    return {
      status: 'stalemate',
      winner: 'draw',
      reason: 'Draw by stalemate',
    };
  }

  if (chess.isThreefoldRepetition()) {
    return {
      status: 'draw_repetition',
      winner: 'draw',
      reason: 'Draw by threefold repetition',
    };
  }

  if (chess.isInsufficientMaterial()) {
    return {
      status: 'draw_insufficient',
      winner: 'draw',
      reason: 'Draw by insufficient material',
    };
  }

  if (chess.isDraw()) {
    return {
      status: 'draw_50move',
      winner: 'draw',
      reason: 'Draw by fifty-move rule',
    };
  }

  return {
    status: 'active',
    winner: null,
    reason: chess.inCheck()
      ? `${chess.turn() === 'w' ? 'White' : 'Black'} is in check`
      : `${chess.turn() === 'w' ? 'White' : 'Black'} to move`,
  };
}

export function getTurnFromFen(fen: string): PieceColor {
  const parts = fen.split(' ');
  return parts[1] === 'b' ? 'b' : 'w';
}

export function isInCheckFromFen(fen: string): { inCheck: boolean; kingSquare: string | null } {
  const chess = new Chess(fen);
  if (!chess.inCheck()) {
    return { inCheck: false, kingSquare: null };
  }
  const turn = chess.turn();
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (cell && cell.type === 'k' && cell.color === turn) {
        return { inCheck: true, kingSquare: cell.square };
      }
    }
  }
  return { inCheck: true, kingSquare: null };
}

export function computeCapturedSummary(history: MoveRecord[], upToPly = history.length): CapturedSummary {
  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];
  let whiteScore = 0;
  let blackScore = 0;

  const limit = Math.max(0, Math.min(upToPly, history.length));
  for (let i = 0; i < limit; i++) {
    const move = history[i];
    if (move.captured) {
      if (move.color === 'w') {
        capturedByWhite.push(move.captured);
        whiteScore += PIECE_VALUES[move.captured];
      } else {
        capturedByBlack.push(move.captured);
        blackScore += PIECE_VALUES[move.captured];
      }
    }
  }

  const sortOrder: Record<PieceType, number> = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };
  capturedByWhite.sort((a, b) => sortOrder[a] - sortOrder[b]);
  capturedByBlack.sort((a, b) => sortOrder[a] - sortOrder[b]);

  return {
    capturedByWhite,
    capturedByBlack,
    whiteMaterialAdvantage: whiteScore - blackScore,
  };
}

export function getBoardPiecesFromFen(fen: string): Array<{ square: string; type: PieceType; color: PieceColor }> {
  const chess = new Chess(fen);
  const board = chess.board();
  const pieces: Array<{ square: string; type: PieceType; color: PieceColor }> = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (cell) {
        pieces.push({
          square: cell.square,
          type: cell.type as PieceType,
          color: cell.color as PieceColor,
        });
      }
    }
  }
  return pieces;
}

export function getFenAtPly(history: MoveRecord[], ply: number): string {
  if (ply <= 0 || history.length === 0) {
    return history[0]?.fenBefore ?? INITIAL_FEN;
  }
  const idx = Math.min(ply, history.length) - 1;
  return history[idx].fenAfter;
}

export function getPlayerProfiles(
  mode: GameMode,
  difficulty: Difficulty,
  playerSide: PieceColor
): { white: PlayerProfile; black: PlayerProfile } {
  const aiProfiles: Record<Difficulty, { name: string; rating: number }> = {
    easy: { name: 'Stockfish Novice', rating: 950 },
    medium: { name: 'Stockfish Master', rating: 1580 },
    hard: { name: 'Stockfish Grandmaster', rating: 2420 },
  };

  if (mode === 'pvp') {
    return {
      white: { name: 'White Player', rating: 1500, isAI: false },
      black: { name: 'Black Player', rating: 1500, isAI: false },
    };
  }

  if (mode === 'aivai') {
    const ai = aiProfiles[difficulty];
    return {
      white: { name: `${ai.name} (W)`, rating: ai.rating, isAI: true },
      black: { name: `${ai.name} (B)`, rating: ai.rating, isAI: true },
    };
  }

  const ai = aiProfiles[difficulty];
  if (playerSide === 'w') {
    return {
      white: { name: 'Challenger', rating: 1520, isAI: false },
      black: { name: ai.name, rating: ai.rating, isAI: true },
    };
  }
  return {
    white: { name: ai.name, rating: ai.rating, isAI: true },
    black: { name: 'Challenger', rating: 1520, isAI: false },
  };
}

export function formatClock(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function isValidSavedGameState(raw: unknown): raw is SavedGameState {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.fen !== 'string') return false;
  if (!Array.isArray(obj.history)) return false;
  try {
    // Validate FEN with chess.js
    new Chess(obj.fen);
    return true;
  } catch {
    return false;
  }
}
