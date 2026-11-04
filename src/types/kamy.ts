export type AudioFormat = 'MP3' | 'FLAC' | 'WAV' | 'AAC' | 'M4A' | 'OGG' | 'OPUS';

export interface LyricLine {
  timeSec: number;
  text: string;
}

export interface KamyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  folderPath: string;
  fileName: string;
  format: AudioFormat;
  durationSec: number;
  coverVariant: number; // 0..9 built-in pink/black vinyl themes
  customCoverUrl?: string;
  accentColor: string;
  favorite: boolean;
  addedAt: number; // epoch ms
  lastPlayedAt?: number; // epoch ms
  playCount: number;
  pauseCount: number;
  skipCount: number;
  totalListenedMs: number; // strictly accumulated active playback time
  fileAvailable: boolean;
  fileHash: string; // used for duplicate detection
  lyrics: LyricLine[];
  isLocalBlob?: boolean;
  synthPresetIndex?: number;
}

export interface PlaybackEventLog {
  type: 'PLAY' | 'PAUSE' | 'STOP' | 'SKIP' | 'COMPLETED';
  timestamp: number;
  labelTime: string;
}

export interface PlaybackSessionRecord {
  sessionId: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  album: string;
  genre: string;
  startedAt: number;
  endedAt: number;
  dateKey: string; // YYYY-MM-DD
  durationMs: number; // strictly active playback duration in milliseconds
  playCount: number;
  pauseCount: number;
  skipped: boolean;
  events: PlaybackEventLog[];
}

export interface KamyPlaylist {
  id: string;
  name: string;
  description: string;
  coverVariant: number;
  customCoverUrl?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
  isSystem?: boolean;
}

export interface KamySettings {
  userName: string;
  amoledMode: boolean; // #000000 pure black vs #080808 deep black
  dynamicCoverColors: boolean;
  crossfadeSec: number; // 0..12
  gaplessPlayback: boolean;
  playbackSpeed: number; // 0.5..2.0
  equalizerEnabled: boolean;
  equalizerPreset: 'Flat' | 'Bass Boost' | 'Vocal Pink' | 'Electronic' | 'Acoustic' | 'Custom';
  equalizerBands: [number, number, number, number, number]; // 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz (-12 to +12 dB)
  smartQueueEnabled: boolean;
  sleepTimerMinutes: number | null;
  sortOrder: 'title' | 'artist' | 'album' | 'mostPlayed' | 'recentlyAdded' | 'duration';
  dbSchemaVersion: number;
}

export type StatsPeriodFilter = 'today' | '7d' | '30d' | '12m' | 'all';

export interface RankedItem {
  name: string;
  subtitle?: string;
  listenedMs: number;
  playCount: number;
  coverVariant?: number;
  trackId?: string;
}

export interface ChartDataPoint {
  label: string;
  minutes: number;
  hours: number;
  sessionsCount: number;
}

export interface MusicalSummaryReport {
  period: StatsPeriodFilter;
  totalListenedMs: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  totalPlays: number;
  totalPauses: number;
  totalSkips: number;
  uniqueTracksCount: number;
  topTrack: RankedItem | null;
  topArtist: RankedItem | null;
  topAlbum: RankedItem | null;
  topGenre: RankedItem | null;
  top10Tracks: RankedItem[];
  top10Artists: RankedItem[];
  top10Albums: RankedItem[];
  top10Genres: RankedItem[];
  dailyChart: ChartDataPoint[];
  weeklyChart: ChartDataPoint[];
  monthlyChart: ChartDataPoint[];
}
