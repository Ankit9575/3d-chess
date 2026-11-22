import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_FEN,
  applyChessMove,
  computeCapturedSummary,
  evaluateGameOutcome,
  formatClock,
  getBoardPiecesFromFen,
  getFenAtPly,
  getLegalMovesForSquare,
  isInCheckFromFen,
  isPromotionMove,
  isValidSavedGameState,
  parseUciMove,
  squareToWorldXZ,
} from './engine';
import type { MoveRecord } from './types';

test('initial position has 20 legal moves for white and 32 pieces', () => {
  const pieces = getBoardPiecesFromFen(INITIAL_FEN);
  assert.equal(pieces.length, 32);

  const e2Moves = getLegalMovesForSquare(INITIAL_FEN, 'e2');
  assert.deepEqual(
    e2Moves.map((m) => m.to).sort(),
    ['e3', 'e4']
  );
});

test('Fool’s Mate produces checkmate outcome for Black', () => {
  const m1 = applyChessMove(INITIAL_FEN, 'f2', 'f3', 'q', 1);
  assert.ok(m1);
  const m2 = applyChessMove(m1.fenAfter, 'e7', 'e5', 'q', 2);
  assert.ok(m2);
  const m3 = applyChessMove(m2.fenAfter, 'g2', 'g4', 'q', 3);
  assert.ok(m3);
  const m4 = applyChessMove(m3.fenAfter, 'd8', 'h4', 'q', 4);
  assert.ok(m4);
  assert.equal(m4.isCheckmate, true);

  const outcome = evaluateGameOutcome(m4.fenAfter);
  assert.equal(outcome.status, 'checkmate');
  assert.equal(outcome.winner, 'b');

  const checkInfo = isInCheckFromFen(m4.fenAfter);
  assert.equal(checkInfo.inCheck, true);
  assert.equal(checkInfo.kingSquare, 'e1');
});

test('castling produces synchronized rookMove metadata', () => {
  const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
  const kingside = applyChessMove(fen, 'e1', 'g1', 'q', 1);
  assert.ok(kingside);
  assert.equal(kingside.isCastling, true);
  assert.deepEqual(kingside.rookMove, { from: 'h1', to: 'f1' });

  const queenside = applyChessMove(fen, 'e1', 'c1', 'q', 1);
  assert.ok(queenside);
  assert.equal(queenside.isCastling, true);
  assert.deepEqual(queenside.rookMove, { from: 'a1', to: 'd1' });
});

test('en passant captures pawn on adjacent rank', () => {
  const fen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
  const ep = applyChessMove(fen, 'e5', 'd6', 'q', 3);
  assert.ok(ep);
  assert.equal(ep.isEnPassant, true);
  assert.equal(ep.captured, 'p');
  assert.equal(ep.capturedSquare, 'd5');
});

test('pawn promotion detection and execution work for all promotion pieces', () => {
  const fen = '8/4P3/8/8/8/8/6k1/4K3 w - - 0 1';
  assert.equal(isPromotionMove(fen, 'e7', 'e8'), true);
  assert.equal(isPromotionMove(fen, 'e1', 'e2'), false);

  const promo = applyChessMove(fen, 'e7', 'e8', 'n', 1);
  assert.ok(promo);
  assert.equal(promo.promotion, 'n');
  assert.equal(promo.san.includes('=N'), true);
});

test('stalemate and insufficient material draws are detected accurately', () => {
  const stalemateFen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
  const stale = evaluateGameOutcome(stalemateFen);
  assert.equal(stale.status, 'stalemate');
  assert.equal(stale.winner, 'draw');

  const insuffFen = '8/8/8/4k3/8/8/4N3/4K3 w - - 0 1';
  const insuff = evaluateGameOutcome(insuffFen);
  assert.equal(insuff.status, 'draw_insufficient');
  assert.equal(insuff.winner, 'draw');
});

test('captured summary and replay ply reconstruction track history', () => {
  const m1 = applyChessMove(INITIAL_FEN, 'e2', 'e4', 'q', 1)!;
  const m2 = applyChessMove(m1.fenAfter, 'd7', 'd5', 'q', 2)!;
  const m3 = applyChessMove(m2.fenAfter, 'e4', 'd5', 'q', 3)!;
  const history: MoveRecord[] = [m1, m2, m3];

  const summary = computeCapturedSummary(history);
  assert.deepEqual(summary.capturedByWhite, ['p']);
  assert.deepEqual(summary.capturedByBlack, []);
  assert.equal(summary.whiteMaterialAdvantage, 1);

  assert.equal(getFenAtPly(history, 0), INITIAL_FEN);
  assert.equal(getFenAtPly(history, 2), m2.fenAfter);
  assert.equal(getFenAtPly(history, 3), m3.fenAfter);
});

test('UCI parsing, world coordinates, clock formatting, and save validation', () => {
  assert.deepEqual(parseUciMove('e7e8q'), { from: 'e7', to: 'e8', promotion: 'q' });
  assert.equal(parseUciMove('invalid'), null);

  const a1 = squareToWorldXZ('a1', 1);
  const h8 = squareToWorldXZ('h8', 1);
  assert.equal(a1.x, -3.5);
  assert.equal(a1.z, 3.5);
  assert.equal(h8.x, 3.5);
  assert.equal(h8.z, -3.5);

  assert.equal(formatClock(65), '1:05');
  assert.equal(formatClock(0), '0:00');

  assert.equal(isValidSavedGameState({ version: 1, fen: INITIAL_FEN, history: [] }), true);
  assert.equal(isValidSavedGameState({ version: 1, fen: 'bad-fen', history: [] }), false);
});
