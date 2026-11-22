import React from 'react';
import { Award, Play, RotateCcw, Home, Eye } from 'lucide-react';
import type { GameOutcome, PieceColor, PromotionPiece } from '../chess/types';
import { PieceSvgIcon } from './PieceIcons';

interface PromotionModalProps {
  color: PieceColor;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ color, onSelect, onCancel }) => {
  const options: Array<{ type: PromotionPiece; label: string }> = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#16171d] border border-[#d4af37]/50 p-5 shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-[0.2em] text-[#d4af37] font-semibold">
            Pawn Promotion
          </div>
          <h2 className="text-lg font-bold text-[#f4efe6]">Choose Promotion Piece</h2>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#1f212a] hover:bg-[#2a2d38] border border-[#343746] hover:border-[#d4af37] transition-colors cursor-pointer"
            >
              <PieceSvgIcon type={opt.type} color={color} className="w-9 h-9" />
              <span className="text-xs font-semibold text-[#ede6d8]">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 rounded-lg text-xs text-[#a59f94] hover:text-[#f4efe6] cursor-pointer"
        >
          Cancel Move
        </button>
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToTitle,
}) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-[#16171d] border border-[#323542] p-6 shadow-2xl space-y-5">
      <div className="text-center space-y-1">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#d4af37] font-semibold">
          Match Paused
        </div>
        <h2 className="text-xl font-bold text-[#f4efe6]">Game Menu</h2>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onResume}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#d4af37] hover:bg-[#e1be4d] text-[#14151a] font-bold text-sm cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Resume Match</span>
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#20222b] hover:bg-[#2a2d38] border border-[#343746] text-[#f4efe6] font-semibold text-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-[#d4af37]" />
          <span>Restart Board</span>
        </button>
        <button
          type="button"
          onClick={onReturnToTitle}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1b22] hover:bg-[#23252f] border border-[#2c2f3b] text-[#cbc4b8] font-semibold text-sm cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Title</span>
        </button>
      </div>
    </div>
  </div>
);

interface GameOverModalProps {
  outcome: GameOutcome;
  totalMoves: number;
  whiteName: string;
  blackName: string;
  onPlayAgain: () => void;
  onInspectBoard: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  outcome,
  totalMoves,
  whiteName,
  blackName,
  onPlayAgain,
  onInspectBoard,
  onReturnToTitle,
}) => {
  const heading =
    outcome.winner === 'draw'
      ? 'Match Drawn'
      : outcome.winner === 'w'
        ? `${whiteName} Wins`
        : `${blackName} Wins`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#16171d] border border-[#d4af37]/55 p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-11 h-11 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37]">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#d4af37] font-semibold">
            {outcome.status === 'checkmate'
              ? 'Checkmate'
              : outcome.status === 'timeout'
                ? 'Time Expired'
                : 'Game Complete'}
          </div>
          <h2 className="text-2xl font-bold text-[#f4efe6]">{heading}</h2>
          <p className="text-sm text-[#bfb8aa]">{outcome.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-[#111217] rounded-xl p-3.5 border border-[#272934]">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#8e887d]">Total Plies</div>
            <div className="text-lg font-bold text-[#f4efe6] tabular-nums">{totalMoves}</div>
          </div>
          <div className="text-center border-l border-[#272934]">
            <div className="text-[10px] uppercase tracking-wider text-[#8e887d]">Result</div>
            <div className="text-lg font-bold text-[#d4af37] tabular-nums">
              {outcome.winner === 'w' ? '1 - 0' : outcome.winner === 'b' ? '0 - 1' : '½ - ½'}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#d4af37] hover:bg-[#e1be4d] text-[#14151a] font-bold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onInspectBoard}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#20222b] hover:bg-[#2a2d38] border border-[#343746] text-[#f4efe6] font-semibold text-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Review &amp; Replay</span>
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1a1b22] hover:bg-[#23252f] border border-[#2c2f3b] text-[#cbc4b8] font-semibold text-xs cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Title Screen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
