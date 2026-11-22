import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  FlipVertical,
  History,
  Maximize2,
  Minimize2,
  Music,
  Palette,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  SquarePlus,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  BoardThemeId,
  CapturedSummary,
  Difficulty,
  GameMode,
  GameOutcome,
  MoveRecord,
  PieceColor,
  PieceStyleId,
  PlayerProfile,
  TimeControlSeconds,
  CameraPresetId,
} from '../chess/types';
import { formatClock } from '../chess/engine';
import { PieceSvgIcon } from './PieceIcons';
import { PWAInstallButton } from './PWAInstallUI';

interface HudOverlayProps {
  whiteProfile: PlayerProfile;
  blackProfile: PlayerProfile;
  whiteTime: number;
  blackTime: number;
  timeControl: TimeControlSeconds;
  activeTurn: PieceColor;
  outcome: GameOutcome;
  isAiThinking: boolean;
  isAiVsAiPaused: boolean;
  mode: GameMode;
  difficulty: Difficulty;
  playerSide: PieceColor;
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
  cameraPreset: CameraPresetId;
  flipped: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  isFullscreen: boolean;
  history: MoveRecord[];
  captured: CapturedSummary;
  replayPly: number | null;
  isReplayingAuto: boolean;
  canUndo: boolean;
  onNewGame: () => void;
  onRestart: () => void;
  onUndo: () => void;
  onFlipBoard: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onToggleFullscreen: () => void;
  onOpenPause: () => void;
  onChangeMode: (mode: GameMode) => void;
  onChangeDifficulty: (difficulty: Difficulty) => void;
  onChangePlayerSide: (side: PieceColor) => void;
  onChangeTheme: (theme: BoardThemeId) => void;
  onChangePieceStyle: (style: PieceStyleId) => void;
  onChangeTimeControl: (tc: TimeControlSeconds) => void;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
  onResetCamera: () => void;
  onToggleAiVsAiPause: () => void;
  onJumpToPly: (ply: number | null) => void;
  onToggleAutoReplay: () => void;
}

interface PlayerBannerProps {
  color: PieceColor;
  profile: PlayerProfile;
  timeSeconds: number;
  timeControl: TimeControlSeconds;
  isTurn: boolean;
  capturedPieces: Array<'p' | 'n' | 'b' | 'r' | 'q' | 'k'>;
  materialAdv: number;
}

const PlayerBanner: React.FC<PlayerBannerProps> = ({
  color,
  profile,
  timeSeconds,
  timeControl,
  isTurn,
  capturedPieces,
  materialAdv,
}) => {
  const isWhite = color === 'w';
  return (
    <div
      className={`pointer-events-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border transition-colors min-w-0 ${
        isTurn
          ? 'bg-[#191a20]/95 border-[#d4af37] shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
          : 'bg-[#14151a]/90 border-[#2b2d37]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Piece Crest Dot */}
        <div
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border shrink-0 ${
            isWhite ? 'bg-[#f5eedf] border-[#c8b282]' : 'bg-[#202229] border-[#454856]'
          }`}
        >
          <PieceSvgIcon type="k" color={color} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>

        {/* Name, Rating & Captured */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-sm font-semibold text-[#f4efe6] truncate max-w-[90px] sm:max-w-[130px]">
              {profile.name}
            </span>
            <span className="hidden sm:inline text-[11px] font-medium text-[#b5a992] tabular-nums">
              {profile.rating}
            </span>
          </div>

          <div className="flex items-center gap-1 min-h-[14px] sm:min-h-[16px] mt-0.5">
            {capturedPieces.length === 0 ? (
              <span className="text-[10px] text-[#6d6a63] truncate">
                {isTurn ? 'Active' : 'Waiting'}
              </span>
            ) : (
              <div className="flex items-center gap-0.5 flex-wrap max-w-[110px] sm:max-w-[150px]">
                {capturedPieces.slice(0, 6).map((p, idx) => (
                  <PieceSvgIcon
                    key={`${p}-${idx}`}
                    type={p}
                    color={isWhite ? 'b' : 'w'}
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                  />
                ))}
                {capturedPieces.length > 6 && (
                  <span className="text-[10px] text-[#b5a992]">+{capturedPieces.length - 6}</span>
                )}
                {materialAdv > 0 && (
                  <span className="ml-0.5 text-[10px] font-bold text-[#d4af37] tabular-nums">
                    +{materialAdv}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clock */}
      <div
        className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-mono text-[11px] sm:text-sm font-bold tabular-nums border shrink-0 ${
          isTurn
            ? 'bg-[#d4af37]/15 border-[#d4af37]/50 text-[#f8e6ae]'
            : 'bg-[#101116] border-[#262832] text-[#9b968d]'
        }`}
      >
        {timeControl === 0 ? '∞' : formatClock(timeSeconds)}
      </div>
    </div>
  );
};

export const HudOverlay: React.FC<HudOverlayProps> = ({
  whiteProfile,
  blackProfile,
  whiteTime,
  blackTime,
  timeControl,
  activeTurn,
  outcome,
  isAiThinking,
  isAiVsAiPaused,
  mode,
  difficulty,
  playerSide,
  boardTheme,
  pieceStyle,
  cameraPreset,
  flipped,
  soundEnabled,
  musicEnabled,
  isFullscreen,
  history,
  captured,
  replayPly,
  isReplayingAuto,
  canUndo,
  onNewGame,
  onRestart,
  onUndo,
  onFlipBoard,
  onToggleSound,
  onToggleMusic,
  onToggleFullscreen,
  onOpenPause,
  onChangeMode,
  onChangeDifficulty,
  onChangePlayerSide,
  onChangeTheme,
  onChangePieceStyle,
  onChangeTimeControl,
  onSelectCameraPreset,
  onResetCamera,
  onToggleAiVsAiPause,
  onJumpToPly,
  onToggleAutoReplay,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'none' | 'moves' | 'themes'>('none');

  const isReplayMode = replayPly !== null;
  const currentPly = replayPly ?? history.length;

  // Group moves into paired rows: [{ num, white, black }]
  const moveRows: Array<{ num: number; white?: MoveRecord; black?: MoveRecord }> = [];
  for (let i = 0; i < history.length; i += 2) {
    moveRows.push({
      num: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    });
  }

  const toggleTab = (tab: 'moves' | 'themes') => {
    setDockCollapsed(false);
    setActiveTab((prev) => (prev === tab ? 'none' : tab));
  };

  const statusText = isReplayMode
    ? `Replay · Move ${currentPly} / ${history.length}`
    : isAiThinking
      ? 'Stockfish Thinking...'
      : outcome.reason;

  const isCheckStatus = !isReplayMode && outcome.status === 'active' && outcome.reason.includes('check');

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between px-2.5 sm:p-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      {/* Top Perimeter Bar */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-start justify-between gap-2">
        {/* Left Player Banner */}
        <PlayerBanner
          color={flipped ? 'w' : 'b'}
          profile={flipped ? whiteProfile : blackProfile}
          timeSeconds={flipped ? whiteTime : blackTime}
          timeControl={timeControl}
          isTurn={!isReplayMode && outcome.status === 'active' && activeTurn === (flipped ? 'w' : 'b')}
          capturedPieces={flipped ? captured.capturedByWhite : captured.capturedByBlack}
          materialAdv={
            flipped
              ? Math.max(0, captured.whiteMaterialAdvantage)
              : Math.max(0, -captured.whiteMaterialAdvantage)
          }
        />

        {/* Center Status & Utility Strip */}
        <div className="pointer-events-auto col-span-2 sm:col-span-1 flex items-center gap-1.5 bg-[#15161b]/95 border border-[#2d303c] rounded-xl px-2.5 py-1 sm:py-1.5 shadow-lg order-last sm:order-none w-full sm:w-auto justify-between sm:justify-center">
          <span
            data-testid="game-status-text"
            className={`px-2 py-0.5 text-xs font-semibold tracking-wide truncate max-w-[210px] ${
              isCheckStatus
                ? 'text-[#f87171]'
                : isReplayMode
                  ? 'text-[#6ee7b7]'
                  : 'text-[#e8decb]'
            }`}
          >
            {statusText}
          </span>

          <div className="flex items-center gap-1 border-l border-[#2d303c] pl-1.5">
            {mode === 'aivai' && (
              <button
                type="button"
                onClick={onToggleAiVsAiPause}
                aria-label={isAiVsAiPaused ? 'Resume AI Exhibition' : 'Pause AI Exhibition'}
                title={isAiVsAiPaused ? 'Resume AI Exhibition' : 'Pause AI Exhibition'}
                className="p-1.5 rounded-lg text-[#d4af37] hover:bg-[#252732] transition-colors cursor-pointer"
              >
                {isAiVsAiPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
              title={soundEnabled ? 'Sound Effects On' : 'Sound Effects Off'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                soundEnabled ? 'text-[#f4efe6] hover:bg-[#252732]' : 'text-[#6c6b70] hover:bg-[#252732]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleMusic}
              aria-label={musicEnabled ? 'Mute Background Music' : 'Enable Background Music'}
              title={musicEnabled ? 'Ambient Music On' : 'Ambient Music Off'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                musicEnabled ? 'text-[#d4af37] bg-[#d4af37]/15' : 'text-[#7c7b82] hover:bg-[#252732]'
              }`}
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-lg text-[#cbc4b8] hover:bg-[#252732] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <PWAInstallButton variant="compact" />
            <button
              type="button"
              onClick={onOpenPause}
              aria-label="Open Game Menu"
              title="Game Menu (Esc)"
              className="p-1.5 rounded-lg text-[#cbc4b8] hover:bg-[#252732] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Player Banner */}
        <PlayerBanner
          color={flipped ? 'b' : 'w'}
          profile={flipped ? blackProfile : whiteProfile}
          timeSeconds={flipped ? blackTime : whiteTime}
          timeControl={timeControl}
          isTurn={!isReplayMode && outcome.status === 'active' && activeTurn === (flipped ? 'b' : 'w')}
          capturedPieces={flipped ? captured.capturedByBlack : captured.capturedByWhite}
          materialAdv={
            flipped
              ? Math.max(0, -captured.whiteMaterialAdvantage)
              : Math.max(0, captured.whiteMaterialAdvantage)
          }
        />
      </div>

      {/* Bottom Collapsible Command & Notation Dock */}
      <div className="flex flex-col items-center w-full">
        {/* Collapse Toggle Tab */}
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-label={dockCollapsed ? 'Show Controls' : 'Hide Controls'}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#15161c]/95 border border-b-0 border-[#2d303c] text-[11px] font-medium text-[#bdb4a4] hover:text-[#f4efe6] transition-colors cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Controls' : 'Hide Dock'}</span>
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full max-w-[960px] bg-[#14151a]/95 border border-[#2d303c] rounded-2xl shadow-2xl overflow-hidden">
            {/* Expandable Drawer Content (Moves/Replay OR Themes/Settings) */}
            {activeTab === 'moves' && (
              <div className="border-b border-[#262833] p-3 bg-[#101116]/95 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#e6dccb] flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Move History &amp; Replay</span>
                    <span className="text-[11px] text-[#8d877c] tabular-nums">
                      ({history.length} {history.length === 1 ? 'ply' : 'plies'})
                    </span>
                  </div>

                  {/* Replay Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={history.length === 0}
                      onClick={() => onJumpToPly(0)}
                      aria-label="Replay First Move"
                      className="p-1.5 rounded-lg bg-[#1b1d24] hover:bg-[#262934] disabled:opacity-40 text-[#e6dccb] cursor-pointer"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={history.length === 0 || currentPly <= 0}
                      onClick={() => onJumpToPly(Math.max(0, currentPly - 1))}
                      aria-label="Replay Previous Move"
                      className="p-1.5 rounded-lg bg-[#1b1d24] hover:bg-[#262934] disabled:opacity-40 text-[#e6dccb] cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={history.length === 0}
                      onClick={onToggleAutoReplay}
                      aria-label={isReplayingAuto ? 'Pause Replay' : 'Play Replay'}
                      className="px-2.5 py-1 rounded-lg bg-[#d4af37]/20 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 disabled:opacity-40 text-[#f5e3ab] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {isReplayingAuto ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isReplayingAuto ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={history.length === 0 || currentPly >= history.length}
                      onClick={() => {
                        const next = currentPly + 1;
                        onJumpToPly(next >= history.length ? null : next);
                      }}
                      aria-label="Replay Next Move"
                      className="p-1.5 rounded-lg bg-[#1b1d24] hover:bg-[#262934] disabled:opacity-40 text-[#e6dccb] cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!isReplayMode}
                      onClick={() => onJumpToPly(null)}
                      aria-label="Jump to Live Position"
                      className="px-2.5 py-1 rounded-lg bg-[#1b1d24] hover:bg-[#262934] disabled:opacity-40 text-[#6ee7b7] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                      <span>Live</span>
                    </button>
                  </div>
                </div>

                {/* Standard Algebraic Move List */}
                <div className="chess-scroll max-h-[108px] overflow-y-auto pr-1">
                  {moveRows.length === 0 ? (
                    <div className="text-xs text-[#7e7970] py-2">
                      No moves played yet. Select or drag a piece on the 3D board to begin.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                      {moveRows.map((row) => (
                        <div
                          key={row.num}
                          className="flex items-center gap-1 bg-[#171920] rounded-lg px-2 py-1 text-xs tabular-nums"
                        >
                          <span className="text-[#7c766b] w-5 shrink-0">{row.num}.</span>
                          {row.white && (
                            <button
                              type="button"
                              onClick={() => onJumpToPly(row.white!.ply === history.length ? null : row.white!.ply)}
                              className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                                currentPly === row.white.ply
                                  ? 'bg-[#d4af37] text-[#14151a] font-bold'
                                  : 'text-[#ede6d8] hover:bg-[#272a35]'
                              }`}
                            >
                              {row.white.san}
                            </button>
                          )}
                          {row.black && (
                            <button
                              type="button"
                              onClick={() => onJumpToPly(row.black!.ply === history.length ? null : row.black!.ply)}
                              className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                                currentPly === row.black.ply
                                  ? 'bg-[#d4af37] text-[#14151a] font-bold'
                                  : 'text-[#c9c2b5] hover:bg-[#272a35]'
                              }`}
                            >
                              {row.black.san}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'themes' && (
              <div className="border-b border-[#262833] p-3 bg-[#101116]/95 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Board Theme */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#9d9483] font-semibold">
                    Board Theme
                  </div>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: 'walnut', label: 'Walnut' },
                        { id: 'marble', label: 'Marble' },
                        { id: 'obsidian', label: 'Obsidian' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onChangeTheme(t.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg border font-medium cursor-pointer ${
                          boardTheme === t.id
                            ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                            : 'bg-[#1a1c23] border-[#2d303c] text-[#b8b2a6] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Piece Style */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#9d9483] font-semibold">
                    Piece Style
                  </div>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: 'staunton', label: 'Staunton' },
                        { id: 'imperial', label: 'Imperial' },
                        { id: 'minimalist', label: 'Modern' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onChangePieceStyle(s.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg border font-medium cursor-pointer ${
                          pieceStyle === s.id
                            ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                            : 'bg-[#1a1c23] border-[#2d303c] text-[#b8b2a6] hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Control */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#9d9483] font-semibold">
                    Clock Control
                  </div>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { val: 180, label: '3m' },
                        { val: 300, label: '5m' },
                        { val: 600, label: '10m' },
                        { val: 0, label: '∞' },
                      ] as const
                    ).map((tc) => (
                      <button
                        key={tc.val}
                        type="button"
                        onClick={() => onChangeTimeControl(tc.val)}
                        className={`flex-1 py-1.5 px-2 rounded-lg border font-medium tabular-nums cursor-pointer ${
                          timeControl === tc.val
                            ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                            : 'bg-[#1a1c23] border-[#2d303c] text-[#b8b2a6] hover:text-white'
                        }`}
                      >
                        {tc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Play Side in PvAI */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#9d9483] font-semibold">
                    Your Side (vs AI)
                  </div>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: 'w', label: 'White' },
                        { id: 'b', label: 'Black' },
                      ] as const
                    ).map((side) => (
                      <button
                        key={side.id}
                        type="button"
                        disabled={mode !== 'pvai'}
                        onClick={() => onChangePlayerSide(side.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg border font-medium disabled:opacity-40 cursor-pointer ${
                          playerSide === side.id
                            ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                            : 'bg-[#1a1c23] border-[#2d303c] text-[#b8b2a6] hover:text-white'
                        }`}
                      >
                        {side.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Main Dock Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              {/* Primary Game Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onNewGame}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#e1be4d] text-[#14151a] text-xs font-bold cursor-pointer"
                >
                  <SquarePlus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  title="Restart Current Match"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1d1f27] hover:bg-[#282b36] text-[#e6dfd1] text-xs font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restart</span>
                </button>
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={onUndo}
                  title="Undo Move"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1d1f27] hover:bg-[#282b36] disabled:opacity-40 text-[#e6dfd1] text-xs font-medium cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                  type="button"
                  onClick={onFlipBoard}
                  title="Flip Board"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1d1f27] hover:bg-[#282b36] text-[#e6dfd1] text-xs font-medium cursor-pointer"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip</span>
                </button>
              </div>

              {/* Mode & Difficulty Selectors */}
              <div className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor="game-mode-select">
                  Game Mode
                </label>
                <select
                  id="game-mode-select"
                  value={mode}
                  onChange={(e) => onChangeMode(e.target.value as GameMode)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1d1f27] border border-[#2f323f] text-xs font-medium text-[#ede6d8] cursor-pointer"
                >
                  <option value="pvai">vs Stockfish AI</option>
                  <option value="pvp">2P Local</option>
                  <option value="aivai">AI vs AI</option>
                </select>

                <label className="sr-only" htmlFor="difficulty-select">
                  AI Difficulty
                </label>
                <select
                  id="difficulty-select"
                  value={difficulty}
                  disabled={mode === 'pvp'}
                  onChange={(e) => onChangeDifficulty(e.target.value as Difficulty)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1d1f27] border border-[#2f323f] text-xs font-medium text-[#ede6d8] disabled:opacity-45 cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Camera Presets */}
              <div className="flex items-center gap-1 bg-[#1b1d24] rounded-lg p-0.5 border border-[#2a2d38]">
                {(
                  [
                    { id: 'classic', label: '3D' },
                    { id: 'cinematic', label: 'Cine' },
                    { id: 'top', label: 'Top' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onSelectCameraPreset(cam.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-[#d4af37] text-[#14151a]'
                        : 'text-[#b5aea1] hover:text-white'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onResetCamera}
                  aria-label="Reset Camera"
                  title="Reset Camera"
                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-[#b5aea1] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span className="hidden md:inline">Reset</span>
                </button>
              </div>

              {/* Drawer Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleTab('moves')}
                  aria-expanded={activeTab === 'moves'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'moves'
                      ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                      : 'bg-[#1d1f27] border-[#2f323f] text-[#dfd8ca] hover:border-[#555249]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Moves</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleTab('themes')}
                  aria-expanded={activeTab === 'themes'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'themes'
                      ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f7e7b4]'
                      : 'bg-[#1d1f27] border-[#2f323f] text-[#dfd8ca] hover:border-[#555249]'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Themes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
