import React, { useState } from 'react';
import {
  Plus,
  Play,
  Shuffle,
  Copy,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { KamyPlaylist, KamyTrack } from '../types/kamy';
import { CoverArt } from './CoverArt';
import { computeAutoPlaylists, formatDurationClock } from '../utils/statsEngine';

interface PlaylistsViewProps {
  tracks: KamyTrack[];
  playlists: KamyPlaylist[];
  initialSelectedPlaylistId?: string | null;
  onPlayTrack: (track: KamyTrack, queue?: KamyTrack[]) => void;
  onCreatePlaylist: (name: string, description: string, coverVariant: number) => void;
  onUpdatePlaylist: (playlist: KamyPlaylist) => void;
  onDuplicatePlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

type AutoPlaylistKey =
  | 'mostPlayed'
  | 'recentlyPlayed'
  | 'favorites'
  | 'neverPlayed'
  | 'recentlyAdded';

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  tracks,
  playlists,
  initialSelectedPlaylistId,
  onPlayTrack,
  onCreatePlaylist,
  onUpdatePlaylist,
  onDuplicatePlaylist,
  onDeletePlaylist,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    initialSelectedPlaylistId || (playlists[0]?.id ?? null)
  );
  const [selectedAutoKey, setSelectedAutoKey] = useState<AutoPlaylistKey | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCoverVariant, setNewCoverVariant] = useState(0);

  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCoverVariant, setEditCoverVariant] = useState(0);

  const autoPlaylists = React.useMemo(() => computeAutoPlaylists(tracks), [tracks]);

  const autoPlaylistConfigs: {
    key: AutoPlaylistKey;
    title: string;
    subtitle: string;
    coverVariant: number;
    items: KamyTrack[];
  }[] = [
    {
      key: 'mostPlayed',
      title: 'Mais ouvidas',
      subtitle: 'Ordenadas pelo tempo real de reprodução',
      coverVariant: 0,
      items: autoPlaylists.mostPlayed,
    },
    {
      key: 'recentlyPlayed',
      title: 'Recentemente reproduzidas',
      subtitle: 'Histórico recente de escuta no dispositivo',
      coverVariant: 1,
      items: autoPlaylists.recentlyPlayed,
    },
    {
      key: 'favorites',
      title: 'Favoritas',
      subtitle: 'Músicas marcadas com coração',
      coverVariant: 2,
      items: autoPlaylists.favorites,
    },
    {
      key: 'neverPlayed',
      title: 'Nunca ouvidas',
      subtitle: 'Descubra faixas com 0 min reproduzidos',
      coverVariant: 7,
      items: autoPlaylists.neverPlayed,
    },
    {
      key: 'recentlyAdded',
      title: 'Adicionadas recentemente',
      subtitle: 'Últimas músicas importadas na biblioteca',
      coverVariant: 4,
      items: autoPlaylists.recentlyAdded,
    },
  ];

  const activeCustomPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;
  const activeAutoPlaylist = autoPlaylistConfigs.find((a) => a.key === selectedAutoKey) || null;

  const customPlaylistTracks = React.useMemo(() => {
    if (!activeCustomPlaylist) return [];
    const map = new Map(tracks.map((t) => [t.id, t]));
    return activeCustomPlaylist.trackIds
      .map((id) => map.get(id))
      .filter((t): t is KamyTrack => Boolean(t));
  }, [activeCustomPlaylist, tracks]);

  const handleShufflePlay = (list: KamyTrack[]) => {
    if (list.length === 0) return;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    onPlayTrack(shuffled[0], shuffled);
  };

  const handleMoveTrack = (index: number, direction: -1 | 1) => {
    if (!activeCustomPlaylist) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= activeCustomPlaylist.trackIds.length) return;
    const nextIds = [...activeCustomPlaylist.trackIds];
    const [removed] = nextIds.splice(index, 1);
    nextIds.splice(targetIdx, 0, removed);
    onUpdatePlaylist({
      ...activeCustomPlaylist,
      trackIds: nextIds,
      updatedAt: Date.now(),
    });
  };

  const handleRemoveFromPlaylist = (trackId: string) => {
    if (!activeCustomPlaylist) return;
    onUpdatePlaylist({
      ...activeCustomPlaylist,
      trackIds: activeCustomPlaylist.trackIds.filter((id) => id !== trackId),
      updatedAt: Date.now(),
    });
  };

  const handleAddTrackToPlaylist = (trackId: string) => {
    if (!activeCustomPlaylist) return;
    if (activeCustomPlaylist.trackIds.includes(trackId)) return;
    onUpdatePlaylist({
      ...activeCustomPlaylist,
      trackIds: [...activeCustomPlaylist.trackIds, trackId],
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="space-y-7 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Playlists &amp; Mixes Inteligentes
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Crie, personalize capas, reordene faixas ou escute as playlists automáticas offline
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-bold text-xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Playlist</span>
        </button>
      </div>

      {/* Automatic Smart Playlists Row */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FF4FA3]" />
          <h2 className="text-sm font-bold text-white">Playlists Automáticas do Sistema</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {autoPlaylistConfigs.map((auto) => {
            const isSelected = selectedAutoKey === auto.key;
            return (
              <button
                key={auto.key}
                type="button"
                onClick={() => {
                  setSelectedAutoKey(auto.key);
                  setSelectedPlaylistId(null);
                }}
                className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF4FA3]/15 border-[#FF4FA3]'
                    : 'bg-[#121212] hover:bg-[#1A1A1A] border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CoverArt
                    variant={auto.coverVariant}
                    title={auto.title}
                    className="w-11 h-11 rounded-xl"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{auto.title}</p>
                    <p className="text-[11px] text-[#FFB6D5] font-mono-tabular mt-0.5">
                      {auto.items.length} faixas
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Master-Detail Grid: Left User Playlists List + Right Active Playlist Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-bold text-white">Suas Playlists ({playlists.length})</h2>
          <div className="space-y-2.5">
            {playlists.map((pl) => {
              const isSelected = selectedPlaylistId === pl.id && !selectedAutoKey;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    setSelectedPlaylistId(pl.id);
                    setSelectedAutoKey(null);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPlaylistId(pl.id);
                      setSelectedAutoKey(null);
                    }
                  }}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF4FA3]/15 border-[#FF4FA3]'
                      : 'bg-[#121212] hover:bg-[#191919] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CoverArt
                      variant={pl.coverVariant}
                      customUrl={pl.customCoverUrl}
                      title={pl.name}
                      className="w-12 h-12 rounded-xl"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{pl.name}</p>
                      <p className="text-xs text-[#A0A0A0] truncate">
                        {pl.trackIds.length} músicas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePlaylist(pl.id);
                      }}
                      title="Duplicar playlist"
                      aria-label={`Duplicar playlist ${pl.name}`}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 text-[#A0A0A0] hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {playlists.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePlaylist(pl.id);
                          if (selectedPlaylistId === pl.id) {
                            const nextPl = playlists.find((x) => x.id !== pl.id);
                            setSelectedPlaylistId(nextPl?.id || null);
                          }
                        }}
                        title="Excluir playlist"
                        aria-label={`Excluir playlist ${pl.name}`}
                        className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-[#A0A0A0] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-8">
          {activeAutoPlaylist ? (
            <div className="rounded-3xl bg-[#121212] border border-white/10 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <CoverArt
                    variant={activeAutoPlaylist.coverVariant}
                    title={activeAutoPlaylist.title}
                    className="w-20 h-20 rounded-2xl"
                  />
                  <div>
                    <span className="text-[11px] font-semibold text-[#FF4FA3]">
                      PLAYLIST AUTOMÁTICA
                    </span>
                    <h3 className="text-xl font-extrabold text-white">
                      {activeAutoPlaylist.title}
                    </h3>
                    <p className="text-xs text-[#A0A0A0] mt-0.5">
                      {activeAutoPlaylist.subtitle} · {activeAutoPlaylist.items.length} músicas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeAutoPlaylist.items.length > 0) {
                        onPlayTrack(activeAutoPlaylist.items[0], activeAutoPlaylist.items);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-bold text-xs cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Reproduzir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShufflePlay(activeAutoPlaylist.items)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4 text-[#FF4FA3]" />
                    <span>Aleatório</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {activeAutoPlaylist.items.map((track, idx) => (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track, activeAutoPlaylist.items)}
                    className="flex items-center justify-between gap-3 py-3 px-2 hover:bg-white/[0.03] rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-xs font-mono-tabular text-[#A0A0A0]">
                        {idx + 1}
                      </span>
                      <CoverArt
                        variant={track.coverVariant}
                        title={track.title}
                        className="w-10 h-10 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-[#A0A0A0] truncate">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono-tabular text-[#A0A0A0]">
                      {formatDurationClock(track.durationSec)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeCustomPlaylist ? (
            <div className="rounded-3xl bg-[#121212] border border-white/10 p-6 space-y-5">
              {/* Custom Playlist Header + Edit Name & Cover */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <CoverArt
                    variant={
                      editingPlaylistId === activeCustomPlaylist.id
                        ? editCoverVariant
                        : activeCustomPlaylist.coverVariant
                    }
                    customUrl={activeCustomPlaylist.customCoverUrl}
                    title={activeCustomPlaylist.name}
                    className="w-20 h-20 rounded-2xl"
                  />
                  <div className="space-y-1">
                    {editingPlaylistId === activeCustomPlaylist.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="Editar nome da playlist"
                          className="px-3 py-1.5 rounded-lg bg-[#080808] border border-[#FF4FA3] text-sm font-bold text-white"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[#A0A0A0]">Capa:</span>
                          {[0, 1, 2, 3, 4, 5, 6, 7].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEditCoverVariant(v)}
                              className={`w-5 h-5 rounded-full text-[10px] font-bold cursor-pointer ${
                                editCoverVariant === v
                                  ? 'bg-[#FF4FA3] text-black'
                                  : 'bg-white/10 text-white'
                              }`}
                            >
                              {v + 1}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (editName.trim()) {
                                onUpdatePlaylist({
                                  ...activeCustomPlaylist,
                                  name: editName.trim(),
                                  coverVariant: editCoverVariant,
                                  updatedAt: Date.now(),
                                });
                              }
                              setEditingPlaylistId(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FF4FA3] text-black text-xs font-bold cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlaylistId(null)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-extrabold text-white">
                            {activeCustomPlaylist.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlaylistId(activeCustomPlaylist.id);
                              setEditName(activeCustomPlaylist.name);
                              setEditCoverVariant(activeCustomPlaylist.coverVariant);
                            }}
                            aria-label="Editar nome e capa da playlist"
                            className="p-1.5 rounded-lg hover:bg-white/10 text-[#A0A0A0] hover:text-white cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-[#A0A0A0]">
                          {activeCustomPlaylist.description} · {customPlaylistTracks.length} músicas
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (customPlaylistTracks.length > 0) {
                        onPlayTrack(customPlaylistTracks[0], customPlaylistTracks);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Reproduzir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShufflePlay(customPlaylistTracks)}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    <Shuffle className="w-4 h-4 text-[#FF4FA3]" />
                    <span>Aleatório</span>
                  </button>
                </div>
              </div>

              {/* Tracks inside custom playlist with Reorder & Remove */}
              <div className="space-y-1.5">
                {customPlaylistTracks.length === 0 ? (
                  <p className="text-xs text-[#A0A0A0] py-4">
                    Esta playlist está vazia. Adicione músicas da sua biblioteca abaixo.
                  </p>
                ) : (
                  customPlaylistTracks.map((track, idx) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#080808]/60 hover:bg-white/[0.04]"
                    >
                      <div
                        onClick={() => onPlayTrack(track, customPlaylistTracks)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="w-5 text-xs font-mono-tabular text-[#A0A0A0]">
                          {idx + 1}
                        </span>
                        <CoverArt
                          variant={track.coverVariant}
                          title={track.title}
                          className="w-10 h-10 rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {track.title}
                          </p>
                          <p className="text-xs text-[#A0A0A0] truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveTrack(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Mover ${track.title} para cima`}
                          className="w-8 h-8 rounded-lg hover:bg-white/10 disabled:opacity-30 text-[#A0A0A0] hover:text-white flex items-center justify-center cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTrack(idx, 1)}
                          disabled={idx === customPlaylistTracks.length - 1}
                          aria-label={`Mover ${track.title} para baixo`}
                          className="w-8 h-8 rounded-lg hover:bg-white/10 disabled:opacity-30 text-[#A0A0A0] hover:text-white flex items-center justify-center cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromPlaylist(track.id)}
                          aria-label={`Remover ${track.title} da playlist`}
                          className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-[#A0A0A0] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add tracks to this playlist */}
              <div className="pt-4 border-t border-white/5 space-y-2.5">
                <p className="text-xs font-bold text-[#FFB6D5]">
                  Adicionar músicas da biblioteca a esta playlist
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tracks
                    .filter((t) => !activeCustomPlaylist.trackIds.includes(t.id))
                    .map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => handleAddTrackToPlaylist(track.id)}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#080808] hover:bg-white/5 border border-white/5 text-left cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {track.title}
                          </p>
                          <p className="text-[11px] text-[#A0A0A0] truncate">{track.artist}</p>
                        </div>
                        <Plus className="w-4 h-4 text-[#FF4FA3] shrink-0" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Create New Playlist Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Criar nova playlist"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#121212] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Criar Nova Playlist</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Fechar janela de nova playlist"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#A0A0A0] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="new-pl-name" className="block text-xs text-[#A0A0A0] mb-1">
                  Nome da Playlist
                </label>
                <input
                  id="new-pl-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Treino Noturno Rosa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-white/10 focus:border-[#FF4FA3] focus:outline-none text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="new-pl-desc" className="block text-xs text-[#A0A0A0] mb-1">
                  Descrição
                </label>
                <input
                  id="new-pl-desc"
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Seleção pessoal offline"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-white/10 focus:border-[#FF4FA3] focus:outline-none text-sm text-white"
                />
              </div>

              <div>
                <span className="block text-xs text-[#A0A0A0] mb-2">Personalizar Capa</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => setNewCoverVariant(variant)}
                      className={`p-1 rounded-xl border transition-all cursor-pointer ${
                        newCoverVariant === variant
                          ? 'border-[#FF4FA3] scale-105'
                          : 'border-transparent opacity-60'
                      }`}
                    >
                      <CoverArt variant={variant} className="w-11 h-11 rounded-lg" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newName.trim()) return;
                  onCreatePlaylist(
                    newName.trim(),
                    newDesc.trim() || 'Playlist local personalizada',
                    newCoverVariant
                  );
                  setNewName('');
                  setNewDesc('');
                  setShowCreateModal(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black text-xs font-bold cursor-pointer"
              >
                Salvar Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
