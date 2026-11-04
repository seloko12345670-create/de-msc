import React, { useState } from 'react';
import {
  Play,
  Pause,
  Heart,
  Search,
  Sparkles,
  Disc3,
  MoreHorizontal,
  ArrowDownToLine,
  Upload,
  Flame,
} from 'lucide-react';
import { KamyPlaylist, KamyTrack, MusicalSummaryReport } from '../types/kamy';
import { CoverArt } from './CoverArt';
import { formatDurationClock, formatListenedHuman } from '../utils/statsEngine';

interface HomeViewProps {
  userName: string;
  tracks: KamyTrack[];
  playlists: KamyPlaylist[];
  currentTrack: KamyTrack | null;
  isPlaying: boolean;
  summaryAllTime: MusicalSummaryReport;
  onPlayTrack: (track: KamyTrack, customQueue?: KamyTrack[]) => void;
  onTogglePlayPause: () => void;
  onToggleFavorite: (trackId: string) => void;
  onNavigateTab: (tab: 'home' | 'library' | 'stats' | 'playlists' | 'settings') => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenWrapped: () => void;
  onTriggerImportFiles: () => void;
}

type HomeCategoryFilter = 'all' | 'new' | 'trending' | 'top';

export const HomeView: React.FC<HomeViewProps> = ({
  userName,
  tracks,
  playlists,
  currentTrack,
  isPlaying,
  summaryAllTime,
  onPlayTrack,
  onTogglePlayPause,
  onToggleFavorite,
  onNavigateTab,
  onOpenPlaylist,
  onOpenWrapped,
  onTriggerImportFiles,
}) => {
  const [activeCategory, setActiveCategory] = useState<HomeCategoryFilter>('all');

  const filteredTracks = React.useMemo(() => {
    const available = tracks.filter((t) => t.fileAvailable);
    if (activeCategory === 'new') {
      return [...available].sort((a, b) => b.addedAt - a.addedAt);
    }
    if (activeCategory === 'trending') {
      return [...available].sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
    }
    if (activeCategory === 'top') {
      return [...available].sort((a, b) => b.totalListenedMs - a.totalListenedMs);
    }
    return available;
  }, [tracks, activeCategory]);

  const featuredPlaylist = playlists[0] || {
    id: 'pl-discover-weekly',
    name: 'Discover weekly',
    description: 'Sua mixtape semanal de faixas frescas e joias guardadas no celular.',
    coverVariant: 0,
    trackIds: tracks.slice(0, 5).map((t) => t.id),
  };

  const featuredTracks = tracks.filter((t) => featuredPlaylist.trackIds.includes(t.id));
  const isFeaturedPlaying =
    isPlaying && currentTrack && featuredPlaylist.trackIds.includes(currentTrack.id);

  return (
    <div className="space-y-7 pb-8">
      {/* Top Greeting Header inspired directly by the visual reference */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-[#FF4FA3]/50 shrink-0">
            <CoverArt variant={0} title={userName} className="w-full h-full" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#FFB6D5] tracking-wide">
              KAMY • 100% OFFLINE
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Hi, {userName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTriggerImportFiles}
            aria-label="Importar músicas do celular"
            title="Importar músicas do celular"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#121212] hover:bg-[#1E1E1E] border border-white/10 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF4FA3]" />
            <span>Importar Músicas</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('library')}
            aria-label="Abrir busca local na biblioteca"
            className="w-11 h-11 rounded-full bg-[#121212] hover:bg-[#1C1C1C] border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('playlists')}
            aria-label="Ver músicas favoritas"
            className="w-11 h-11 rounded-full bg-[#121212] hover:bg-[#1C1C1C] border border-white/10 flex items-center justify-center text-[#FF4FA3] transition-colors cursor-pointer"
          >
            <Heart className="w-4 h-4 fill-[#FF4FA3]/20" />
          </button>
        </div>
      </div>

      {/* Category Filter Pills (All, New Release, Trending, Top) */}
      <div
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
        role="tablist"
        aria-label="Filtros da tela inicial"
      >
        {[
          { id: 'all', label: 'All' },
          { id: 'new', label: 'New Release' },
          { id: 'trending', label: 'Trending' },
          { id: 'top', label: 'Top' },
        ].map((tab) => {
          const active = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(tab.id as HomeCategoryFilter)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#FF4FA3] text-[#080808] shadow-[0_0_20px_rgba(255,79,163,0.35)]'
                  : 'bg-[#121212] text-[#A0A0A0] hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Curated & Trending Hero Card + Quick Stats Split on Desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-7 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Curated &amp; trending
            </h2>
            <span className="text-xs text-[#A0A0A0]">
              {tracks.length} faixas no dispositivo
            </span>
          </div>

          {/* Discover Weekly Card (Reconstructed from visual reference in Pink & Black palette) */}
          <div
            className="relative overflow-hidden rounded-[28px] p-6 sm:p-7 border border-[#FF4FA3]/30 shadow-[0_18px_50px_rgba(255,45,149,0.16)] flex items-center justify-between gap-4 min-h-[210px]"
            style={{
              background:
                'linear-gradient(125deg, #FFB6D5 0%, #FF4FA3 48%, #9D174D 100%)',
            }}
          >
            <div className="relative z-10 max-w-[62%] space-y-2.5">
              <span className="inline-block text-[11px] font-bold tracking-wider text-[#180510]/75">
                MIXTAPE LOCAL • OFFLINE
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#080808] tracking-tight leading-tight">
                Discover weekly
              </h3>
              <p className="text-xs sm:text-sm font-medium text-[#180510]/85 leading-relaxed">
                Your weekly mixtape of fresh local tracks &amp; hidden gems.
              </p>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isFeaturedPlaying) {
                      onTogglePlayPause();
                    } else if (featuredTracks.length > 0) {
                      onPlayTrack(featuredTracks[0], featuredTracks);
                    } else if (tracks.length > 0) {
                      onPlayTrack(tracks[0], tracks);
                    }
                  }}
                  aria-label="Reproduzir Discover weekly"
                  className="w-12 h-12 rounded-full bg-[#190612] hover:bg-[#080808] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  {isFeaturedPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (featuredTracks[0]) onToggleFavorite(featuredTracks[0].id);
                  }}
                  aria-label="Favoritar mixtape"
                  className="w-9 h-9 rounded-full bg-black/15 hover:bg-black/25 text-[#080808] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPlaylist(featuredPlaylist.id)}
                  aria-label="Ver faixas da playlist Discover weekly"
                  className="w-9 h-9 rounded-full bg-black/15 hover:bg-black/25 text-[#080808] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPlaylist(featuredPlaylist.id)}
                  aria-label="Mais opções da mixtape"
                  className="w-9 h-9 rounded-full bg-black/15 hover:bg-black/25 text-[#080808] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right-aligned studio portrait artwork inspired by reference */}
            <div className="relative z-10 w-32 h-36 sm:w-40 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border border-black/20 shrink-0">
              <CoverArt
                variant={0}
                title="Discover Weekly"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Right Hero Column: Real Listening Summary & KAMY Wrapped Trigger */}
        <div className="xl:col-span-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Estatísticas Reais &amp; Wrapped
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('stats')}
              className="text-xs font-semibold text-[#FF4FA3] hover:text-[#FFB6D5] cursor-pointer"
            >
              Ver Meu Resumo
            </button>
          </div>

          <div className="rounded-[28px] bg-[#121212] border border-white/10 p-6 flex flex-col justify-between min-h-[210px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-[#FF4FA3] tracking-wider">
                  CONTAGEM REAL DE ÁUDIO ATIVO
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono-tabular text-white">
                    {summaryAllTime.totalMinutes}
                  </span>
                  <span className="text-sm font-semibold text-[#FFB6D5]">
                    min escutados ({summaryAllTime.totalHours}h)
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#A0A0A0]">
                  Artista favorito:{' '}
                  <strong className="text-white">
                    {summaryAllTime.topArtist?.name || 'Budiarti'}
                  </strong>{' '}
                  · {summaryAllTime.uniqueTracksCount} músicas diferentes
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#FF4FA3]/15 border border-[#FF4FA3]/30 flex items-center justify-center text-[#FF4FA3] shrink-0">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onOpenWrapped}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-[#080808] font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Abrir KAMY WRAPPED</span>
              </button>

              <button
                type="button"
                onClick={onTriggerImportFiles}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-[#FF4FA3]" />
                <span>Importar MP3/FLAC</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top daily playlists section matching reference image */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Top daily playlists
          </h2>
          <button
            type="button"
            onClick={() => onNavigateTab('playlists')}
            className="text-xs font-medium text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
          >
            See all
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {playlists.slice(0, 3).map((pl, idx) => {
            const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
            return (
              <div
                key={pl.id}
                onClick={() => onOpenPlaylist(pl.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenPlaylist(pl.id);
                  }
                }}
                className="group flex items-center justify-between gap-3.5 p-3.5 rounded-2xl bg-[#121212] hover:bg-[#191919] border border-white/5 hover:border-[#FF4FA3]/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <CoverArt
                    variant={pl.coverVariant ?? idx + 1}
                    customUrl={pl.customCoverUrl}
                    title={pl.name}
                    className="w-14 h-14 rounded-2xl"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-[#FFB6D5] transition-colors">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-[#A0A0A0] truncate mt-0.5">
                      <span>{pl.description.split('•')[0].trim()}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{plTracks.length} Songs</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (plTracks.length > 0) {
                      onPlayTrack(plTracks[0], plTracks);
                    }
                  }}
                  aria-label={`Tocar playlist ${pl.name}`}
                  className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-[#FF4FA3] text-white group-hover:text-black flex items-center justify-center transition-all shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Track List Section */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Biblioteca Musical Offline
            </h2>
            <p className="text-xs text-[#A0A0A0]">
              Toque em qualquer música para iniciar a reprodução local e contabilizar estatísticas reais
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('library')}
            className="text-xs font-semibold text-[#FF4FA3] hover:text-[#FFB6D5] cursor-pointer whitespace-nowrap"
          >
            Gerenciar Biblioteca
          </button>
        </div>

        <div className="divide-y divide-white/5 rounded-3xl bg-[#121212] border border-white/5 overflow-hidden">
          {filteredTracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => {
                  if (isCurrent) {
                    onTogglePlayPause();
                  } else {
                    onPlayTrack(track, filteredTracks);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isCurrent) {
                      onTogglePlayPause();
                    } else {
                      onPlayTrack(track, filteredTracks);
                    }
                  }
                }}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors cursor-pointer ${
                  isCurrent ? 'bg-[#FF4FA3]/10' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative">
                    <CoverArt
                      variant={track.coverVariant}
                      customUrl={track.customCoverUrl}
                      title={track.title}
                      artist={track.artist}
                      className="w-12 h-12 rounded-xl"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-xl bg-black/55 flex items-center justify-center">
                        <Disc3
                          className={`w-5 h-5 text-[#FF4FA3] ${
                            isPlaying ? 'animate-spin' : ''
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-bold truncate ${
                          isCurrent ? 'text-[#FF4FA3]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0] truncate mt-0.5">
                      <span>{track.artist}</span>
                      <span aria-hidden="true">·</span>
                      <span>{track.album}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-[#FFB6D5]">
                        {track.format}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-xs font-mono-tabular text-white">
                      {formatDurationClock(track.durationSec)}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-[#A0A0A0]">
                      {formatListenedHuman(track.totalListenedMs)} ouvidos
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    aria-label={
                      track.favorite
                        ? `Remover ${track.title} dos favoritos`
                        : `Adicionar ${track.title} aos favoritos`
                    }
                    className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
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
                        onPlayTrack(track, filteredTracks);
                      }
                    }}
                    aria-label={
                      isCurrent && isPlaying
                        ? `Pausar ${track.title}`
                        : `Reproduzir ${track.title}`
                    }
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#FF4FA3] text-black shadow-[0_0_15px_rgba(255,79,163,0.4)]'
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
          })}
        </div>
      </section>
    </div>
  );
};
