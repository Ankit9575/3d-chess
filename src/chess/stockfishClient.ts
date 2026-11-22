import { Chess } from 'chess.js';
import type { Difficulty, PromotionPiece } from './types';
import { PIECE_VALUES, parseUciMove } from './engine';

export interface AiMoveSuggestion {
  from: string;
  to: string;
  promotion?: PromotionPiece;
  source: 'stockfish' | 'fallback';
}

interface DifficultyConfig {
  skillLevel: number;
  depth: number;
  movetime: number;
}

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  easy: { skillLevel: 1, depth: 2, movetime: 180 },
  medium: { skillLevel: 8, depth: 6, movetime: 450 },
  hard: { skillLevel: 18, depth: 12, movetime: 1100 },
};

/**
 * Pure alpha-beta fallback in case Web Worker fails to start.
 */
function computeFallbackMove(fen: string, difficulty: Difficulty): AiMoveSuggestion | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    // Weighted toward captures or random legal move
    const captures = moves.filter((m) => m.captured);
    const pool = captures.length > 0 && Math.random() < 0.65 ? captures : moves;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
      from: pick.from,
      to: pick.to,
      promotion: pick.promotion as PromotionPiece | undefined,
      source: 'fallback',
    };
  }

  const maxDepth = difficulty === 'medium' ? 2 : 3;
  const maximizing = chess.turn() === 'w';

  function evaluateBoard(c: Chess): number {
    if (c.isCheckmate()) return c.turn() === 'w' ? -99999 : 99999;
    if (c.isDraw()) return 0;
    const board = c.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell) continue;
        const val = PIECE_VALUES[cell.type];
        const centerBonus = (3.5 - Math.abs(3.5 - f) + (3.5 - Math.abs(3.5 - r))) * 0.06;
        const total = val + centerBonus;
        score += cell.color === 'w' ? total : -total;
      }
    }
    return score;
  }

  function alphabeta(c: Chess, depth: number, alpha: number, beta: number, isMax: boolean): number {
    if (depth === 0 || c.isGameOver()) {
      return evaluateBoard(c);
    }
    const legal = c.moves({ verbose: true });
    // Order captures first for better pruning
    legal.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

    if (isMax) {
      let value = -Infinity;
      for (const m of legal) {
        c.move(m);
        value = Math.max(value, alphabeta(c, depth - 1, alpha, beta, false));
        c.undo();
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    } else {
      let value = Infinity;
      for (const m of legal) {
        c.move(m);
        value = Math.min(value, alphabeta(c, depth - 1, alpha, beta, true));
        c.undo();
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return value;
    }
  }

  let bestMove = moves[0];
  let bestScore = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = alphabeta(chess, maxDepth - 1, -Infinity, Infinity, !maximizing);
    chess.undo();
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return {
    from: bestMove.from,
    to: bestMove.to,
    promotion: bestMove.promotion as PromotionPiece | undefined,
    source: 'fallback',
  };
}

export class StockfishClient {
  private worker: Worker | null = null;
  private ready = false;
  private failed = false;
  private readyResolvers: Array<() => void> = [];
  private activeSearchId = 0;
  private pendingResolve: ((move: AiMoveSuggestion | null) => void) | null = null;
  private pendingTimeout: number | null = null;
  private pendingFen = '';
  private pendingDifficulty: Difficulty = 'medium';

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof Worker === 'undefined') {
      this.failed = true;
      return;
    }
    try {
      const worker = new Worker('/stockfish/stockfish.js');
      this.worker = worker;

      worker.onmessage = (e: MessageEvent<string>) => {
        const line = typeof e.data === 'string' ? e.data : String(e.data ?? '');
        if (line === 'uciok') {
          worker.postMessage('isready');
        } else if (line === 'readyok') {
          this.ready = true;
          const resolvers = this.readyResolvers.splice(0);
          resolvers.forEach((r) => r());
        } else if (line.startsWith('bestmove ')) {
          const token = line.split(' ')[1];
          const resolver = this.pendingResolve;
          this.clearPendingTimer();
          this.pendingResolve = null;

          if (resolver) {
            if (!token || token === '(none)') {
              resolver(computeFallbackMove(this.pendingFen, this.pendingDifficulty));
            } else {
              const parsed = parseUciMove(token);
              if (parsed) {
                resolver({ ...parsed, source: 'stockfish' });
              } else {
                resolver(computeFallbackMove(this.pendingFen, this.pendingDifficulty));
              }
            }
          }
        }
      };

      worker.onerror = () => {
        this.failed = true;
        if (this.pendingResolve) {
          const resolver = this.pendingResolve;
          this.clearPendingTimer();
          this.pendingResolve = null;
          resolver(computeFallbackMove(this.pendingFen, this.pendingDifficulty));
        }
      };

      worker.postMessage('uci');
    } catch {
      this.failed = true;
    }
  }

  private clearPendingTimer(): void {
    if (this.pendingTimeout !== null) {
      window.clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
  }

  private waitForReady(timeoutMs = 3000): Promise<boolean> {
    if (this.failed) return Promise.resolve(false);
    if (this.ready) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      const timer = window.setTimeout(() => {
        resolve(false);
      }, timeoutMs);
      this.readyResolvers.push(() => {
        window.clearTimeout(timer);
        resolve(true);
      });
    });
  }

  public cancelSearch(): void {
    this.activeSearchId++;
    this.clearPendingTimer();
    if (this.worker && this.ready) {
      this.worker.postMessage('stop');
    }
    if (this.pendingResolve) {
      const res = this.pendingResolve;
      this.pendingResolve = null;
      res(null);
    }
  }

  public async findBestMove(fen: string, difficulty: Difficulty): Promise<AiMoveSuggestion | null> {
    this.cancelSearch();
    const searchId = this.activeSearchId;
    this.pendingFen = fen;
    this.pendingDifficulty = difficulty;

    const isReady = await this.waitForReady(2500);
    if (searchId !== this.activeSearchId) return null;

    if (!isReady || !this.worker || this.failed) {
      return computeFallbackMove(fen, difficulty);
    }

    const cfg = DIFFICULTY_SETTINGS[difficulty];
    return new Promise<AiMoveSuggestion | null>((resolve) => {
      this.pendingResolve = resolve;
      this.pendingTimeout = window.setTimeout(() => {
        if (this.pendingResolve === resolve) {
          this.pendingResolve = null;
          this.worker?.postMessage('stop');
          resolve(computeFallbackMove(fen, difficulty));
        }
      }, cfg.movetime + 2500);

      this.worker!.postMessage(`setoption name Skill Level value ${cfg.skillLevel}`);
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(`go depth ${cfg.depth} movetime ${cfg.movetime}`);
    });
  }

  public dispose(): void {
    this.cancelSearch();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
