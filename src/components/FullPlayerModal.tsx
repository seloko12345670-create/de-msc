import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Sliders,
  Timer,
  ChevronDown,
  Gauge,
  Edit3,
  Check,
} from 'lucide-react';
import { KamySettings, KamyTrack, LyricLine } from '../types/kamy';
import { CoverArt } from './CoverArt';
import { formatDurationClock } from '../utils/statsEngine';
import { EQ_FREQUENCIES, EQ_PRESETS } from '../audio/audioEngine';

interface FullPlayerModalProps {
  isOpen: boolean;
  track: KamyTrack | null;
  queue: KamyTrack[];
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  settings: KamySettings;
  sleepTimerRemainingSec: number | null;
  onClose: () => void;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (sec: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: (trackId: string) => void;
  onSelectQueueTrack: (track: KamyTrack) => void;
  onUpdateSettings: (partial: Partial<KamySettings>) => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onSaveCustomLyrics: (trackId: string, lyrics: LyricLine[]) => void;
}

type PlayerSubTab = 'cover' | 'lyrics' | 'eq' | 'queue' | 'timer';

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({
  isOpen,
  track,
  queue,
  isPlaying,
  currentTimeSec,
  durationSec,
  volume,
  isMuted,
  shuffle,
  repeatMode,
  settings,
  sleepTimerRemainingSec,
  onClose,
  onTogglePlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
  onSelectQueueTrack,
  onUpdateSettings,
  onSetSleepTimer,
  onSaveCustomLyrics,
}) => {
  const [subTab, setSubTab] = useState<PlayerSubTab>('cover');
  const [editingLyrics, setEditingLyrics] = useState(false);
  const [rawLyricsText, setRawLyricsText] = useState('');

  if (!isOpen || !track) return null;

  const effectiveDuration = durationSec > 0 ? durationSec : track.durationSec;

  const handleStartEditLyrics = () => {
    const formatted = track.lyrics
      .map((l) => `[${formatDurationClock(l.timeSec)}] ${l.text}`)
      .join('\n');
    setRawLyricsText(formatted);
    setEditingLyrics(true);
  };

  const handleSaveLyrics = () => {
    const lines = rawLyricsText
      .split('\n')
      .map((line, i) => {
        const match = line.match(/^\[(\d+):(\d+)\]\s*(.+)$/);
        if (match) {
          return {
            timeSec: parseInt(match[1], 10) * 60 + parseInt(match[2], 10),
            text: match[3].trim(),
          };
        }
        return { timeSec: i * 8, text: line.trim() };
      })
      .filter((l) => l.text.length > 0);
    onSaveCustomLyrics(track.id, lines);
    setEditingLyrics(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Player de música em tela cheia"
    >
      <div
        className="relative w-full max-w-2xl rounded-[36px] border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden"
        style={{
          background: settings.dynamicCoverColors
            ? `radial-gradient(circle at 50% 15%, ${track.accentColor}28 0%, #121212 58%, #080808 100%)`
            : '#0E0E0E',
        }}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimizar player em tela cheia"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <div className="text-center min-w-0">
            <p className="text-[10px] font-bold tracking-widest text-[#FF4FA3]">
              TOCANDO DO ARMAZENAMENTO LOCAL • {track.format}
            </p>
            <p className="text-xs text-[#A0A0A0] truncate">{track.album}</p>
          </div>

          <button
            type="button"
            onClick={() => onToggleFavorite(track.id)}
            aria-label="Favoritar música atual"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer"
          >
            <Heart
              className={`w-5 h-5 ${
                track.favorite ? 'text-[#FF4FA3] fill-[#FF4FA3]' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Sub-navigation inside Player (Capa, Letras, Equalizador, Fila, Timer) */}
        <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
          {[
            { id: 'cover', label: 'Capa', icon: null },
            { id: 'lyrics', label: 'Letras', icon: Mic2 },
            { id: 'eq', label: 'Equalizador & Som', icon: Sliders },
            { id: 'queue', label: `Fila (${queue.length})`, icon: ListMusic },
            {
              id: 'timer',
              label: sleepTimerRemainingSec
                ? `Timer (${Math.ceil(sleepTimerRemainingSec / 60)}m)`
                : 'Timer',
              icon: Timer,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id as PlayerSubTab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#FF4FA3] text-black'
                    : 'bg-white/5 text-[#A0A0A0] hover:text-white'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Central Content Area */}
        <div className="min-h-[260px] flex flex-col justify-center mb-6">
          {subTab === 'cover' && (
            <div className="flex flex-col items-center text-center space-y-5">
              <div
                className={`w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(255,79,163,0.22)] transition-transform duration-300 ${
                  isPlaying ? 'scale-100' : 'scale-95 opacity-90'
                }`}
              >
                <CoverArt
                  variant={track.coverVariant}
                  customUrl={track.customCoverUrl}
                  title={track.title}
                  artist={track.artist}
                  className="w-full h-full"
                  showVinylRing
                />
              </div>

              <div className="space-y-1 max-w-md">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {track.title}
                </h2>
                <p className="text-sm font-medium text-[#FFB6D5]">
                  {track.artist} <span aria-hidden="true">·</span>{' '}
                  <span className="text-[#A0A0A0]">{track.genre}</span>
                </p>
              </div>
            </div>
          )}

          {subTab === 'lyrics' && (
            <div className="rounded-3xl bg-[#080808]/90 border border-white/10 p-5 space-y-3 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FF4FA3]">
                  LETRAS LOCAIS SINCRONIZADAS
                </span>
                {!editingLyrics ? (
                  <button
                    type="button"
                    onClick={handleStartEditLyrics}
                    className="inline-flex items-center gap-1 text-xs text-[#FFB6D5] hover:text-white cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar Letra Local
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveLyrics}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF4FA3] text-black text-xs font-bold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Salvar
                  </button>
                )}
              </div>

              {editingLyrics ? (
                <textarea
                  value={rawLyricsText}
                  onChange={(e) => setRawLyricsText(e.target.value)}
                  rows={6}
                  className="w-full p-3 rounded-xl bg-[#121212] border border-white/10 text-xs text-white font-mono focus:border-[#FF4FA3] focus:outline-none"
                />
              ) : (
                <div className="space-y-2.5 py-2">
                  {track.lyrics.map((line, i) => {
                    const nextLine = track.lyrics[i + 1];
                    const isActiveLine =
                      currentTimeSec >= line.timeSec &&
                      (!nextLine || currentTimeSec < nextLine.timeSec);
                    return (
                      <p
                        key={i}
                        onClick={() => onSeek(line.timeSec)}
                        className={`text-sm transition-colors cursor-pointer ${
                          isActiveLine
                            ? 'text-[#FF4FA3] font-extrabold text-base'
                            : 'text-[#A0A0A0] hover:text-white'
                        }`}
                      >
                        <span className="text-[11px] font-mono-tabular opacity-60 mr-2">
                          {formatDurationClock(line.timeSec)}
                        </span>
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {subTab === 'eq' && (
            <div className="rounded-3xl bg-[#080808]/90 border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Equalizador 5 Bandas</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ equalizerEnabled: !settings.equalizerEnabled })
                    }
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer ${
                      settings.equalizerEnabled
                        ? 'bg-[#FF4FA3] text-black'
                        : 'bg-white/10 text-[#A0A0A0]'
                    }`}
                  >
                    {settings.equalizerEnabled ? 'Ativo' : 'Desativado'}
                  </button>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {Object.keys(EQ_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          equalizerPreset: preset as KamySettings['equalizerPreset'],
                          equalizerBands: [...EQ_PRESETS[preset]] as [
                            number,
                            number,
                            number,
                            number,
                            number
                          ],
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        settings.equalizerPreset === preset
                          ? 'bg-[#FF4FA3] text-black'
                          : 'bg-white/5 text-[#A0A0A0] hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Frequency Sliders */}
              <div className="grid grid-cols-5 gap-2 pt-1">
                {EQ_FREQUENCIES.map((freq, idx) => (
                  <div
                    key={freq}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#121212]"
                  >
                    <span className="text-[11px] font-mono-tabular text-[#FFB6D5]">
                      {settings.equalizerBands[idx] > 0
                        ? `+${settings.equalizerBands[idx]}dB`
                        : `${settings.equalizerBands[idx]}dB`}
                    </span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={settings.equalizerBands[idx]}
                      aria-label={`Equalizador banda ${freq} Hz`}
                      onChange={(e) => {
                        const nextBands = [...settings.equalizerBands] as [
                          number,
                          number,
                          number,
                          number,
                          number
                        ];
                        nextBands[idx] = Number(e.target.value);
                        onUpdateSettings({
                          equalizerPreset: 'Custom',
                          equalizerBands: nextBands,
                        });
                      }}
                      className="w-full kamy-slider"
                    />
                    <span className="text-[10px] font-mono-tabular text-[#A0A0A0]">
                      {freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Speed, Crossfade & Gapless */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/5">
                <div className="p-2.5 rounded-xl bg-[#121212] flex items-center justify-between">
                  <span className="text-xs text-[#A0A0A0] flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-[#FF4FA3]" /> Velocidade
                  </span>
                  <select
                    aria-label="Velocidade de reprodução"
                    value={settings.playbackSpeed}
                    onChange={(e) =>
                      onUpdateSettings({ playbackSpeed: Number(e.target.value) })
                    }
                    className="bg-transparent text-xs font-bold text-[#FFB6D5] focus:outline-none cursor-pointer"
                  >
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                      <option key={spd} value={spd} className="bg-[#121212]">
                        {spd}x
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] flex items-center justify-between">
                  <span className="text-xs text-[#A0A0A0]">Crossfade</span>
                  <select
                    aria-label="Duração do Crossfade"
                    value={settings.crossfadeSec}
                    onChange={(e) =>
                      onUpdateSettings({ crossfadeSec: Number(e.target.value) })
                    }
                    className="bg-transparent text-xs font-bold text-[#FFB6D5] focus:outline-none cursor-pointer"
                  >
                    {[0, 2, 4, 6, 8, 12].map((sec) => (
                      <option key={sec} value={sec} className="bg-[#121212]">
                        {sec === 0 ? 'Off' : `${sec}s`}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ gaplessPlayback: !settings.gaplessPlayback })
                  }
                  className="p-2.5 rounded-xl bg-[#121212] flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="text-[#A0A0A0]">Gapless</span>
                  <span className="font-bold text-[#FF4FA3]">
                    {settings.gaplessPlayback ? 'Ativo' : 'Off'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {subTab === 'queue' && (
            <div className="rounded-3xl bg-[#080808]/90 border border-white/10 p-4 max-h-64 overflow-y-auto space-y-2">
              <p className="text-xs font-bold text-[#FF4FA3] px-1">
                FILA DE REPRODUÇÃO INTELIGENTE ({queue.length} músicas)
              </p>
              {queue.map((qTrack, idx) => {
                const isCurrent = qTrack.id === track.id;
                return (
                  <div
                    key={`${qTrack.id}-${idx}`}
                    onClick={() => onSelectQueueTrack(qTrack)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer ${
                      isCurrent ? 'bg-[#FF4FA3]/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono-tabular text-[#A0A0A0] w-5">
                        {idx + 1}
                      </span>
                      <CoverArt
                        variant={qTrack.coverVariant}
                        title={qTrack.title}
                        className="w-9 h-9 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            isCurrent ? 'text-[#FF4FA3]' : 'text-white'
                          }`}
                        >
                          {qTrack.title}
                        </p>
                        <p className="text-[11px] text-[#A0A0A0] truncate">{qTrack.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono-tabular text-[#A0A0A0]">
                      {formatDurationClock(qTrack.durationSec)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {subTab === 'timer' && (
            <div className="rounded-3xl bg-[#080808]/90 border border-white/10 p-5 text-center space-y-4">
              <p className="text-xs font-bold text-[#FF4FA3]">
                TEMPORIZADOR DE SONO (SLEEP TIMER)
              </p>
              <p className="text-xs text-[#A0A0A0]">
                Interrompe automaticamente a reprodução e salva a sessão exata no banco local.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[null, 15, 30, 45, 60].map((minVal) => {
                  const active = settings.sleepTimerMinutes === minVal;
                  return (
                    <button
                      key={String(minVal)}
                      type="button"
                      onClick={() => onSetSleepTimer(minVal)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        active
                          ? 'bg-[#FF4FA3] text-black'
                          : 'bg-[#121212] text-white hover:bg-white/10'
                      }`}
                    >
                      {minVal === null ? 'Desativado' : `${minVal} min`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <input
            type="range"
            min={0}
            max={Math.max(1, effectiveDuration)}
            step={0.5}
            value={Math.min(currentTimeSec, effectiveDuration)}
            aria-label="Barra de progresso da música"
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full kamy-slider"
            style={{
              background: `linear-gradient(to right, #FF4FA3 ${
                (Math.min(currentTimeSec, effectiveDuration) /
                  Math.max(1, effectiveDuration)) *
                100
              }%, rgba(255,255,255,0.12) 0%)`,
              borderRadius: '9999px',
            }}
          />
          <div className="flex items-center justify-between text-xs font-mono-tabular text-[#A0A0A0]">
            <span>{formatDurationClock(currentTimeSec)}</span>
            <span>{formatDurationClock(effectiveDuration)}</span>
          </div>
        </div>

        {/* Main Playback Controls */}
        <div className="flex items-center justify-between max-w-sm mx-auto mb-6">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Alternar reprodução aleatória"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              shuffle ? 'text-[#FF4FA3] bg-[#FF4FA3]/15' : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            aria-label="Música anterior"
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlayPause}
            aria-label={isPlaying ? 'Pausar reprodução' : 'Iniciar reprodução'}
            className="w-16 h-16 rounded-full bg-[#FF4FA3] hover:bg-[#FF2D95] text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,79,163,0.5)] transition-transform active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Próxima música"
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label="Alternar modo de repetição"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              repeatMode !== 'off'
                ? 'text-[#FF4FA3] bg-[#FF4FA3]/15'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Volume Slider Bar */}
        <div className="flex items-center gap-3 max-w-xs mx-auto">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
            className="text-[#A0A0A0] hover:text-white cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-[#FF4FA3]" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={isMuted ? 0 : volume}
            aria-label="Controle de volume"
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full kamy-slider"
            style={{
              background: `linear-gradient(to right, #FF4FA3 ${
                Math.round((isMuted ? 0 : volume) * 100)
              }%, rgba(255,255,255,0.14) 0%)`,
              borderRadius: '9999px',
            }}
          />
          <span className="text-[11px] font-mono-tabular text-[#A0A0A0] w-9 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
