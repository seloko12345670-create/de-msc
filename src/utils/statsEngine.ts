import {
  AudioFormat,
  ChartDataPoint,
  KamyTrack,
  MusicalSummaryReport,
  PlaybackEventLog,
  PlaybackSessionRecord,
  RankedItem,
  StatsPeriodFilter,
} from '../types/kamy';

/**
 * Active Playback Session State Machine
 * Strictly counts ONLY milliseconds when audio is actively playing.
 * Paused, buffering, or idle navigation intervals are never counted.
 */
export interface ActiveSessionState {
  sessionId: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  album: string;
  genre: string;
  startedAt: number;
  isPlaying: boolean;
  lastPlayTimestamp: number | null;
  accumulatedMs: number;
  playCount: number;
  pauseCount: number;
  skipped: boolean;
  events: PlaybackEventLog[];
}

export function formatClockLabel(timestampMs: number): string {
  const d = new Date(timestampMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatDateKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function createPlaybackSession(
  track: Pick<KamyTrack, 'id' | 'title' | 'artist' | 'album' | 'genre'>,
  nowMs: number,
  customSessionId?: string
): ActiveSessionState {
  const sessionId =
    customSessionId || `kamy-sess-${nowMs}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    sessionId,
    trackId: track.id,
    trackTitle: track.title,
    artist: track.artist,
    album: track.album,
    genre: track.genre,
    startedAt: nowMs,
    isPlaying: false,
    lastPlayTimestamp: null,
    accumulatedMs: 0,
    playCount: 0,
    pauseCount: 0,
    skipped: false,
    events: [],
  };
}

export function onSessionPlay(
  session: ActiveSessionState,
  nowMs: number
): ActiveSessionState {
  if (session.isPlaying) {
    return session;
  }
  return {
    ...session,
    isPlaying: true,
    lastPlayTimestamp: nowMs,
    playCount: session.playCount === 0 ? 1 : session.playCount,
    events: [
      ...session.events,
      {
        type: 'PLAY',
        timestamp: nowMs,
        labelTime: formatClockLabel(nowMs),
      },
    ],
  };
}

export function onSessionTick(
  session: ActiveSessionState,
  nowMs: number
): ActiveSessionState {
  if (!session.isPlaying || session.lastPlayTimestamp === null) {
    return session;
  }
  const delta = Math.max(0, nowMs - session.lastPlayTimestamp);
  return {
    ...session,
    accumulatedMs: session.accumulatedMs + delta,
    lastPlayTimestamp: nowMs,
  };
}

export function onSessionPause(
  session: ActiveSessionState,
  nowMs: number
): ActiveSessionState {
  if (!session.isPlaying || session.lastPlayTimestamp === null) {
    return session;
  }
  const delta = Math.max(0, nowMs - session.lastPlayTimestamp);
  return {
    ...session,
    isPlaying: false,
    lastPlayTimestamp: null,
    accumulatedMs: session.accumulatedMs + delta,
    pauseCount: session.pauseCount + 1,
    events: [
      ...session.events,
      {
        type: 'PAUSE',
        timestamp: nowMs,
        labelTime: formatClockLabel(nowMs),
      },
    ],
  };
}

export function finalizePlaybackSession(
  session: ActiveSessionState,
  nowMs: number,
  skipped = false
): PlaybackSessionRecord {
  const settled = session.isPlaying ? onSessionTick(session, nowMs) : session;
  const finalEvent: PlaybackEventLog = {
    type: skipped ? 'SKIP' : 'COMPLETED',
    timestamp: nowMs,
    labelTime: formatClockLabel(nowMs),
  };
  return {
    sessionId: settled.sessionId,
    trackId: settled.trackId,
    trackTitle: settled.trackTitle,
    artist: settled.artist,
    album: settled.album,
    genre: settled.genre,
    startedAt: settled.startedAt,
    endedAt: nowMs,
    dateKey: formatDateKey(settled.startedAt),
    durationMs: settled.accumulatedMs,
    playCount: Math.max(1, settled.playCount),
    pauseCount: settled.pauseCount,
    skipped,
    events: [...settled.events, finalEvent],
  };
}

/**
 * Deduplicate session list by unique sessionId
 */
export function mergeUniqueSessions(
  existing: PlaybackSessionRecord[],
  incoming: PlaybackSessionRecord
): PlaybackSessionRecord[] {
  const idx = existing.findIndex((s) => s.sessionId === incoming.sessionId);
  if (idx >= 0) {
    const copy = [...existing];
    copy[idx] = incoming;
    return copy;
  }
  return [incoming, ...existing];
}

/**
 * Filter sessions by time window
 */
export function filterSessionsByPeriod(
  sessions: PlaybackSessionRecord[],
  period: StatsPeriodFilter,
  referenceNowMs: number = Date.now()
): PlaybackSessionRecord[] {
  if (period === 'all') return sessions;

  const refDate = new Date(referenceNowMs);
  let cutoffMs = 0;

  if (period === 'today') {
    const startOfToday = new Date(
      refDate.getFullYear(),
      refDate.getMonth(),
      refDate.getDate(),
      0,
      0,
      0,
      0
    );
    cutoffMs = startOfToday.getTime();
  } else if (period === '7d') {
    cutoffMs = referenceNowMs - 7 * 24 * 60 * 60 * 1000;
  } else if (period === '30d') {
    cutoffMs = referenceNowMs - 30 * 24 * 60 * 60 * 1000;
  } else if (period === '12m') {
    cutoffMs = referenceNowMs - 365 * 24 * 60 * 60 * 1000;
  }

  return sessions.filter((s) => s.startedAt >= cutoffMs && s.durationMs > 0);
}

/**
 * Compute full musical summary from real playback session records
 */
export function computeMusicalSummary(
  sessions: PlaybackSessionRecord[],
  tracks: KamyTrack[],
  period: StatsPeriodFilter,
  referenceNowMs: number = Date.now()
): MusicalSummaryReport {
  const filtered = filterSessionsByPeriod(sessions, period, referenceNowMs);
  const trackMap = new Map<string, KamyTrack>();
  for (const t of tracks) {
    trackMap.set(t.id, t);
  }

  let totalListenedMs = 0;
  let totalPlays = 0;
  let totalPauses = 0;
  let totalSkips = 0;

  const byTrack = new Map<string, RankedItem>();
  const byArtist = new Map<string, RankedItem>();
  const byAlbum = new Map<string, RankedItem>();
  const byGenre = new Map<string, RankedItem>();

  for (const sess of filtered) {
    if (sess.durationMs <= 0) continue;
    totalListenedMs += sess.durationMs;
    totalPlays += sess.playCount;
    totalPauses += sess.pauseCount;
    if (sess.skipped) totalSkips += 1;

    const matchedTrack = trackMap.get(sess.trackId);
    const coverVariant = matchedTrack?.coverVariant ?? 0;

    // Track aggregation
    const prevTrack = byTrack.get(sess.trackId) || {
      name: sess.trackTitle,
      subtitle: sess.artist,
      listenedMs: 0,
      playCount: 0,
      coverVariant,
      trackId: sess.trackId,
    };
    prevTrack.listenedMs += sess.durationMs;
    prevTrack.playCount += sess.playCount;
    byTrack.set(sess.trackId, prevTrack);

    // Artist aggregation
    const prevArtist = byArtist.get(sess.artist) || {
      name: sess.artist,
      subtitle: sess.genre,
      listenedMs: 0,
      playCount: 0,
      coverVariant,
    };
    prevArtist.listenedMs += sess.durationMs;
    prevArtist.playCount += sess.playCount;
    byArtist.set(sess.artist, prevArtist);

    // Album aggregation
    const prevAlbum = byAlbum.get(sess.album) || {
      name: sess.album,
      subtitle: sess.artist,
      listenedMs: 0,
      playCount: 0,
      coverVariant,
    };
    prevAlbum.listenedMs += sess.durationMs;
    prevAlbum.playCount += sess.playCount;
    byAlbum.set(sess.album, prevAlbum);

    // Genre aggregation
    const prevGenre = byGenre.get(sess.genre) || {
      name: sess.genre,
      subtitle: 'Gênero Musical',
      listenedMs: 0,
      playCount: 0,
      coverVariant,
    };
    prevGenre.listenedMs += sess.durationMs;
    prevGenre.playCount += sess.playCount;
    byGenre.set(sess.genre, prevGenre);
  }

  const sortRanked = (items: Iterable<RankedItem>): RankedItem[] =>
    Array.from(items).sort((a, b) => b.listenedMs - a.listenedMs || b.playCount - a.playCount);

  const top10Tracks = sortRanked(byTrack.values()).slice(0, 10);
  const top10Artists = sortRanked(byArtist.values()).slice(0, 10);
  const top10Albums = sortRanked(byAlbum.values()).slice(0, 10);
  const top10Genres = sortRanked(byGenre.values()).slice(0, 10);

  // Daily chart (Last 7 days)
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dailyChart: ChartDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceNowMs - i * 24 * 60 * 60 * 1000);
    const key = formatDateKey(d.getTime());
    const daySessions = sessions.filter((s) => s.dateKey === key);
    const ms = daySessions.reduce((acc, s) => acc + s.durationMs, 0);
    dailyChart.push({
      label: `${dayNames[d.getDay()]} ${d.getDate()}`,
      minutes: Math.round(ms / 60000),
      hours: Number((ms / 3600000).toFixed(1)),
      sessionsCount: daySessions.length,
    });
  }

  // Weekly chart (Last 4 weeks)
  const weeklyChart: ChartDataPoint[] = [];
  for (let w = 3; w >= 0; w--) {
    const startW = referenceNowMs - (w + 1) * 7 * 24 * 60 * 60 * 1000;
    const endW = referenceNowMs - w * 7 * 24 * 60 * 60 * 1000;
    const wSessions = sessions.filter((s) => s.startedAt >= startW && s.startedAt <= endW);
    const ms = wSessions.reduce((acc, s) => acc + s.durationMs, 0);
    weeklyChart.push({
      label: w === 0 ? 'Esta Sem.' : `Sem. -${w}`,
      minutes: Math.round(ms / 60000),
      hours: Number((ms / 3600000).toFixed(1)),
      sessionsCount: wSessions.length,
    });
  }

  // Monthly chart (Last 6 months)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyChart: ChartDataPoint[] = [];
  const refD = new Date(referenceNowMs);
  for (let m = 5; m >= 0; m--) {
    const targetDate = new Date(refD.getFullYear(), refD.getMonth() - m, 1);
    const yr = targetDate.getFullYear();
    const mo = targetDate.getMonth();
    const mSessions = sessions.filter((s) => {
      const sd = new Date(s.startedAt);
      return sd.getFullYear() === yr && sd.getMonth() === mo;
    });
    const ms = mSessions.reduce((acc, s) => acc + s.durationMs, 0);
    monthlyChart.push({
      label: monthNames[mo],
      minutes: Math.round(ms / 60000),
      hours: Number((ms / 3600000).toFixed(1)),
      sessionsCount: mSessions.length,
    });
  }

  const totalSeconds = Math.floor(totalListenedMs / 1000);
  const totalMinutes = Math.floor(totalListenedMs / 60000);
  const totalHours = Number((totalListenedMs / 3600000).toFixed(1));

  return {
    period,
    totalListenedMs,
    totalHours,
    totalMinutes,
    totalSeconds,
    totalPlays,
    totalPauses,
    totalSkips,
    uniqueTracksCount: byTrack.size,
    topTrack: top10Tracks[0] || null,
    topArtist: top10Artists[0] || null,
    topAlbum: top10Albums[0] || null,
    topGenre: top10Genres[0] || null,
    top10Tracks,
    top10Artists,
    top10Albums,
    top10Genres,
    dailyChart,
    weeklyChart,
    monthlyChart,
  };
}

/**
 * Automatic Playlists Computation
 */
export function computeAutoPlaylists(tracks: KamyTrack[]) {
  const available = tracks.filter((t) => t.fileAvailable);

  const mostPlayed = [...available]
    .filter((t) => t.playCount > 0 || t.totalListenedMs > 0)
    .sort((a, b) => b.totalListenedMs - a.totalListenedMs || b.playCount - a.playCount)
    .slice(0, 15);

  const recentlyPlayed = [...available]
    .filter((t) => Boolean(t.lastPlayedAt))
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 15);

  const favorites = available.filter((t) => t.favorite);

  const neverPlayed = available.filter((t) => t.playCount === 0 && t.totalListenedMs === 0);

  const recentlyAdded = [...available]
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, 15);

  return {
    mostPlayed,
    recentlyPlayed,
    favorites,
    neverPlayed,
    recentlyAdded,
  };
}

/**
 * Local Search & Sorting
 */
export function searchAndSortTracks(
  tracks: KamyTrack[],
  query: string,
  sortBy: 'title' | 'artist' | 'album' | 'mostPlayed' | 'recentlyAdded' | 'duration' = 'title'
): KamyTrack[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q) ||
          t.fileName.toLowerCase().includes(q) ||
          t.folderPath.toLowerCase().includes(q)
      )
    : [...tracks];

  return filtered.sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'artist':
        return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
      case 'album':
        return a.album.localeCompare(b.album) || a.title.localeCompare(b.title);
      case 'mostPlayed':
        return b.totalListenedMs - a.totalListenedMs || b.playCount - a.playCount;
      case 'recentlyAdded':
        return b.addedAt - a.addedAt;
      case 'duration':
        return b.durationSec - a.durationSec;
      default:
        return 0;
    }
  });
}

/**
 * Parse filename and detect audio format for local imported files
 */
export function parseAudioFileMetadata(fileName: string, fileSize: number): {
  title: string;
  artist: string;
  format: AudioFormat;
  fileHash: string;
} {
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const rawExt = extMatch ? extMatch[1].toUpperCase() : 'MP3';
  const supported: AudioFormat[] = ['MP3', 'FLAC', 'WAV', 'AAC', 'M4A', 'OGG', 'OPUS'];
  const format: AudioFormat = supported.includes(rawExt as AudioFormat)
    ? (rawExt as AudioFormat)
    : 'MP3';

  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').trim();
  const parts = baseName.split(' - ').map((s) => s.trim());

  const artist = parts.length >= 2 ? parts[0] : 'Artista Local';
  const title = parts.length >= 2 ? parts.slice(1).join(' - ') : baseName || 'Faixa Importada';
  const fileHash = `${fileName.toLowerCase().trim()}::${fileSize}`;

  return { title, artist, format, fileHash };
}

export function formatDurationClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatListenedHuman(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  if (mins > 0) {
    return `${mins} min ${secs > 0 ? `${secs}s` : ''}`.trim();
  }
  return `${secs} seg`;
}
