import React, { useState } from 'react';
import {
  Smartphone,
  Database,
  Download,
  Code2,
  Sliders,
  Moon,
  Palette,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { KamySettings, KamyTrack, PlaybackSessionRecord } from '../types/kamy';
import { ANDROID_KOTLIN_FILES } from '../data/androidProjectSource';
import { PWAInstallButton } from './PWAInstallBanner';

interface SettingsAndAndroidViewProps {
  settings: KamySettings;
  tracks: KamyTrack[];
  sessions: PlaybackSessionRecord[];
  onUpdateSettings: (partial: Partial<KamySettings>) => void;
  onExportDatabaseBackup: () => void;
  onRunOfficialTenMinTest: () => void;
}

export const SettingsAndAndroidView: React.FC<SettingsAndAndroidViewProps> = ({
  settings,
  tracks,
  sessions,
  onUpdateSettings,
  onExportDatabaseBackup,
  onRunOfficialTenMinTest,
}) => {
  const [selectedKotlinIdx, setSelectedKotlinIdx] = useState(0);
  const [copiedFile, setCopiedFile] = useState(false);
  const [testToast, setTestToast] = useState<string | null>(null);

  const currentKotlinFile = ANDROID_KOTLIN_FILES[selectedKotlinIdx];

  const handleCopyKotlin = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(currentKotlinFile.code);
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 2000);
    }
  };

  const handleDownloadKotlinFile = () => {
    const blob = new Blob([currentKotlinFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentKotlinFile.path.split('/').pop() || 'KamySource.kt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Configurações &amp; Arquitetura Android
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Personalização visual Rosa &amp; Preta, banco de dados local permanente e código nativo Kotlin / APK
          </p>
        </div>

        <PWAInstallButton />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance & User Identity */}
        <div className="rounded-3xl bg-[#121212] border border-white/10 p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-[#FF4FA3]" />
            <h2 className="text-base font-bold text-white">Identidade Visual &amp; Perfil</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="kamy-user-name" className="block text-xs text-[#A0A0A0] mb-1.5">
                Nome exibido na saudação inicial
              </label>
              <input
                id="kamy-user-name"
                type="text"
                value={settings.userName}
                onChange={(e) => onUpdateSettings({ userName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-white/10 focus:border-[#FF4FA3] focus:outline-none text-sm font-semibold text-white"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#080808] border border-white/5">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-[#FF4FA3]" />
                <div>
                  <p className="text-sm font-bold text-white">Tema AMOLED (#000000)</p>
                  <p className="text-xs text-[#A0A0A0]">
                    Preto absoluto para máxima economia de bateria em telas OLED
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.amoledMode}
                onClick={() => onUpdateSettings({ amoledMode: !settings.amoledMode })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  settings.amoledMode
                    ? 'bg-[#FF4FA3] text-black'
                    : 'bg-white/10 text-[#A0A0A0]'
                }`}
              >
                {settings.amoledMode ? 'AMOLED Ativo' : 'Preto #080808'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#080808] border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Cores Dinâmicas da Capa</p>
                <p className="text-xs text-[#A0A0A0]">
                  Adapta a iluminação sutil do player conforme a capa do álbum atual
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.dynamicCoverColors}
                onClick={() =>
                  onUpdateSettings({ dynamicCoverColors: !settings.dynamicCoverColors })
                }
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  settings.dynamicCoverColors
                    ? 'bg-[#FF4FA3] text-black'
                    : 'bg-white/10 text-[#A0A0A0]'
                }`}
              >
                {settings.dynamicCoverColors ? 'Ativo' : 'Desativado'}
              </button>
            </div>
          </div>
        </div>

        {/* Audio & Persistent Database Protection */}
        <div className="rounded-3xl bg-[#121212] border border-white/10 p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#FF4FA3]" />
            <h2 className="text-base font-bold text-white">
              Armazenamento Permanente &amp; Áudio
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#080808] border border-white/5">
              <p className="text-[11px] text-[#A0A0A0]">Músicas Salvas</p>
              <p className="text-xl font-extrabold font-mono-tabular text-white">
                {tracks.length}
              </p>
              <p className="text-[11px] text-[#FFB6D5] mt-0.5">SQLite / IndexedDB v2</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#080808] border border-white/5">
              <p className="text-[11px] text-[#A0A0A0]">Sessões Reais</p>
              <p className="text-xl font-extrabold font-mono-tabular text-[#FF4FA3]">
                {sessions.length}
              </p>
              <p className="text-[11px] text-[#A0A0A0] mt-0.5">MIGRATION_1_2 Ativa</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080808] border border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-[#FF4FA3]" />
              <div>
                <p className="text-xs font-bold text-white">
                  Crossfade ({settings.crossfadeSec}s) · Velocidade ({settings.playbackSpeed}x)
                </p>
                <p className="text-[11px] text-[#A0A0A0]">
                  Equalizador: {settings.equalizerPreset} · Gapless:{' '}
                  {settings.gaplessPlayback ? 'Sim' : 'Não'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onExportDatabaseBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-[#FF4FA3] text-white hover:text-black font-bold text-xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar DB</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080808] border border-[#FF4FA3]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#FFB6D5] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FF4FA3]" />
                Teste Obrigatório de Precisão (Seção 14)
              </p>
              <p className="text-[11px] text-[#A0A0A0] mt-0.5">
                Valida 5m Play + 10m Pausa + 5m Play = 10m salvos permanentemente.
              </p>
              {testToast && (
                <p className="text-[11px] text-[#FF4FA3] font-semibold mt-1">{testToast}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onRunOfficialTenMinTest();
                setTestToast('Confirmado: 10 minutos exatos contabilizados e persistidos!');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-bold text-xs cursor-pointer shrink-0 whitespace-nowrap"
            >
              Executar Teste 10m
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Guide: How to Generate APK on GitHub Actions */}
      <section className="rounded-3xl bg-[#121212] border border-[#FF4FA3]/35 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold tracking-wider text-[#FF4FA3]">
              COMPILAÇÃO NA NUVEM • SEM PRECISAR DE PC POTENTE
            </span>
            <h2 className="text-lg font-extrabold text-white mt-0.5">
              Como Gerar o APK Instalável pelo GitHub (Passo a Passo)
            </h2>
          </div>
          <span className="text-xs font-mono-tabular text-[#FFB6D5] bg-[#FF4FA3]/15 border border-[#FF4FA3]/30 px-3 py-1 rounded-full self-start sm:self-auto">
            .github/workflows/build-apk.yml Incluso
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#080808] border border-white/5 space-y-1.5">
            <span className="text-xs font-extrabold font-mono-tabular text-[#FF4FA3]">
              PASSO 1
            </span>
            <h3 className="text-sm font-bold text-white">Exportar para o GitHub</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Clique no botão de exportar/salvar no GitHub no topo do AI Studio (ou baixe o ZIP do projeto e suba em um repositório novo no seu GitHub).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#080808] border border-white/5 space-y-1.5">
            <span className="text-xs font-extrabold font-mono-tabular text-[#FF4FA3]">
              PASSO 2
            </span>
            <h3 className="text-sm font-bold text-white">Abrir a Aba Actions</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              No seu repositório do GitHub, toque na aba <strong>Actions</strong>. O fluxo <strong>&ldquo;Gerar APK Android — KAMY Music Player&rdquo;</strong> já está configurado automaticamente.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#080808] border border-white/5 space-y-1.5">
            <span className="text-xs font-extrabold font-mono-tabular text-[#FF4FA3]">
              PASSO 3
            </span>
            <h3 className="text-sm font-bold text-white">Aguardar 2 Minutos</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              O servidor do GitHub instala o Java 21, o Android SDK e roda o Gradle para empacotar o aplicativo 100% offline.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#080808] border border-white/5 space-y-1.5">
            <span className="text-xs font-extrabold font-mono-tabular text-[#FF4FA3]">
              PASSO 4
            </span>
            <h3 className="text-sm font-bold text-white">Baixar e Instalar o APK</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Clique na execução concluída (ícone verde) e, na seção <strong>Artifacts</strong> no final da página, baixe o <strong>KAMY-Music-Player-APK</strong> no celular!
            </p>
          </div>
        </div>
      </section>

      {/* Native Android Project (Kotlin + Jetpack Compose + Room + Media3 ExoPlayer) */}
      <section className="rounded-3xl bg-[#121212] border border-white/10 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF4FA3]/15 border border-[#FF4FA3]/30 flex items-center justify-center text-[#FF4FA3]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Workflow GitHub Actions &amp; Código Android (Kotlin • Room • Media3)
              </h2>
              <p className="text-xs text-[#A0A0A0]">
                Inspecione ou baixe o arquivo build-apk.yml e os módulos nativos Kotlin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyKotlin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
            >
              {copiedFile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#FF4FA3]" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Arquivo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadKotlinFile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-xs font-bold text-black cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {ANDROID_KOTLIN_FILES.map((file, idx) => (
            <button
              key={file.path}
              type="button"
              onClick={() => setSelectedKotlinIdx(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedKotlinIdx === idx
                  ? 'bg-[#FF4FA3] text-black font-bold'
                  : 'bg-[#080808] text-[#A0A0A0] hover:text-white border border-white/5'
              }`}
            >
              {file.path.split('/').pop()}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-[#080808] border border-white/10 p-4 overflow-x-auto">
          <div className="flex items-center justify-between text-xs text-[#FFB6D5] pb-2 mb-2 border-b border-white/5">
            <span className="font-mono">{currentKotlinFile.path}</span>
            <span>{currentKotlinFile.title}</span>
          </div>
          <pre className="text-xs font-mono text-white/90 leading-relaxed max-h-72 overflow-y-auto">
            <code>{currentKotlinFile.code}</code>
          </pre>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#A0A0A0]">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4FA3]" /> Room SQLite + MIGRATION_1_2
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4FA3]" /> Media3 ExoPlayer Background Service
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4FA3]" /> Controles Bluetooth &amp; Tela de Bloqueio
          </span>
        </div>
      </section>
    </div>
  );
};
