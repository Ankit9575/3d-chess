import React from 'react';
import { Play, RotateCcw, Cpu, Users, Bot } from 'lucide-react';
import type { Difficulty, GameMode } from '../chess/types';
import { AureliaTitleLockup } from './PieceIcons';
import { PWAInstallButton } from './PWAInstallUI';

interface TitleScreenProps {
  mode: GameMode;
  difficulty: Difficulty;
  hasSavedMatch: boolean;
  savedMoveCount: number;
  onChangeMode: (mode: GameMode) => void;
  onChangeDifficulty: (difficulty: Difficulty) => void;
  onStartNewGame: () => void;
  onResumeSavedGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  mode,
  difficulty,
  hasSavedMatch,
  savedMoveCount,
  onChangeMode,
  onChangeDifficulty,
  onStartNewGame,
  onResumeSavedGame,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between px-5 sm:p-10 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {/* Subtle dark vignette on the left third so text stays ultra legible over the 3D scene */}
      <div
        className="fixed inset-y-0 left-0 w-full sm:w-[540px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(14,15,19,0.94) 0%, rgba(14,15,19,0.84) 68%, rgba(14,15,19,0) 100%)',
        }}
      />

      <div className="relative z-10 max-w-[430px] my-auto pointer-events-auto space-y-6">
        <AureliaTitleLockup />

        <p className="text-sm sm:text-base text-[#cbc4b8] leading-relaxed max-w-[38ch]">
          Sculpted Staunton &amp; marble pieces in an atmospheric 3D salon, powered by chess.js rules and Stockfish AI.
        </p>

        {/* Mode Selector */}
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#b4a894] font-semibold">
            Match Format
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'pvai', label: 'vs Stockfish', icon: Cpu },
                { id: 'pvp', label: '2P Local', icon: Users },
                { id: 'aivai', label: 'AI Exhibition', icon: Bot },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeMode(opt.id)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                      : 'bg-[#1a1b21]/95 border-[#343642] text-[#b8b3a8] hover:border-[#6e644c] hover:text-[#f4efe6]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Selector */}
        {mode !== 'pvp' && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#b4a894] font-semibold">
              Stockfish Strength
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map((lvl) => {
                const active = difficulty === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeDifficulty(lvl)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                        : 'bg-[#1a1b21]/95 border-[#343642] text-[#b8b3a8] hover:border-[#6e644c] hover:text-[#f4efe6]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onStartNewGame}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#e1be4d] active:scale-[0.99] text-[#141418] font-bold text-sm tracking-wide shadow-lg transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Chess</span>
          </button>

          {hasSavedMatch && savedMoveCount > 0 && (
            <button
              type="button"
              onClick={onResumeSavedGame}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#1b1c22] hover:bg-[#24262f] border border-[#d4af37]/45 text-[#f4efe6] font-semibold text-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#d4af37]" />
              <span>Resume ({savedMoveCount} moves)</span>
            </button>
          )}

          <PWAInstallButton variant="title" />
        </div>
      </div>

      {/* Single flat borderless control hint */}
      <div className="relative z-10 text-xs text-[#9c9589] tracking-wide">
        Click or Drag Pieces · Drag Board to Orbit · Scroll to Zoom · Esc Menu
      </div>
    </div>
  );
};
