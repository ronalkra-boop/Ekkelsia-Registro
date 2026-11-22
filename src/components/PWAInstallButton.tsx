import React, { useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Modal } from './Modal';

interface PWAInstallButtonProps {
  variant?: 'topbar' | 'sidebar';
}

export function PWAInstallButton({ variant = 'topbar' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap"
        >
          {isInstallable ? <Download className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
          <span>Instalar en celular / PC</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleClick()}
          aria-label="Instalar aplicación en el dispositivo"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          {isInstallable ? <Download className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Instalar app</span>
        </button>
      )}

      <Modal
        open={showGuide}
        title="Instalar Ekklesia Registro en tu celular"
        subtitle="Acceso directo en tu pantalla de inicio a pantalla completa y con caché rápida."
        onClose={() => setShowGuide(false)}
        size="md"
      >
        <div className="space-y-4 text-sm text-slate-700">
          {isIOS ? (
            <div className="space-y-2.5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-900 flex items-center gap-2">
                <Share className="w-4 h-4 text-blue-900" />
                En iPhone o iPad (Safari)
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed text-slate-600">
                <li>
                  Abre el enlace de la aplicación en <strong>Safari</strong>.
                </li>
                <li>
                  Toca el botón <strong>Compartir</strong> (cuadro con flecha hacia arriba en la barra inferior).
                </li>
                <li>
                  Desliza y selecciona <strong>Agregar a inicio</strong>.
                </li>
                <li>
                  Pulsa <strong>Agregar</strong> en la esquina superior derecha.
                </li>
              </ol>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-semibold text-slate-900">En Android (Google Chrome)</p>
                <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed text-slate-600">
                  <li>
                    Abre la aplicación directamente en <strong>Chrome</strong> (fuera de vista previa).
                  </li>
                  <li>
                    Toca el menú <strong>⋮</strong> (arriba a la derecha) y elige{' '}
                    <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
                  </li>
                </ol>
              </div>

              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-semibold text-slate-900">En iPhone / iPad (Safari)</p>
                <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed text-slate-600">
                  <li>
                    Abre el enlace en <strong>Safari</strong> y pulsa el botón <strong>Compartir</strong>.
                  </li>
                  <li>
                    Selecciona <strong>Agregar a inicio</strong> y confirma.
                  </li>
                </ol>
              </div>
            </>
          )}

          <p className="text-xs text-slate-500">
            Una vez instalada, se abrirá como una app independiente con el ícono de Ekklesia Registro y mantendrá sincronizados tus datos en tiempo real al conectar con Google.
          </p>

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md"
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
