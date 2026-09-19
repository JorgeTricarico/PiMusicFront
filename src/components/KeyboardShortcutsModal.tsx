import React from 'react';
import { Keyboard, X, Play, Maximize2, Volume2, Search, CornerDownLeft } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories: ShortcutCategory[] = [
    {
      title: 'Reproducción y Navegación',
      icon: <Play className="w-4 h-4 text-rose-500" />,
      shortcuts: [
        { keys: ['Espacio', 'K'], description: 'Reproducir / Pausar video o audio' },
        { keys: ['J'], description: 'Retroceder 10 segundos' },
        { keys: ['L'], description: 'Adelantar 10 segundos' },
        { keys: ['←', '→'], description: 'Saltar ±10 segundos en la línea de tiempo' },
        { keys: ['0 - 9'], description: 'Saltar al porcentaje (0% al 90%) del video' },
      ],
    },
    {
      title: 'Audio y Volumen',
      icon: <Volume2 className="w-4 h-4 text-amber-500" />,
      shortcuts: [
        { keys: ['M'], description: 'Silenciar / Restaurar sonido (Mute)' },
        { keys: ['↑'], description: 'Subir volumen un 5%' },
        { keys: ['↓'], description: 'Bajar volumen un 5%' },
        { keys: ['Rueda Ratón'], description: 'Ajustar volumen fluido sobre el reproductor' },
      ],
    },
    {
      title: 'Visualización y Pantalla',
      icon: <Maximize2 className="w-4 h-4 text-sky-500" />,
      shortcuts: [
        { keys: ['F'], description: 'Alternar Pantalla Completa' },
        { keys: ['T'], description: 'Alternar Modo Teatro (ancho expandido)' },
        { keys: ['Esc'], description: 'Salir de pantalla completa o cerrar modales' },
      ],
    },
    {
      title: 'Búsqueda Global y Accesos',
      icon: <Search className="w-4 h-4 text-emerald-500" />,
      shortcuts: [
        { keys: ['/'], description: 'Enfocar buscador de canciones en desktop' },
        { keys: ['?'], description: 'Abrir / Cerrar esta guía de atajos' },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Atajos de teclado"
      onClick={onClose}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Atajos de Teclado
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                  Estilo YouTube
                </span>
              </h2>
              <p className="text-xs text-slate-400">Control total y navegación fluida para PC y monitores</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar (Esc)"
            aria-label="Cerrar atajos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Atajos por Categoría */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          {categories.map((category) => (
            <div key={category.title} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
                {category.icon}
                <span>{category.title}</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {category.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-xs sm:text-sm"
                  >
                    <span className="text-slate-300 font-medium">{shortcut.description}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      {shortcut.keys.map((key, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 min-w-[24px] text-center font-mono text-[11px] sm:text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-lg shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pie del Modal */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">Esc</kbd> para cerrar</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
