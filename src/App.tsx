import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_FEN,
  applyChessMove,
  computeCapturedSummary,
  evaluateGameOutcome,
  getFenAtPly,
  getLegalMovesForSquare,
  getPlayerProfiles,
  getTurnFromFen,
  isInCheckFromFen,
  isPromotionMove,
  isValidSavedGameState,
} from './chess/engine';
import { StockfishClient } from './chess/stockfishClient';
import type {
  AppScreenState,
  BoardThemeId,
  CameraPresetId,
  Difficulty,
  GameMode,
  LegalMoveOption,
  MoveRecord,
  PieceColor,
  PieceStyleId,
  PromotionPiece,
  SavedGameState,
  TimeControlSeconds,
} from './chess/types';
import { ChessSceneController, type SceneCallbacks } from './scene/ChessSceneController';
import { soundEngine } from './audio/soundEngine';
import { TitleScreen } from './components/TitleScreen';
import { HudOverlay } from './components/HudOverlay';
import { GameOverModal, PauseModal, PromotionModal } from './components/Modals';
import { OfflineIndicator } from './components/PWAInstallUI';

const STORAGE_KEY = 'aurelia_chess_save_v1';

function loadSavedState(): SavedGameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidSavedGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function App() {
  const initialSaved = useMemo(() => loadSavedState(), []);
  const autoStart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [screenState, setScreenState] = useState<AppScreenState>(autoStart ? 'playing' : 'title');
  const [fen, setFen] = useState<string>(initialSaved?.fen ?? INITIAL_FEN);
  const [history, setHistory] = useState<MoveRecord[]>(initialSaved?.history ?? []);
  const [mode, setMode] = useState<GameMode>(initialSaved?.mode ?? 'pvai');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialSaved?.difficulty ?? 'medium');
  const [playerSide, setPlayerSide] = useState<PieceColor>(initialSaved?.playerSide ?? 'w');
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>(initialSaved?.boardTheme ?? 'walnut');
  const [pieceStyle, setPieceStyle] = useState<PieceStyleId>(initialSaved?.pieceStyle ?? 'staunton');
  const [timeControl, setTimeControl] = useState<TimeControlSeconds>(initialSaved?.timeControl ?? 600);
  const [whiteTime, setWhiteTime] = useState<number>(initialSaved?.whiteTimeRemaining ?? 600);
  const [blackTime, setBlackTime] = useState<number>(initialSaved?.blackTimeRemaining ?? 600);
  const [timeoutWinner, setTimeoutWinner] = useState<PieceColor | null>(initialSaved?.timeoutWinner ?? null);

  const [flipped, setFlipped] = useState<boolean>(initialSaved?.flipped ?? false);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('classic');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(initialSaved?.soundEnabled ?? true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(initialSaved?.musicEnabled ?? false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMoveOption[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [animatedMove, setAnimatedMove] = useState<MoveRecord | null>(null);

  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isAiVsAiPaused, setIsAiVsAiPaused] = useState<boolean>(false);

  const [replayPly, setReplayPly] = useState<number | null>(null);
  const [isReplayingAuto, setIsReplayingAuto] = useState<boolean>(false);
  const [inspectingGameOver, setInspectingGameOver] = useState<boolean>(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ChessSceneController | null>(null);
  const stockfishRef = useRef<StockfishClient | null>(null);

  // Derived chess state
  const isReplayMode = replayPly !== null;
  const displayFen = isReplayMode ? getFenAtPly(history, replayPly) : fen;
  const activeTurn = getTurnFromFen(fen);
  const outcome = useMemo(() => evaluateGameOutcome(fen, timeoutWinner), [fen, timeoutWinner]);
  const checkInfo = useMemo(() => isInCheckFromFen(displayFen), [displayFen]);
  const captured = useMemo(
    () => computeCapturedSummary(history, isReplayMode ? replayPly! : history.length),
    [history, isReplayMode, replayPly]
  );
  const profiles = useMemo(() => getPlayerProfiles(mode, difficulty, playerSide), [mode, difficulty, playerSide]);

  const lastMoveForDisplay = useMemo(() => {
    if (isReplayMode) {
      if (replayPly === 0 || history.length === 0) return null;
      const m = history[replayPly - 1];
      return m ? { from: m.from, to: m.to } : null;
    }
    const m = history[history.length - 1];
    return m ? { from: m.from, to: m.to } : null;
  }, [history, isReplayMode, replayPly]);

  const isHumanTurn =
    screenState === 'playing' &&
    !isReplayMode &&
    outcome.status === 'active' &&
    !pendingPromotion &&
    ((mode === 'pvp') || (mode === 'pvai' && activeTurn === playerSide));

  // Sync body dataset state
  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  // Sync audio settings
  useEffect(() => {
    soundEngine.setSfxEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    soundEngine.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      const payload: SavedGameState = {
        version: 1,
        fen,
        history,
        mode,
        difficulty,
        playerSide,
        boardTheme,
        pieceStyle,
        timeControl,
        whiteTimeRemaining: whiteTime,
        blackTimeRemaining: blackTime,
        flipped,
        soundEnabled,
        musicEnabled,
        timeoutWinner,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [
    fen,
    history,
    mode,
    difficulty,
    playerSide,
    boardTheme,
    pieceStyle,
    timeControl,
    whiteTime,
    blackTime,
    flipped,
    soundEnabled,
    musicEnabled,
    timeoutWinner,
  ]);

  // Execute a validated move and trigger audio + outcome transition
  const commitMove = useCallback(
    (from: string, to: string, promotion: PromotionPiece = 'q'): boolean => {
      const record = applyChessMove(fen, from, to, promotion, history.length + 1);
      if (!record) return false;

      soundEngine.unlock();
      setSelectedSquare(null);
      setLegalMoves([]);
      setPendingPromotion(null);
      setReplayPly(null);
      setIsReplayingAuto(false);
      setAnimatedMove(record);
      setFen(record.fenAfter);
      setHistory((prev) => [...prev, record]);

      const nextOutcome = evaluateGameOutcome(record.fenAfter, null);
      if (nextOutcome.status === 'checkmate') {
        soundEngine.playCheckmate(nextOutcome.winner === playerSide || mode === 'pvp');
        setScreenState('gameover');
        setInspectingGameOver(false);
      } else if (nextOutcome.status !== 'active') {
        soundEngine.playCheckmate(false);
        setScreenState('gameover');
        setInspectingGameOver(false);
      } else if (record.isCheck) {
        soundEngine.playCheck();
      } else if (record.captured) {
        soundEngine.playCapture();
      } else {
        soundEngine.playMove(record.isCastling);
      }

      return true;
    },
    [fen, history.length, mode, playerSide]
  );

  // Ref-backed scene interaction callbacks so Three.js canvas never remounts
  const sceneCallbacksRef = useRef<SceneCallbacks>({
    onSelectOrMoveSquare: () => {},
    onBeginDragSquare: () => [],
    onDropMove: () => false,
  });

  sceneCallbacksRef.current = {
    onSelectOrMoveSquare: (square: string) => {
      if (!isHumanTurn) return;
      soundEngine.unlock();

      // If clicking a legal move destination for currently selected piece
      if (selectedSquare && legalMoves.some((m) => m.to === square)) {
        if (isPromotionMove(fen, selectedSquare, square)) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }
        commitMove(selectedSquare, square, 'q');
        return;
      }

      // Clicking same square deselects
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Otherwise check if square has a friendly piece with legal moves
      const moves = getLegalMovesForSquare(fen, square);
      if (moves.length > 0) {
        soundEngine.playSelect();
        setSelectedSquare(square);
        setLegalMoves(moves);
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    onBeginDragSquare: (square: string) => {
      if (!isHumanTurn) return [];
      soundEngine.unlock();
      const moves = getLegalMovesForSquare(fen, square);
      if (moves.length > 0) {
        soundEngine.playSelect();
        setSelectedSquare(square);
        setLegalMoves(moves);
      }
      return moves;
    },
    onDropMove: (from: string, to: string) => {
      if (!isHumanTurn) return false;
      if (isPromotionMove(fen, from, to)) {
        setPendingPromotion({ from, to });
        return true;
      }
      return commitMove(from, to, 'q');
    },
  };

  // Mount Three.js scene and Stockfish client once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const controller = new ChessSceneController(mount, {
      onSelectOrMoveSquare: (sq) => sceneCallbacksRef.current.onSelectOrMoveSquare(sq),
      onBeginDragSquare: (sq) => sceneCallbacksRef.current.onBeginDragSquare(sq),
      onDropMove: (from, to) => sceneCallbacksRef.current.onDropMove(from, to),
    });
    sceneRef.current = controller;

    const sf = new StockfishClient();
    stockfishRef.current = sf;

    return () => {
      sf.dispose();
      stockfishRef.current = null;
      controller.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Push React state snapshots to Three.js controller
  useEffect(() => {
    sceneRef.current?.syncState({
      fen: displayFen,
      selectedSquare: isReplayMode ? null : selectedSquare,
      legalMoves: isReplayMode ? [] : legalMoves,
      lastMove: lastMoveForDisplay,
      checkSquare: checkInfo.kingSquare,
      boardTheme,
      pieceStyle,
      flipped,
      isTitleScreen: screenState === 'title',
      interactive: isHumanTurn,
      activeTurn,
      animatedMove,
    });
  }, [
    displayFen,
    isReplayMode,
    selectedSquare,
    legalMoves,
    lastMoveForDisplay,
    checkInfo.kingSquare,
    boardTheme,
    pieceStyle,
    flipped,
    screenState,
    isHumanTurn,
    activeTurn,
    animatedMove,
  ]);

  // Clock countdown interval
  useEffect(() => {
    if (screenState !== 'playing' || outcome.status !== 'active' || timeControl === 0 || isReplayMode) {
      return;
    }
    if (mode === 'aivai' && isAiVsAiPaused) return;

    const timer = window.setInterval(() => {
      if (activeTurn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setTimeoutWinner('b');
            setScreenState('gameover');
            soundEngine.playCheckmate(false);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setTimeoutWinner('w');
            setScreenState('gameover');
            soundEngine.playCheckmate(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screenState, outcome.status, timeControl, isReplayMode, mode, isAiVsAiPaused, activeTurn]);

  // Stockfish AI turn execution
  useEffect(() => {
    if (screenState !== 'playing' || outcome.status !== 'active' || isReplayMode || pendingPromotion) {
      return;
    }

    const isAiTurn =
      (mode === 'pvai' && activeTurn !== playerSide) ||
      (mode === 'aivai' && !isAiVsAiPaused);

    if (!isAiTurn) {
      setIsAiThinking(false);
      return;
    }

    let cancelled = false;
    setIsAiThinking(true);

    const thinkDelay = window.setTimeout(async () => {
      if (cancelled || !stockfishRef.current) return;
      const suggestion = await stockfishRef.current.findBestMove(fen, difficulty);
      if (cancelled || !suggestion) return;
      setIsAiThinking(false);
      commitMove(suggestion.from, suggestion.to, suggestion.promotion ?? 'q');
    }, mode === 'aivai' ? 420 : 260);

    return () => {
      cancelled = true;
      window.clearTimeout(thinkDelay);
      stockfishRef.current?.cancelSearch();
    };
  }, [
    screenState,
    outcome.status,
    isReplayMode,
    pendingPromotion,
    mode,
    activeTurn,
    playerSide,
    isAiVsAiPaused,
    fen,
    difficulty,
    commitMove,
  ]);

  // Auto-replay playback timer
  useEffect(() => {
    if (!isReplayingAuto || history.length === 0) return;

    const timer = window.setInterval(() => {
      setReplayPly((prev) => {
        const cur = prev ?? 0;
        if (cur >= history.length) {
          setIsReplayingAuto(false);
          return null;
        }
        const next = cur + 1;
        const mv = history[next - 1];
        if (mv) {
          setAnimatedMove(mv);
          if (mv.captured) soundEngine.playCapture();
          else soundEngine.playMove(mv.isCastling);
        }
        if (next >= history.length) {
          setIsReplayingAuto(false);
          return null;
        }
        return next;
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [isReplayingAuto, history]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const startFreshGame = useCallback(
    (overrideMode?: GameMode, overrideSide?: PieceColor, overrideTime?: TimeControlSeconds) => {
      stockfishRef.current?.cancelSearch();
      soundEngine.unlock();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const nextTime = overrideTime ?? timeControl;
      const nextSide = overrideSide ?? playerSide;
      const nextMode = overrideMode ?? mode;

      setFen(INITIAL_FEN);
      setHistory([]);
      setSelectedSquare(null);
      setLegalMoves([]);
      setPendingPromotion(null);
      setAnimatedMove(null);
      setTimeoutWinner(null);
      setReplayPly(null);
      setIsReplayingAuto(false);
      setIsAiThinking(false);
      setIsAiVsAiPaused(false);
      setInspectingGameOver(false);
      setWhiteTime(nextTime);
      setBlackTime(nextTime);
      if (nextMode === 'pvai') {
        setFlipped(nextSide === 'b');
      }
      setScreenState('playing');
    },
    [timeControl, playerSide, mode]
  );

  // Global keyboard shortcuts (Enter/Space on Title, Escape/P for Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screenState === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startFreshGame();
        return;
      }
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (screenState === 'playing') {
          e.preventDefault();
          setScreenState('paused');
        } else if (screenState === 'paused') {
          e.preventDefault();
          setScreenState('playing');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenState, startFreshGame]);

  const handleUndo = () => {
    if (history.length === 0) return;
    stockfishRef.current?.cancelSearch();
    setIsAiThinking(false);
    setSelectedSquare(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    setReplayPly(null);
    setIsReplayingAuto(false);
    setTimeoutWinner(null);
    setAnimatedMove(null);

    const stepsToUndo = mode === 'pvai' && activeTurn === playerSide && history.length >= 2 ? 2 : 1;
    const nextHistory = history.slice(0, history.length - stepsToUndo);
    const nextFen = nextHistory.length > 0 ? nextHistory[nextHistory.length - 1].fenAfter : INITIAL_FEN;
    setHistory(nextHistory);
    setFen(nextFen);
    if (screenState === 'gameover') {
      setScreenState('playing');
    }
  };

  const handleJumpToPly = (targetPly: number | null) => {
    setSelectedSquare(null);
    setLegalMoves([]);
    if (targetPly === null || targetPly >= history.length) {
      setReplayPly(null);
      setAnimatedMove(null);
      return;
    }
    const clamped = Math.max(0, targetPly);
    setAnimatedMove(clamped > 0 ? history[clamped - 1] : null);
    setReplayPly(clamped);
  };

  const handleToggleAutoReplay = () => {
    if (history.length === 0) return;
    if (isReplayingAuto) {
      setIsReplayingAuto(false);
      return;
    }
    if (replayPly === null || replayPly >= history.length) {
      setReplayPly(0);
      setAnimatedMove(null);
    }
    setIsReplayingAuto(true);
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial
    }
  };

  const handleCameraPreset = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    sceneRef.current?.setCameraPreset(preset, flipped, true);
  };

  const handleResetCamera = () => {
    setCameraPreset('classic');
    sceneRef.current?.setCameraPreset('classic', flipped, true);
  };

  const handleResumeSaved = () => {
    soundEngine.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setScreenState(outcome.status === 'active' ? 'playing' : 'gameover');
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#111216]">
      {/* Dedicated Isolated 3D WebGL Viewport Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full" />

      {/* Opening Title Screen */}
      {screenState === 'title' && (
        <TitleScreen
          mode={mode}
          difficulty={difficulty}
          hasSavedMatch={history.length > 0}
          savedMoveCount={history.length}
          onChangeMode={setMode}
          onChangeDifficulty={setDifficulty}
          onStartNewGame={() => startFreshGame()}
          onResumeSavedGame={handleResumeSaved}
        />
      )}

      {/* Active Gameplay & Review HUD */}
      {screenState !== 'title' && (
        <HudOverlay
          whiteProfile={profiles.white}
          blackProfile={profiles.black}
          whiteTime={whiteTime}
          blackTime={blackTime}
          timeControl={timeControl}
          activeTurn={activeTurn}
          outcome={outcome}
          isAiThinking={isAiThinking}
          isAiVsAiPaused={isAiVsAiPaused}
          mode={mode}
          difficulty={difficulty}
          playerSide={playerSide}
          boardTheme={boardTheme}
          pieceStyle={pieceStyle}
          cameraPreset={cameraPreset}
          flipped={flipped}
          soundEnabled={soundEnabled}
          musicEnabled={musicEnabled}
          isFullscreen={isFullscreen}
          history={history}
          captured={captured}
          replayPly={replayPly}
          isReplayingAuto={isReplayingAuto}
          canUndo={history.length > 0 && mode !== 'aivai'}
          onNewGame={() => startFreshGame()}
          onRestart={() => startFreshGame()}
          onUndo={handleUndo}
          onFlipBoard={() => setFlipped((f) => !f)}
          onToggleSound={() => setSoundEnabled((s) => !s)}
          onToggleMusic={() => {
            soundEngine.unlock();
            setMusicEnabled((m) => !m);
          }}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenPause={() => setScreenState('paused')}
          onChangeMode={(nextMode) => {
            setMode(nextMode);
            startFreshGame(nextMode);
          }}
          onChangeDifficulty={setDifficulty}
          onChangePlayerSide={(nextSide) => {
            setPlayerSide(nextSide);
            startFreshGame('pvai', nextSide);
          }}
          onChangeTheme={setBoardTheme}
          onChangePieceStyle={setPieceStyle}
          onChangeTimeControl={(tc) => {
            setTimeControl(tc);
            startFreshGame(mode, playerSide, tc);
          }}
          onSelectCameraPreset={handleCameraPreset}
          onResetCamera={handleResetCamera}
          onToggleAiVsAiPause={() => setIsAiVsAiPaused((p) => !p)}
          onJumpToPly={handleJumpToPly}
          onToggleAutoReplay={handleToggleAutoReplay}
        />
      )}

      {/* Pawn Promotion Picker */}
      {pendingPromotion && (
        <PromotionModal
          color={activeTurn}
          onSelect={(piece) => commitMove(pendingPromotion.from, pendingPromotion.to, piece)}
          onCancel={() => {
            setPendingPromotion(null);
            setSelectedSquare(null);
            setLegalMoves([]);
          }}
        />
      )}

      {/* Pause Modal */}
      {screenState === 'paused' && (
        <PauseModal
          onResume={() => setScreenState('playing')}
          onRestart={() => startFreshGame()}
          onReturnToTitle={() => setScreenState('title')}
        />
      )}

      {/* Game Over Modal */}
      {screenState === 'gameover' && !inspectingGameOver && (
        <GameOverModal
          outcome={outcome}
          totalMoves={history.length}
          whiteName={profiles.white.name}
          blackName={profiles.black.name}
          onPlayAgain={() => startFreshGame()}
          onInspectBoard={() => setInspectingGameOver(true)}
          onReturnToTitle={() => setScreenState('title')}
        />
      )}

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
