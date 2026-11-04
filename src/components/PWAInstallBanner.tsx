import React, { useEffect, useState } from 'react';
import { Download, Smartphone, CheckCircle2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

interface PWAInstallButtonProps {
  onOpenAndroidArchitecture?: () => void;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenAndroidArchitecture,
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-[#FFB6D5]">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4FA3]" />
        <span className="whitespace-nowrap">Instalado no Dispositivo</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuide(true);
          }
        }}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-semibold text-xs transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer'
            : 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-semibold text-xs transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App / APK</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Instalar aplicativo KAMY no celular"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#121212] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FF4FA3]/15 flex items-center justify-center text-[#FF4FA3]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instalar KAMY no Celular</h3>
                  <p className="text-xs text-[#A0A0A0]">100% Offline • Android APK & PWA Standalone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Fechar guia de instalação"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A0A0A0] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#A0A0A0] leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-[#080808] border border-white/5">
                <p className="font-semibold text-white mb-1">Opção 1 — Instalação Direta (Android / Chrome / iOS)</p>
                {isIOS ? (
                  <p>
                    Toque no botão <strong>Compartilhar</strong> na barra do Safari e selecione{' '}
                    <strong>Adicionar à Tela de Início</strong> para rodar o KAMY em tela cheia 100% offline.
                  </p>
                ) : (
                  <p>
                    No menu do navegador do Android (⋮), toque em <strong>Instalar aplicativo</strong> ou{' '}
                    <strong>Adicionar à tela inicial</strong>. O banco SQLite/IndexedDB e o Service Worker já estão ativos para uso sem internet.
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#080808] border border-[#FF4FA3]/25">
                <p className="font-semibold text-[#FFB6D5] mb-1">
                  Opção 2 — Código-Fonte Android Nativo (Kotlin + Room + Media3 ExoPlayer)
                </p>
                <p>
                  O projeto Android nativo completo (Kotlin, Jetpack Compose, Room Database com Migrations e Media3 ExoPlayer em segundo plano) está incluído para compilação do APK via Android Studio / Gradle.
                </p>
                {onOpenAndroidArchitecture && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowGuide(false);
                      onOpenAndroidArchitecture();
                    }}
                    className="mt-3 w-full py-2.5 px-4 rounded-xl bg-[#FF4FA3] hover:bg-[#FF2D95] text-black font-bold text-xs transition-colors cursor-pointer"
                  >
                    Abrir Projeto Android Kotlin & Baixar Código
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
