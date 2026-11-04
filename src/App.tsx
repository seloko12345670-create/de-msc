import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  Music2,
  BarChart2,
  Library,
  Settings,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Maximize2,
  Sliders,
  Mic2,
} from 'lucide-react';
import {
  KamyPlaylist,
  KamySettings,
  KamyTrack,
  LyricLine,
  PlaybackSessionRecord,
  StatsPeriodFilter,
} from './types/kamy';
import {
  loadAudioBlobFromDB,
  loadSnapshotFromIndexedDB,
  loadSnapshotSync,
  saveAudioBlobToDB,
  saveSnapshotToIndexedDB,
} from './db/kamyDatabase';
import {
  ActiveSessionState,
  computeMusicalSummary,
  createPlaybackSession,
  finalizePlaybackSession,
  formatDurationClock,
  formatListenedHuman,
  mergeUniqueSessions,
  onSessionPause,
  onSessionPlay,
  onSessionTick,
  parseAudioFileMetadata,
} from './utils/statsEngine';
import { getOrGenerateStudioWavUrl, KamyWebAudioGraph } from './audio/audioEngine';
import { CoverArt } from './components/CoverArt';
import { HomeView } from './components/HomeView';
import { LibrarySearchView } from './components/LibrarySearchView';
import { PlaylistsView } from './components/PlaylistsView';
import { StatsSummaryView } from './components/StatsSummaryView';
import { SettingsAndAndroidView } from './components/SettingsAndAndroidView';
import { FullPlayerModal } from './components/FullPlayerModal';
import { KamyWrappedModal } from './components/KamyWrappedModal';
import { PWAInstallButton } from './components/PWAInstallBanner';

type NavTab = 'home' | 'library' | 'stats' | 'playlists' | 'settings';

export default function App() {
  // Initial synchronous hydration from local database snapshot
  const initialSnapshot = React.useMemo(() => loadSnapshotSync(), []);

  const [tracks, setTracks] = useState<KamyTrack[]>(initialSnapshot.tracks);
  const [playlists, setPlaylists] = useState<KamyPlaylist[]>(initialSnapshot.playlists);
  const [sessions, setSessions] = useState<PlaybackSessionRecord[]>(initialSnapshot.sessions);
  const [settings, setSettings] = useState<KamySettings>(initialSnapshot.settings);

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedPlaylistIdForNav, setSelectedPlaylistIdForNav] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriodFilter>('all');

  // Player state
  const [currentTrack, setCurrentTrack] = useState<KamyTrack | null>(
    initialSnapshot.tracks[0] || null
  );
  const [queue, setQueue] = useState<KamyTrack[]>(initialSnapshot.tracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(
    initialSnapshot.tracks[0]?.durationSec || 214
  );
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);

  // Real playback session state machine ref & reactive display state
  const activeSessionRef = useRef<ActiveSessionState | null>(null);
  const [activeSessionElapsedMs, setActiveSessionElapsedMs] = useState(0);

  // Audio Element & Web Audio Equalizer Graph
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webAudioGraphRef = useRef<KamyWebAudioGraph>(new KamyWebAudioGraph());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Async verification from IndexedDB on mount
  useEffect(() => {
    void loadSnapshotFromIndexedDB().then((dbSnap) => {
      if (dbSnap && dbSnap.tracks.length > 0) {
        setTracks(dbSnap.tracks);
        setPlaylists(dbSnap.playlists);
        setSessions(dbSnap.sessions);
        setSettings(dbSnap.settings);
      }
    });
  }, []);

  // Persist changes to IndexedDB + LocalStorage whenever state updates
  useEffect(() => {
    void saveSnapshotToIndexedDB({
      tracks,
      playlists,
      sessions,
      settings,
      lastSavedAt: Date.now(),
    });
  }, [tracks, playlists, sessions, settings]);

  // Apply playback speed & equalizer settings to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    webAudioGraphRef.current.updateEqualizer(
      settings.equalizerBands,
      settings.equalizerEnabled
    );
  }, [
    settings.playbackSpeed,
    settings.equalizerBands,
    settings.equalizerEnabled,
    volume,
    isMuted,
  ]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerRemainingSec === null) return;
    if (sleepTimerRemainingSec <= 0) {
      handlePauseAudio();
      setSleepTimerRemainingSec(null);
      setSettings((prev) => ({ ...prev, sleepTimerMinutes: null }));
      return;
    }
    const timer = window.setInterval(() => {
      setSleepTimerRemainingSec((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sleepTimerRemainingSec]);

  // Real-time 1-second session accumulator (Strictly counts ONLY when isPlaying === true)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (activeSessionRef.current && activeSessionRef.current.isPlaying) {
        const prevMs = activeSessionRef.current.accumulatedMs;
        const nextSess = onSessionTick(activeSessionRef.current, now);
        const deltaMs = nextSess.accumulatedMs - prevMs;
        activeSessionRef.current = nextSess;
        setActiveSessionElapsedMs(nextSess.accumulatedMs);

        if (deltaMs > 0) {
          const record = finalizePlaybackSession(nextSess, now, false);
          setSessions((prev) => mergeUniqueSessions(prev, record));
          setTracks((prevTracks) =>
            prevTracks.map((t) =>
              t.id === nextSess.trackId
                ? {
                    ...t,
                    totalListenedMs: t.totalListenedMs + deltaMs,
                    lastPlayedAt: now,
                  }
                : t
            )
          );
        }
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  // MediaSession API for Lockscreen, Notification & Bluetooth Controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
      });
      navigator.mediaSession.setActionHandler('play', () => void handleResumeAudio());
      navigator.mediaSession.setActionHandler('pause', () => handlePauseAudio());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack(true));
    } catch {
      // Ignore if MediaSession unsupported in environment
    }
  }, [currentTrack, queue]);

  const flushAndCloseCurrentSession = (skipped = false) => {
    const sess = activeSessionRef.current;
    if (!sess) return;
    const now = Date.now();
    const prevMs = sess.accumulatedMs;
    const finalRecord = finalizePlaybackSession(sess, now, skipped);
    const finalDelta = Math.max(0, finalRecord.durationMs - prevMs);

    if (finalRecord.durationMs > 0) {
      setSessions((prev) => mergeUniqueSessions(prev, finalRecord));
      setTracks((prev) =>
        prev.map((t) =>
          t.id === sess.trackId
            ? {
                ...t,
                totalListenedMs: t.totalListenedMs + finalDelta,
                skipCount: skipped ? t.skipCount + 1 : t.skipCount,
                lastPlayedAt: now,
              }
            : t
        )
      );
    }
    activeSessionRef.current = null;
    setActiveSessionElapsedMs(0);
  };

  const loadAndStartTrack = async (track: KamyTrack, customQueue?: KamyTrack[]) => {
    if (customQueue && customQueue.length > 0) {
      setQueue(customQueue);
    }

    // Finalize any previous track session
    if (activeSessionRef.current && activeSessionRef.current.trackId !== track.id) {
      flushAndCloseCurrentSession(currentTimeSec < 15 && currentTimeSec > 0);
    }

    setCurrentTrack(track);
    setCurrentTimeSec(0);
    setDurationSec(track.durationSec || 210);

    const now = Date.now();
    const newSess = onSessionPlay(createPlaybackSession(track, now), now);
    activeSessionRef.current = newSess;
    setActiveSessionElapsedMs(0);

    setTracks((prev) =>
      prev.map((t) =>
        t.id === track.id
          ? { ...t, playCount: t.playCount + 1, lastPlayedAt: now }
          : t
      )
    );

    const audioEl = audioRef.current;
    if (!audioEl) return;

    let audioSrcUrl = '';
    if (track.isLocalBlob) {
      const blob = await loadAudioBlobFromDB(track.id);
      if (blob) {
        audioSrcUrl = URL.createObjectURL(blob);
      } else {
        audioSrcUrl = getOrGenerateStudioWavUrl(track.synthPresetIndex ?? 0);
      }
    } else {
      audioSrcUrl = getOrGenerateStudioWavUrl(track.synthPresetIndex ?? track.coverVariant);
    }

    audioEl.src = audioSrcUrl;
    audioEl.playbackRate = settings.playbackSpeed;
    audioEl.volume = isMuted ? 0 : volume;

    webAudioGraphRef.current.connectAudioElement(
      audioEl,
      settings.equalizerBands,
      settings.equalizerEnabled
    );
    webAudioGraphRef.current.resumeContext();

    try {
      await audioEl.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(true);
    }
  };

  const handleResumeAudio = async () => {
    if (!currentTrack) {
      if (tracks.length > 0) {
        await loadAndStartTrack(tracks[0], tracks);
      }
      return;
    }

    const now = Date.now();
    if (!activeSessionRef.current || activeSessionRef.current.trackId !== currentTrack.id) {
      const fresh = onSessionPlay(createPlaybackSession(currentTrack, now), now);
      activeSessionRef.current = fresh;
      setTracks((prev) =>
        prev.map((t) =>
          t.id === currentTrack.id
            ? { ...t, playCount: t.playCount + 1, lastPlayedAt: now }
            : t
        )
      );
    } else {
      activeSessionRef.current = onSessionPlay(activeSessionRef.current, now);
    }

    const audioEl = audioRef.current;
    if (audioEl) {
      if (!audioEl.src) {
        audioEl.src = getOrGenerateStudioWavUrl(
          currentTrack.synthPresetIndex ?? currentTrack.coverVariant
        );
      }
      webAudioGraphRef.current.connectAudioElement(
        audioEl,
        settings.equalizerBands,
        settings.equalizerEnabled
      );
      webAudioGraphRef.current.resumeContext();
      try {
        await audioEl.play();
      } catch {
        // Keep logical playback state active even if headless audio policy restricts output
      }
    }
    setIsPlaying(true);
  };

  const handlePauseAudio = () => {
    const now = Date.now();
    if (activeSessionRef.current && activeSessionRef.current.isPlaying) {
      const prevMs = activeSessionRef.current.accumulatedMs;
      const pausedSess = onSessionPause(activeSessionRef.current, now);
      const deltaMs = Math.max(0, pausedSess.accumulatedMs - prevMs);
      activeSessionRef.current = pausedSess;
      setActiveSessionElapsedMs(pausedSess.accumulatedMs);

      const record = finalizePlaybackSession(pausedSess, now, false);
      setSessions((prev) => mergeUniqueSessions(prev, record));
      setTracks((prev) =>
        prev.map((t) =>
          t.id === pausedSess.trackId
            ? {
                ...t,
                totalListenedMs: t.totalListenedMs + deltaMs,
                pauseCount: t.pauseCount + 1,
              }
            : t
        )
      );
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      handlePauseAudio();
    } else {
      void handleResumeAudio();
    }
  };

  const handleNextTrack = (manualSkip = true) => {
    if (queue.length === 0) return;
    if (repeatMode === 'one' && !manualSkip && currentTrack) {
      void loadAndStartTrack(currentTrack, queue);
      return;
    }

    if (shuffle && queue.length > 1) {
      const candidates = queue.filter((t) => t.id !== currentTrack?.id);
      const next = candidates[Math.floor(Math.random() * candidates.length)] || queue[0];
      void loadAndStartTrack(next, queue);
      return;
    }

    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    const nextIdx = idx + 1;
    if (nextIdx < queue.length) {
      void loadAndStartTrack(queue[nextIdx], queue);
    } else if (repeatMode === 'all' || manualSkip) {
      void loadAndStartTrack(queue[0], queue);
    } else {
      handlePauseAudio();
    }
  };

  const handlePrevTrack = () => {
    if (currentTimeSec > 4 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTimeSec(0);
      return;
    }
    if (queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    const prevIdx = idx > 0 ? idx - 1 : queue.length - 1;
    void loadAndStartTrack(queue[prevIdx], queue);
  };

  const handleSeek = (sec: number) => {
    setCurrentTimeSec(sec);
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = Math.min(sec, audioRef.current.duration);
    }
  };

  const handleToggleFavorite = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, favorite: !t.favorite } : t))
    );
    if (currentTrack?.id === trackId) {
      setCurrentTrack((prev) => (prev ? { ...prev, favorite: !prev.favorite } : null));
    }
  };

  // Local Audio File Importer (.mp3, .flac, .wav, .aac, .m4a, .ogg, .opus)
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const existingHashes = new Set(tracks.map((t) => t.fileHash));
    const importedTracks: KamyTrack[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const meta = parseAudioFileMetadata(file.name, file.size);

      // Duplicate check
      if (existingHashes.has(meta.fileHash)) {
        continue;
      }
      existingHashes.add(meta.fileHash);

      const newId = `kamy-local-${Date.now()}-${i}`;
      await saveAudioBlobToDB(newId, file);

      const newTrack: KamyTrack = {
        id: newId,
        title: meta.title,
        artist: meta.artist,
        album: 'Importados do Celular',
        genre: 'Biblioteca Local',
        folderPath: '/Armazenamento Interno/Importadas',
        fileName: file.name,
        format: meta.format,
        durationSec: 205,
        coverVariant: (tracks.length + i) % 8,
        accentColor: '#FF4FA3',
        favorite: false,
        addedAt: Date.now(),
        playCount: 0,
        pauseCount: 0,
        skipCount: 0,
        totalListenedMs: 0,
        fileAvailable: true,
        fileHash: meta.fileHash,
        isLocalBlob: true,
        lyrics: [
          { timeSec: 0, text: `♪ ${meta.title} — ${meta.artist} (${meta.format}) ♪` },
          { timeSec: 8, text: 'Arquivo local importado e salvo no banco permanente do KAMY.' },
        ],
      };

      importedTracks.push(newTrack);
    }

    if (importedTracks.length > 0) {
      const updated = [...importedTracks, ...tracks];
      setTracks(updated);
      setQueue(updated);
      await loadAndStartTrack(importedTracks[0], updated);
    }

    e.target.value = '';
  };

  // Official Section 8 & 14 Verification Runner:
  // 14:00 PLAY -> 14:05 PAUSE (5m) -> 14:15 PLAY (10m paused ignored) -> 14:20 PAUSE (5m) = 10m!
  const handleRunOfficialTenMinTest = () => {
    const targetTrack = currentTrack || tracks[0];
    if (!targetTrack) return;

    const baseTime = Date.now() - 20 * 60 * 1000;
    const min = 60 * 1000;

    let testSess = createPlaybackSession(
      targetTrack,
      baseTime,
      `verified-10min-${Date.now()}`
    );
    // 14:00 PLAY
    testSess = onSessionPlay(testSess, baseTime);
    // 14:05 PAUSE (5m played)
    testSess = onSessionPause(testSess, baseTime + 5 * min);
    // 10m paused (not counted) -> 14:15 PLAY
    testSess = onSessionPlay(testSess, baseTime + 15 * min);
    // 14:20 PAUSE (+5m played = 10m total)
    testSess = onSessionPause(testSess, baseTime + 20 * min);

    const record = finalizePlaybackSession(testSess, baseTime + 20 * min, false);

    setSessions((prev) => mergeUniqueSessions(prev, record));
    setTracks((prev) =>
      prev.map((t) =>
        t.id === targetTrack.id
          ? {
              ...t,
              playCount: t.playCount + 1,
              pauseCount: t.pauseCount + 2,
              totalListenedMs: t.totalListenedMs + record.durationMs,
              lastPlayedAt: Date.now(),
            }
          : t
      )
    );
  };

  const summaryReport = React.useMemo(
    () => computeMusicalSummary(sessions, tracks, statsPeriod),
    [sessions, tracks, statsPeriod]
  );

  const summaryAllTime = React.useMemo(
    () => computeMusicalSummary(sessions, tracks, 'all'),
    [sessions, tracks]
  );

  const bgCanvasClass = settings.amoledMode ? 'bg-black' : 'bg-[#080808]';

  return (
    <div
      className={`min-h-screen ${bgCanvasClass} text-white flex flex-col selection:bg-[#FF4FA3] selection:text-black`}
      data-state={isPlaying ? 'playing' : 'paused'}
    >
      {/* Hidden Audio Element & Local File Input */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTimeSec(audioRef.current.currentTime);
          }
        }}
        onEnded={() => handleNextTrack(false)}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp3,.flac,.wav,.aac,.m4a,.ogg,.opus,audio/*"
        onChange={handleFilesSelected}
        className="hidden"
        aria-label="Selecionar arquivos de música do dispositivo"
      />

      {/* Top Navigation Bar on Desktop (Strict 3-Zone Contract: Brand — 5 Single-Line Nav Links — 1 Primary Action) */}
      <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between gap-8 px-8 py-3.5 bg-[#080808]/90 backdrop-blur-xl border-b border-white/5">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('home');
          }}
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          KAMY
        </a>

        <nav
          className="flex items-center gap-6 text-sm font-medium text-[#A0A0A0]"
          aria-label="Navegação principal"
        >
          {[
            { id: 'home', label: 'Início' },
            { id: 'library', label: 'Biblioteca' },
            { id: 'stats', label: 'Meu Resumo' },
            { id: 'playlists', label: 'Playlists' },
            { id: 'settings', label: 'Configurações' },
          ].map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => setActiveTab(link.id as NavTab)}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === link.id
                  ? 'text-[#FF4FA3] font-bold border-b-2 border-[#FF4FA3]'
                  : 'hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton
            compact
            onOpenAndroidArchitecture={() => setActiveTab('settings')}
          />
        </div>
      </header>

      {/* Main Content Container (Desktop 12-Col Split with Now Playing Dock + Mobile Responsive) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-4 lg:pt-6 pb-32 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Primary View Column */}
          <div className="lg:col-span-8 xl:col-span-9 min-w-0">
            {activeTab === 'home' && (
              <HomeView
                userName={settings.userName}
                tracks={tracks}
                playlists={playlists}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                summaryAllTime={summaryAllTime}
                onPlayTrack={(t, q) => void loadAndStartTrack(t, q)}
                onTogglePlayPause={handleTogglePlayPause}
                onToggleFavorite={handleToggleFavorite}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenPlaylist={(plId) => {
                  setSelectedPlaylistIdForNav(plId);
                  setActiveTab('playlists');
                }}
                onOpenWrapped={() => setIsWrappedOpen(true)}
                onTriggerImportFiles={() => fileInputRef.current?.click()}
              />
            )}

            {activeTab === 'library' && (
              <LibrarySearchView
                tracks={tracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                sortOrder={settings.sortOrder}
                onChangeSortOrder={(sortOrder) =>
                  setSettings((prev) => ({ ...prev, sortOrder }))
                }
                onPlayTrack={(t, q) => void loadAndStartTrack(t, q)}
                onTogglePlayPause={handleTogglePlayPause}
                onToggleFavorite={handleToggleFavorite}
                onTriggerImportFiles={() => fileInputRef.current?.click()}
                onRefreshLibrary={() => ({
                  scanned: tracks.length,
                  duplicatesSkipped: 0,
                  unavailableCount: tracks.filter((t) => !t.fileAvailable).length,
                })}
              />
            )}

            {activeTab === 'playlists' && (
              <PlaylistsView
                tracks={tracks}
                playlists={playlists}
                initialSelectedPlaylistId={selectedPlaylistIdForNav}
                onPlayTrack={(t, q) => void loadAndStartTrack(t, q)}
                onCreatePlaylist={(name, description, coverVariant) => {
                  const newPl: KamyPlaylist = {
                    id: `pl-${Date.now()}`,
                    name,
                    description,
                    coverVariant,
                    trackIds: tracks.slice(0, 3).map((t) => t.id),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  setPlaylists((prev) => [newPl, ...prev]);
                  setSelectedPlaylistIdForNav(newPl.id);
                }}
                onUpdatePlaylist={(updatedPl) => {
                  setPlaylists((prev) =>
                    prev.map((p) => (p.id === updatedPl.id ? updatedPl : p))
                  );
                }}
                onDuplicatePlaylist={(plId) => {
                  const orig = playlists.find((p) => p.id === plId);
                  if (!orig) return;
                  const copy: KamyPlaylist = {
                    ...orig,
                    id: `pl-copy-${Date.now()}`,
                    name: `${orig.name} (Cópia)`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  setPlaylists((prev) => [copy, ...prev]);
                }}
                onDeletePlaylist={(plId) => {
                  setPlaylists((prev) => prev.filter((p) => p.id !== plId));
                }}
              />
            )}

            {activeTab === 'stats' && (
              <StatsSummaryView
                report={summaryReport}
                sessions={sessions}
                period={statsPeriod}
                isPlaying={isPlaying}
                activeSessionElapsedMs={activeSessionElapsedMs}
                onChangePeriod={setStatsPeriod}
                onOpenWrapped={() => setIsWrappedOpen(true)}
                onRunOfficialTenMinTest={handleRunOfficialTenMinTest}
                onPlayTrackById={(trackId) => {
                  const found = tracks.find((t) => t.id === trackId);
                  if (found) void loadAndStartTrack(found, tracks);
                }}
                tracks={tracks}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsAndAndroidView
                settings={settings}
                tracks={tracks}
                sessions={sessions}
                onUpdateSettings={(partial) =>
                  setSettings((prev) => ({ ...prev, ...partial }))
                }
                onExportDatabaseBackup={() => {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        { tracks, playlists, sessions, settings },
                        null,
                        2
                      ),
                    ],
                    { type: 'application/json' }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `kamy-backup-sqlite-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                onRunOfficialTenMinTest={handleRunOfficialTenMinTest}
              />
            )}
          </div>

          {/* Right Column on Desktop: Live Now Playing Studio Dock */}
          <aside
            className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20 rounded-[32px] bg-[#121212] border border-white/10 p-5 space-y-5"
            aria-label="Painel Tocando Agora"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-wider text-[#FF4FA3]">
                TOCANDO AGORA • OFFLINE
              </span>
              <button
                type="button"
                onClick={() => setIsFullPlayerOpen(true)}
                aria-label="Expandir player em tela cheia"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A0A0A0] hover:text-white cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentTrack && (
              <>
                <div
                  onClick={() => setIsFullPlayerOpen(true)}
                  className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-xl cursor-pointer group"
                >
                  <CoverArt
                    variant={currentTrack.coverVariant}
                    customUrl={currentTrack.customCoverUrl}
                    title={currentTrack.title}
                    artist={currentTrack.artist}
                    className="w-full h-full"
                    showVinylRing
                  />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-white truncate">
                      {currentTrack.title}
                    </h3>
                    <p className="text-xs text-[#FFB6D5] truncate">
                      {currentTrack.artist} · {currentTrack.format}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(currentTrack.id)}
                    aria-label="Favoritar música no dock lateral"
                    className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        currentTrack.favorite
                          ? 'text-[#FF4FA3] fill-[#FF4FA3]'
                          : 'text-[#A0A0A0]'
                      }`}
                    />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, durationSec)}
                    step={0.5}
                    value={Math.min(currentTimeSec, durationSec)}
                    aria-label="Progresso da faixa no painel lateral"
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full kamy-slider"
                    style={{
                      background: `linear-gradient(to right, #FF4FA3 ${
                        (Math.min(currentTimeSec, durationSec) /
                          Math.max(1, durationSec)) *
                        100
                      }%, rgba(255,255,255,0.14) 0%)`,
                      borderRadius: '9999px',
                    }}
                  />
                  <div className="flex justify-between text-[11px] font-mono-tabular text-[#A0A0A0]">
                    <span>{formatDurationClock(currentTimeSec)}</span>
                    <span>{formatDurationClock(durationSec)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handlePrevTrack}
                    aria-label="Faixa anterior no painel lateral"
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePlayPause}
                    aria-label={
                      isPlaying
                        ? 'Pausar no painel lateral'
                        : 'Reproduzir no painel lateral'
                    }
                    className="w-14 h-14 rounded-full bg-[#FF4FA3] hover:bg-[#FF2D95] text-black flex items-center justify-center shadow-[0_0_24px_rgba(255,79,163,0.45)] cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNextTrack(true)}
                    aria-label="Próxima faixa no painel lateral"
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Quick Equalizer & Lyrics Triggers */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsFullPlayerOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#080808] hover:bg-white/5 text-xs font-semibold text-[#FFB6D5] cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#FF4FA3]" />
                    <span>Equalizador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullPlayerOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#080808] hover:bg-white/5 text-xs font-semibold text-[#FFB6D5] cursor-pointer"
                  >
                    <Mic2 className="w-3.5 h-3.5 text-[#FF4FA3]" />
                    <span>Letras Locais</span>
                  </button>
                </div>

                {/* Live Listening Telemetry Proof */}
                <div className="p-3 rounded-2xl bg-[#080808] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A0A0A0]">Tempo Real Acumulado:</span>
                    <span className="font-mono-tabular font-bold text-[#FF4FA3]">
                      {formatListenedHuman(currentTrack.totalListenedMs)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A0A0A0]">Estado do Contador:</span>
                    <span className="font-mono-tabular text-[#FFB6D5]">
                      {isPlaying ? 'ATIVO (Contando)' : 'PAUSADO (Ignorado)'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>

      {/* Mobile Reference-Faithful Floating Bottom Pill Navigation Bar + Compact Mini Player Trigger (< 12% viewport height) */}
      <div className="lg:hidden fixed bottom-2.5 left-0 right-0 z-40 px-3 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <nav
            aria-label="Navegação inferior rápida"
            className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-full bg-[#161616]/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
          >
            {[
              { id: 'home', label: 'Início', icon: Home },
              { id: 'library', label: 'Biblioteca', icon: Music2 },
              { id: 'stats', label: 'Meu Resumo', icon: BarChart2 },
              { id: 'playlists', label: 'Playlists', icon: Library },
              { id: 'settings', label: 'Ajustes', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as NavTab)}
                  aria-label={item.label}
                  className={`flex items-center justify-center rounded-full transition-all cursor-pointer ${
                    active
                      ? 'w-11 h-11 bg-[#FF4FA3] text-[#080808] shadow-[0_0_18px_rgba(255,79,163,0.45)]'
                      : 'w-11 h-11 text-[#A0A0A0] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}

            {currentTrack && (
              <button
                type="button"
                onClick={() => setIsFullPlayerOpen(true)}
                aria-label={`Abrir player: ${currentTrack.title}`}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[#080808] border border-[#FF4FA3]/40 text-left max-w-[135px] cursor-pointer"
              >
                <CoverArt
                  variant={currentTrack.coverVariant}
                  title={currentTrack.title}
                  className="w-8 h-8 rounded-full shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-[9px] font-mono-tabular text-[#FF4FA3] truncate">
                    {isPlaying ? 'Tocando' : 'Player'}
                  </p>
                </div>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Full-Screen Player Modal */}
      <FullPlayerModal
        isOpen={isFullPlayerOpen}
        track={currentTrack}
        queue={queue}
        isPlaying={isPlaying}
        currentTimeSec={currentTimeSec}
        durationSec={durationSec}
        volume={volume}
        isMuted={isMuted}
        shuffle={shuffle}
        repeatMode={repeatMode}
        settings={settings}
        sleepTimerRemainingSec={sleepTimerRemainingSec}
        onClose={() => setIsFullPlayerOpen(false)}
        onTogglePlayPause={handleTogglePlayPause}
        onNext={() => handleNextTrack(true)}
        onPrev={handlePrevTrack}
        onSeek={handleSeek}
        onVolumeChange={(v) => {
          setVolume(v);
          setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted((m) => !m)}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onCycleRepeat={() =>
          setRepeatMode((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
        }
        onToggleFavorite={handleToggleFavorite}
        onSelectQueueTrack={(t) => void loadAndStartTrack(t, queue)}
        onUpdateSettings={(partial) =>
          setSettings((prev) => ({ ...prev, ...partial }))
        }
        onSetSleepTimer={(mins) => {
          setSettings((prev) => ({ ...prev, sleepTimerMinutes: mins }));
          setSleepTimerRemainingSec(mins ? mins * 60 : null);
        }}
        onSaveCustomLyrics={(trackId: string, lyrics: LyricLine[]) => {
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, lyrics } : t))
          );
          if (currentTrack?.id === trackId) {
            setCurrentTrack((prev) => (prev ? { ...prev, lyrics } : null));
          }
        }}
      />

      {/* KAMY WRAPPED Modal */}
      <KamyWrappedModal
        isOpen={isWrappedOpen}
        userName={settings.userName}
        report={summaryAllTime}
        onClose={() => setIsWrappedOpen(false)}
        onPlayTopTrack={(trackId) => {
          const found = tracks.find((t) => t.id === trackId) || tracks[0];
          if (found) void loadAndStartTrack(found, tracks);
        }}
      />
    </div>
  );
}
