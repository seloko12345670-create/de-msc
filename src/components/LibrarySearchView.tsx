import React, { useState } from 'react';
import {
  Search,
  Upload,
  FolderOpen,
  Play,
  Pause,
  Heart,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { KamyTrack } from '../types/kamy';
import { CoverArt } from './CoverArt';
import {
  formatDurationClock,
  formatListenedHuman,
  searchAndSortTracks,
} from '../utils/statsEngine';

interface LibrarySearchViewProps {
  tracks: KamyTrack[];
  currentTrack: KamyTrack | null;
  isPlaying: boolean;
  sortOrder: 'title' | 'artist' | 'album' | 'mostPlayed' | 'recentlyAdded' | 'duration';
  onChangeSortOrder: (
    order: 'title' | 'artist' | 'album' | 'mostPlayed' | 'recentlyAdded' | 'duration'
  ) => void;
  onPlayTrack: (track: KamyTrack, queue?: KamyTrack[]) => void;
  onTogglePlayPause: () => void;
  onToggleFavorite: (trackId: string) => void;
  onTriggerImportFiles: () => void;
  onRefreshLibrary: () => { scanned: number; duplicatesSkipped: number; unavailableCount: number };
}

type LibraryGroupMode = 'tracks' | 'artists' | 'albums' | 'genres' | 'folders';

export const LibrarySearchView: React.FC<LibrarySearchViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  sortOrder,
  onChangeSortOrder,
  onPlayTrack,
  onTogglePlayPause,
  onToggleFavorite,
  onTriggerImportFiles,
  onRefreshLibrary,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupMode, setGroupMode] = useState<LibraryGroupMode>('tracks');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [scanReport, setScanReport] = useState<string | null>(null);

  const searchedTracks = React.useMemo(
    () => searchAndSortTracks(tracks, searchQuery, sortOrder),
    [tracks, searchQuery, sortOrder]
  );

  const displayedTracks = React.useMemo(() => {
    if (!selectedGroupFilter) return searchedTracks;
    return searchedTracks.filter(
      (t) =>
        t.artist === selectedGroupFilter ||
        t.album === selectedGroupFilter ||
        t.genre === selectedGroupFilter ||
        t.folderPath === selectedGroupFilter
    );
  }, [searchedTracks, selectedGroupFilter]);

  const groups = React.useMemo(() => {
    if (groupMode === 'tracks') return [];
    const map = new Map<string, { name: string; count: number; totalMs: number; coverVariant: number }>();
    for (const t of searchedTracks) {
      const key =
        groupMode === 'artists'
          ? t.artist
          : groupMode === 'albums'
          ? t.album
          : groupMode === 'genres'
          ? t.genre
          : t.folderPath;

      const prev = map.get(key) || {
        name: key,
        count: 0,
        totalMs: 0,
        coverVariant: t.coverVariant,
      };
      prev.count += 1;
      prev.totalMs += t.totalListenedMs;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [searchedTracks, groupMode]);

  const handleScan = () => {
    const res = onRefreshLibrary();
    setScanReport(
      `Biblioteca verificada: ${res.scanned} arquivos válidos · ${res.duplicatesSkipped} duplicatas ignoradas · ${res.unavailableCount} indisponíveis.`
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Local Importer Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Biblioteca &amp; Busca Local
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Suporte nativo a MP3, FLAC, WAV, AAC, M4A, OGG e OPUS • 100% Offline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onTriggerImportFiles}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Músicas / Pasta</span>
          </button>

          <button
            type="button"
            onClick={handleScan}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#121212] hover:bg-[#1B1B1B] border border-white/10 text-white font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF4FA3]" />
            <span>Atualizar Biblioteca</span>
          </button>
        </div>
      </div>

      {scanReport && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#121212] border border-[#FF4FA3]/30 text-xs text-[#FFB6D5]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF4FA3] shrink-0" />
            <span>{scanReport}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanReport(null)}
            aria-label="Fechar aviso de verificação"
            className="text-[#A0A0A0] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Instant Offline Search Input + Sort Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por música, artista, álbum, gênero ou arquivo..."
            aria-label="Buscar na biblioteca musical local"
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[#121212] border border-white/10 focus:border-[#FF4FA3] focus:outline-none text-sm text-white placeholder:text-[#A0A0A0]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="md:col-span-4 flex items-center gap-2 bg-[#121212] border border-white/10 rounded-2xl px-3.5 py-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[#FF4FA3] shrink-0" />
          <label htmlFor="kamy-sort-select" className="text-xs text-[#A0A0A0] shrink-0">
            Ordenar:
          </label>
          <select
            id="kamy-sort-select"
            value={sortOrder}
            onChange={(e) =>
              onChangeSortOrder(
                e.target.value as
                  | 'title'
                  | 'artist'
                  | 'album'
                  | 'mostPlayed'
                  | 'recentlyAdded'
                  | 'duration'
              )
            }
            className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
          >
            <option value="mostPlayed" className="bg-[#121212]">
              Mais Ouvidas
            </option>
            <option value="title" className="bg-[#121212]">
              Título (A–Z)
            </option>
            <option value="artist" className="bg-[#121212]">
              Artista
            </option>
            <option value="album" className="bg-[#121212]">
              Álbum
            </option>
            <option value="recentlyAdded" className="bg-[#121212]">
              Adicionadas Recentemente
            </option>
            <option value="duration" className="bg-[#121212]">
              Duração
            </option>
          </select>
        </div>
      </div>

      {/* Organization Mode Tabs: Músicas, Artistas, Álbuns, Gêneros, Pastas */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'tracks', label: `Músicas (${searchedTracks.length})` },
          { id: 'artists', label: 'Por Artista' },
          { id: 'albums', label: 'Por Álbum' },
          { id: 'genres', label: 'Por Gênero' },
          { id: 'folders', label: 'Por Pasta' },
        ].map((tab) => {
          const active = groupMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setGroupMode(tab.id as LibraryGroupMode);
                setSelectedGroupFilter(null);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#FF4FA3] text-black'
                  : 'bg-[#121212] text-[#A0A0A0] hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Group Cards when organized by Artist, Album, Genre, or Folder */}
      {groupMode !== 'tracks' && !selectedGroupFilter && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {groups.map((grp) => (
            <button
              key={grp.name}
              type="button"
              onClick={() => setSelectedGroupFilter(grp.name)}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#121212] hover:bg-[#191919] border border-white/5 hover:border-[#FF4FA3]/30 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {groupMode === 'folders' ? (
                  <div className="w-12 h-12 rounded-2xl bg-[#FF4FA3]/15 border border-[#FF4FA3]/30 flex items-center justify-center text-[#FF4FA3] shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                ) : (
                  <CoverArt
                    variant={grp.coverVariant}
                    title={grp.name}
                    className="w-12 h-12 rounded-2xl"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{grp.name}</p>
                  <p className="text-xs text-[#A0A0A0] mt-0.5">
                    {grp.count} {grp.count === 1 ? 'música' : 'músicas'} ·{' '}
                    {formatListenedHuman(grp.totalMs)}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#FF4FA3] shrink-0">Abrir</span>
            </button>
          ))}
        </div>
      )}

      {selectedGroupFilter && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#121212] border border-[#FF4FA3]/30">
          <div className="text-xs">
            <span className="text-[#A0A0A0]">Filtrando por: </span>
            <strong className="text-white">{selectedGroupFilter}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSelectedGroupFilter(null)}
            className="text-xs font-semibold text-[#FF4FA3] hover:text-[#FFB6D5] cursor-pointer"
          >
            Mostrar Todos
          </button>
        </div>
      )}

      {/* Track List */}
      {(groupMode === 'tracks' || selectedGroupFilter) && (
        <div className="rounded-3xl bg-[#121212] border border-white/5 divide-y divide-white/5 overflow-hidden">
          {displayedTracks.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-white">
                Nenhuma música encontrada para &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-[#A0A0A0]">
                Tente buscar outro termo ou importe novos arquivos de áudio do dispositivo.
              </p>
            </div>
          ) : (
            displayedTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => {
                    if (!track.fileAvailable) return;
                    if (isCurrent) {
                      onTogglePlayPause();
                    } else {
                      onPlayTrack(track, displayedTracks);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!track.fileAvailable) return;
                      if (isCurrent) {
                        onTogglePlayPause();
                      } else {
                        onPlayTrack(track, displayedTracks);
                      }
                    }
                  }}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors cursor-pointer ${
                    isCurrent ? 'bg-[#FF4FA3]/10' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CoverArt
                      variant={track.coverVariant}
                      customUrl={track.customCoverUrl}
                      title={track.title}
                      className="w-12 h-12 rounded-xl"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-bold truncate ${
                            isCurrent ? 'text-[#FF4FA3]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        {!track.fileAvailable && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            Indisponível
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#A0A0A0] truncate mt-0.5">
                        <span>{track.artist}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{track.album}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{track.genre}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono-tabular text-[#FFB6D5]">
                          {track.format}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#A0A0A0]/70 truncate mt-0.5">
                        {track.folderPath}/{track.fileName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-xs font-mono-tabular text-white">
                        {formatDurationClock(track.durationSec)}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-[#A0A0A0]">
                        {track.playCount} plays · {formatListenedHuman(track.totalListenedMs)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track.id);
                      }}
                      aria-label={`Favoritar ${track.title}`}
                      className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          track.favorite
                            ? 'text-[#FF4FA3] fill-[#FF4FA3]'
                            : 'text-[#A0A0A0]'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) {
                          onTogglePlayPause();
                        } else {
                          onPlayTrack(track, displayedTracks);
                        }
                      }}
                      aria-label={
                        isCurrent && isPlaying
                          ? `Pausar ${track.title}`
                          : `Reproduzir ${track.title}`
                      }
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FF4FA3] text-black'
                          : 'bg-white/5 hover:bg-[#FF4FA3] text-white hover:text-black'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
