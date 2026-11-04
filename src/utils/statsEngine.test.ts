import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlaybackSession,
  onSessionPlay,
  onSessionPause,
  finalizePlaybackSession,
  computeMusicalSummary,
  computeAutoPlaylists,
  searchAndSortTracks,
  parseAudioFileMetadata,
} from './statsEngine';
import { KamyTrack } from '../types/kamy';

test('Mandatory KAMY Spec: 14:00 PLAY -> 14:05 PAUSE -> 14:15 PLAY -> 14:20 PAUSE equals exactly 10 minutes (600,000 ms)', () => {
  const baseTime = new Date('2026-11-04T14:00:00.000Z').getTime();
  const min = 60 * 1000;

  let session = createPlaybackSession(
    {
      id: 'track-1',
      title: 'Pink Horizon',
      artist: 'Kamy Synth',
      album: 'Midnight Velvet',
      genre: 'Synthwave',
    },
    baseTime,
    'test-session-1400'
  );

  // 14:00 — PLAY
  session = onSessionPlay(session, baseTime);
  assert.equal(session.isPlaying, true);

  // 14:05 — PAUSE (5 minutes played)
  session = onSessionPause(session, baseTime + 5 * min);
  assert.equal(session.isPlaying, false);
  assert.equal(session.accumulatedMs, 5 * min);
  assert.equal(session.pauseCount, 1);

  // 14:05 to 14:15 — Paused for 10 minutes!
  // 14:15 — PLAY
  session = onSessionPlay(session, baseTime + 15 * min);
  assert.equal(session.isPlaying, true);
  // Confirm paused 10 minutes were NOT counted
  assert.equal(session.accumulatedMs, 5 * min);

  // 14:20 — PAUSE (5 more minutes played)
  session = onSessionPause(session, baseTime + 20 * min);
  assert.equal(session.isPlaying, false);
  assert.equal(session.accumulatedMs, 10 * min);
  assert.equal(session.pauseCount, 2);

  const record = finalizePlaybackSession(session, baseTime + 20 * min, false);
  assert.equal(record.durationMs, 10 * min);
  assert.equal(record.durationMs / 60000, 10);
  assert.equal(record.pauseCount, 2);
  assert.equal(record.skipped, false);
});

test('computeMusicalSummary aggregates real listening time, top artist, top track, and unique tracks accurately', () => {
  const now = new Date('2026-11-04T18:00:00.000Z').getTime();
  const min = 60 * 1000;

  const mockTracks: KamyTrack[] = [
    {
      id: 't1',
      title: 'Velvet Pulse',
      artist: 'Aurora Noir',
      album: 'Pink Eclipse',
      genre: 'Dark Pop',
      folderPath: '/Music/Kamy',
      fileName: 'Aurora Noir - Velvet Pulse.flac',
      format: 'FLAC',
      durationSec: 240,
      coverVariant: 1,
      accentColor: '#FF4FA3',
      favorite: true,
      addedAt: now - 86400000,
      playCount: 5,
      pauseCount: 1,
      skipCount: 0,
      totalListenedMs: 30 * min,
      fileAvailable: true,
      fileHash: 'h1',
      lyrics: [],
    },
    {
      id: 't2',
      title: 'Cyber Rose',
      artist: 'Nishi',
      album: 'Midnight Confessions',
      genre: 'Electronic',
      folderPath: '/Music/Kamy',
      fileName: 'Nishi - Cyber Rose.mp3',
      format: 'MP3',
      durationSec: 200,
      coverVariant: 2,
      accentColor: '#FF2D95',
      favorite: false,
      addedAt: now - 40000,
      playCount: 0,
      pauseCount: 0,
      skipCount: 0,
      totalListenedMs: 0,
      fileAvailable: true,
      fileHash: 'h2',
      lyrics: [],
    },
  ];

  const sessions = [
    {
      sessionId: 's1',
      trackId: 't1',
      trackTitle: 'Velvet Pulse',
      artist: 'Aurora Noir',
      album: 'Pink Eclipse',
      genre: 'Dark Pop',
      startedAt: now - 60 * min,
      endedAt: now - 30 * min,
      dateKey: '2026-11-04',
      durationMs: 30 * min,
      playCount: 2,
      pauseCount: 1,
      skipped: false,
      events: [],
    },
    {
      sessionId: 's2',
      trackId: 't2',
      trackTitle: 'Cyber Rose',
      artist: 'Nishi',
      album: 'Midnight Confessions',
      genre: 'Electronic',
      startedAt: now - 25 * min,
      endedAt: now - 5 * min,
      dateKey: '2026-11-04',
      durationMs: 15 * min,
      playCount: 1,
      pauseCount: 0,
      skipped: false,
      events: [],
    },
  ];

  const report = computeMusicalSummary(sessions, mockTracks, 'today', now);
  assert.equal(report.totalMinutes, 45);
  assert.equal(report.uniqueTracksCount, 2);
  assert.equal(report.topTrack?.name, 'Velvet Pulse');
  assert.equal(report.topArtist?.name, 'Aurora Noir');
  assert.equal(report.topGenre?.name, 'Dark Pop');

  const autoPlaylists = computeAutoPlaylists(mockTracks);
  assert.equal(autoPlaylists.favorites.length, 1);
  assert.equal(autoPlaylists.neverPlayed.length, 1);
  assert.equal(autoPlaylists.neverPlayed[0].id, 't2');
});

test('parseAudioFileMetadata and searchAndSortTracks work offline without network', () => {
  const parsed = parseAudioFileMetadata('Budiarti - Starlit Reverie.flac', 24500123);
  assert.equal(parsed.artist, 'Budiarti');
  assert.equal(parsed.title, 'Starlit Reverie');
  assert.equal(parsed.format, 'FLAC');

  const tracks: KamyTrack[] = [
    {
      id: '1',
      title: 'Starlit Reverie',
      artist: 'Budiarti',
      album: 'Reverie LP',
      genre: 'R&B',
      folderPath: '/Internal/Music/Budiarti',
      fileName: 'Budiarti - Starlit Reverie.flac',
      format: 'FLAC',
      durationSec: 215,
      coverVariant: 0,
      accentColor: '#FF4FA3',
      favorite: true,
      addedAt: 1000,
      playCount: 4,
      pauseCount: 0,
      skipCount: 0,
      totalListenedMs: 800000,
      fileAvailable: true,
      fileHash: 'hash1',
      lyrics: [],
    },
  ];

  const found = searchAndSortTracks(tracks, 'budiarti', 'title');
  assert.equal(found.length, 1);
  const notFound = searchAndSortTracks(tracks, 'nonexistent', 'title');
  assert.equal(notFound.length, 0);
});
