import React, { useState } from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { MusicalSummaryReport } from '../types/kamy';
import { CoverArt } from './CoverArt';
import { formatListenedHuman } from '../utils/statsEngine';

interface KamyWrappedModalProps {
  isOpen: boolean;
  userName: string;
  report: MusicalSummaryReport;
  onClose: () => void;
  onPlayTopTrack: (trackId?: string) => void;
}

export const KamyWrappedModal: React.FC<KamyWrappedModalProps> = ({
  isOpen,
  userName,
  report,
  onClose,
  onPlayTopTrack,
}) => {
  const [slide, setSlide] = useState(0);

  if (!isOpen) return null;

  const totalSlides = 4;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
      role="dialog"
      aria-modal="true"
      aria-label="KAMY Wrapped Retrospectiva Musical"
    >
      <div
        className="relative w-full max-w-md rounded-[32px] border border-[#FF4FA3]/40 p-7 shadow-[0_0_60px_rgba(255,45,149,0.25)] overflow-hidden flex flex-col justify-between min-h-[540px]"
        style={{
          background:
            'linear-gradient(155deg, #240719 0%, #080808 55%, #1D0614 100%)',
        }}
      >
        {/* Story Progress Bars */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSlide(idx)}
                aria-label={`Ir para slide ${idx + 1} do Kamy Wrapped`}
                className="h-1.5 rounded-full overflow-hidden bg-white/15 cursor-pointer"
              >
                <div
                  className={`h-full transition-all ${
                    idx <= slide ? 'w-full bg-[#FF4FA3]' : 'w-0'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#FFB6D5]">
              <Sparkles className="w-4 h-4 text-[#FF4FA3]" />
              <span>KAMY WRAPPED • RETROSPECTIVA LOCAL</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Kamy Wrapped"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Content */}
        <div className="my-auto py-6">
          {slide === 0 && (
            <div className="space-y-4 text-center">
              <p className="text-xs font-bold tracking-widest text-[#FF4FA3]">
                YOUR MUSIC. YOUR WORLD.
              </p>
              <h2 className="text-3xl font-extrabold text-white leading-tight">
                {userName}, sua trilha sonora vive com você.
              </h2>
              <div className="py-4">
                <p className="text-5xl font-extrabold font-mono-tabular text-[#FF4FA3]">
                  {report.totalMinutes} min
                </p>
                <p className="text-sm text-[#FFB6D5] mt-1">
                  ({report.totalHours} horas) de áudio efetivamente reproduzido
                </p>
              </div>
              <p className="text-xs text-[#A0A0A0] max-w-xs mx-auto">
                Calculado 100% offline a partir das suas sessões reais no banco de dados local do KAMY.
              </p>
            </div>
          )}

          {slide === 1 && (
            <div className="space-y-5 text-center">
              <p className="text-xs font-bold tracking-widest text-[#FFB6D5]">
                SUA MÚSICA NÚMERO #1
              </p>
              <div className="mx-auto w-40 h-40 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-[#FF4FA3]">
                <CoverArt
                  variant={report.topTrack?.coverVariant ?? 0}
                  title={report.topTrack?.name}
                  className="w-full h-full"
                />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-white">
                  {report.topTrack?.name || 'Starlit Reverie'}
                </h3>
                <p className="text-sm text-[#FFB6D5] mt-0.5">
                  {report.topTrack?.subtitle || 'Budiarti'}
                </p>
                <p className="text-xs font-mono-tabular text-[#A0A0A0] mt-2">
                  {formatListenedHuman(report.topTrack?.listenedMs || 0)} escutados ·{' '}
                  {report.topTrack?.playCount || 0} reproduções
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onPlayTopTrack(report.topTrack?.trackId);
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF4FA3] text-black font-bold text-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Tocar Campeã Agora</span>
              </button>
            </div>
          )}

          {slide === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-bold tracking-widest text-[#FF4FA3] text-center">
                TOP 5 ARTISTAS DO SEU MUNDO
              </p>
              <div className="space-y-2.5">
                {report.top10Artists.slice(0, 5).map((art, i) => (
                  <div
                    key={art.name}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold font-mono-tabular text-[#FF4FA3]">
                        #{i + 1}
                      </span>
                      <CoverArt
                        variant={art.coverVariant ?? i}
                        title={art.name}
                        className="w-10 h-10 rounded-xl"
                      />
                      <div>
                        <p className="text-sm font-bold text-white">{art.name}</p>
                        <p className="text-[11px] text-[#A0A0A0]">{art.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono-tabular text-[#FFB6D5]">
                      {formatListenedHuman(art.listenedMs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide === 3 && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-[#080808] border border-[#FF4FA3]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#FF4FA3]">
                    CARTÃO RESUMO • KAMY
                  </span>
                  <span className="text-[11px] font-mono-tabular text-[#A0A0A0]">
                    100% OFFLINE
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-[11px] text-[#A0A0A0]">Tempo Total</p>
                    <p className="text-lg font-extrabold font-mono-tabular text-white">
                      {report.totalMinutes} min
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#A0A0A0]">Artista Favorito</p>
                    <p className="text-lg font-extrabold text-[#FFB6D5] truncate">
                      {report.topArtist?.name || 'Budiarti'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#A0A0A0]">Música #1</p>
                    <p className="text-sm font-bold text-white truncate">
                      {report.topTrack?.name || 'Starlit Reverie'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#A0A0A0]">Gênero Favorito</p>
                    <p className="text-sm font-bold text-[#FF4FA3] truncate">
                      {report.topGenre?.name || 'R&B Alternativo'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
            disabled={slide === 0}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 disabled:opacity-30 text-xs font-semibold text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="text-xs font-mono-tabular text-[#A0A0A0]">
            {slide + 1} / {totalSlides}
          </span>

          {slide < totalSlides - 1 ? (
            <button
              type="button"
              onClick={() => setSlide((s) => Math.min(totalSlides - 1, s + 1))}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#FF4FA3] text-black text-xs font-bold cursor-pointer"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#FF4FA3] text-black text-xs font-bold cursor-pointer"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
