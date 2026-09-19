import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Tv,
  FileText,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  ShieldCheck,
  User,
  Radio,
  UploadCloud,
  Sparkles
} from 'lucide-react';
import {
  getAuthStatus,
  requestDeviceCode,
  pollDeviceCode,
  uploadSessionCookies,
  logoutAccount
} from '../api/client';
import type { AuthStatusResponse, DeviceCodeResponse } from '../api/client';
import { useToast } from '../context/ToastContext';

interface AccountLinkModalProps {
  onClose: () => void;
  onAuthChange: () => void;
}

export const AccountLinkModal: React.FC<AccountLinkModalProps> = ({ onClose, onAuthChange }) => {
  const [activeTab, setActiveTab] = useState<'tv' | 'cookies'>('tv');
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Estado Device Code Flow
  const [deviceData, setDeviceData] = useState<DeviceCodeResponse | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [customClientId, setCustomClientId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>('Esperando autorización...');

  // Estado Cookies
  const [cookiesInput, setCookiesInput] = useState('');
  const [savingCookies, setSavingCookies] = useState(false);

  const pollTimerRef = useRef<any>(null);
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      const s = await getAuthStatus();
      setAuthStatus(s);
    } catch {
      // Ignorar error
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Iniciar Device Code Flow
  const handleRequestDeviceCode = async () => {
    setLoadingDevice(true);
    setDeviceData(null);
    try {
      const res = await requestDeviceCode(customClientId);
      setDeviceData(res);
      if (res.status === 'ready' && res.device_code) {
        startPolling(res.device_code, res.interval || 5);
      }
    } catch {
      toast.error('Error', 'No se pudo conectar con el servicio de autenticación.');
    } finally {
      setLoadingDevice(false);
    }
  };

  const startPolling = (code: string, intervalSec: number) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setIsPolling(true);
    setPollingStatus('Esperando que ingreses el código en tu teléfono...');

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await pollDeviceCode(code, customClientId);
        if (res.status === 'success') {
          clearInterval(pollTimerRef.current);
          setIsPolling(false);
          toast.success('¡Cuenta Vinculada!', 'Tus recomendaciones oficiales de YouTube se han activado.');
          await fetchStatus();
          onAuthChange();
        } else if (res.status === 'error') {
          clearInterval(pollTimerRef.current);
          setIsPolling(false);
          setPollingStatus('El código expiró o fue cancelado.');
        }
      } catch {
        // Seguir intentando en caso de fallo transitorio
      }
    }, Math.max(3000, intervalSec * 1000));
  };

  const handleCopyCode = async () => {
    if (!deviceData?.user_code) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(deviceData.user_code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = deviceData.user_code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.info('Código copiado', 'Pégalo en la ventana de YouTube en tu navegador.');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.warning('Copia manual requerida', `Código: ${deviceData.user_code}`);
    }
  };

  const handleSaveCookies = async () => {
    if (!cookiesInput.trim()) {
      toast.error('Campo vacío', 'Pega el contenido de tu archivo cookies.txt.');
      return;
    }
    setSavingCookies(true);
    try {
      await uploadSessionCookies(cookiesInput);
      toast.success('Sesión Guardada', 'Tus cookies se han cargado correctamente.');
      setCookiesInput('');
      await fetchStatus();
      onAuthChange();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudo guardar la sesión.');
    } finally {
      setSavingCookies(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setCookiesInput(content);
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    try {
      await logoutAccount();
      toast.info('Sesión Desvinculada', 'Volviste al algoritmo privado local.');
      await fetchStatus();
      onAuthChange();
    } catch {
      toast.error('Error', 'No se pudo cerrar la sesión.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 id="account-modal-title" className="font-bold text-sm sm:text-base text-white">
                Cuenta y Recomendaciones
              </h3>
              <p className="text-[11px] text-slate-400">
                Sincroniza tu algoritmo personal de YouTube o usa el motor privado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Estado Actual de la Cuenta */}
          {loadingStatus ? (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              <span>Verificando estado de vinculación...</span>
            </div>
          ) : authStatus?.linked ? (
            /* Tarjeta de Cuenta Vinculada */
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950/60 to-slate-950/40 border border-emerald-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  {authStatus.avatar ? (
                    <img src={authStatus.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                      Cuenta Vinculada Activa
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">
                    {authStatus.name || 'Tu cuenta de YouTube'}
                  </h4>
                  <p className="text-[11px] text-slate-400">Recomendaciones del algoritmo sincronizadas</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-rose-950/60 border border-slate-700/80 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Desvincular</span>
              </button>
            </div>
          ) : (
            /* Estado Sin Vincular (Algoritmo Local Activo) */
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    Modo Algoritmo Privado Activo
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Tu música se aprende dentro de la Raspberry Pi sin enviar datos a Google
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selector de Pestañas de Vinculación si no está vinculado */}
          {!authStatus?.linked && (
            <>
              <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('tv')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'tv'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  <span>Código de TV (Fácil)</span>
                </button>
                <button
                  onClick={() => setActiveTab('cookies')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'cookies'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Archivo de Sesión</span>
                </button>
              </div>

              {/* Pestaña: Código de TV */}
              {activeTab === 'tv' && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  {!deviceData ? (
                    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-950/60 border border-slate-800 gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Vincular con Código en Pantalla</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Genera un código de 8 caracteres y autorízalo desde el navegador de tu celular como en un televisor Smart TV.
                      </p>

                      <button
                        onClick={handleRequestDeviceCode}
                        disabled={loadingDevice}
                        className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loadingDevice ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Tv className="w-4 h-4" />
                        )}
                        <span>{loadingDevice ? 'Generando código...' : 'Generar Código de Vinculación'}</span>
                      </button>
                    </div>
                  ) : deviceData.status === 'ready' ? (
                    /* Tarjeta con Código Generado */
                    <div className="flex flex-col items-center p-5 rounded-2xl bg-slate-950/80 border border-rose-500/30 gap-4 text-center">
                      <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                        Paso 1: Copia tu Código
                      </span>

                      {/* Código Gigante */}
                      <div className="flex items-center gap-3 bg-slate-900 border-2 border-dashed border-rose-500/40 rounded-2xl px-6 py-3 shadow-inner">
                        <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-white">
                          {deviceData.user_code}
                        </span>
                        <button
                          onClick={handleCopyCode}
                          className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-90"
                          title="Copiar código"
                        >
                          {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>

                      <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mt-1">
                        Paso 2: Abre el Enlace Oficial
                      </span>

                      <a
                        href={deviceData.verification_url || 'https://www.google.com/device'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        <ExternalLink className="w-4 h-4 text-rose-400" />
                        <span>Abrir {deviceData.verification_url || 'youtube.com/activate'}</span>
                      </a>

                      {/* Radar de Polling */}
                      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-500/30 px-3.5 py-2 rounded-full mt-2">
                        {isPolling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{pollingStatus}</span>
                      </div>
                    </div>
                  ) : (
                    /* Error o Configuración Necesaria */
                    <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col gap-3">
                      <div className="flex items-start gap-2 text-amber-400 text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>{deviceData.message || 'Se requiere configuración OAuth.'}</p>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-1">
                        <label className="text-[11px] text-slate-400 font-semibold">
                          Client ID de Google Cloud (Opcional):
                        </label>
                        <input
                          type="text"
                          value={customClientId}
                          onChange={(e) => setCustomClientId(e.target.value)}
                          placeholder="861556708454-...apps.googleusercontent.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-rose-500 font-mono"
                        />
                      </div>

                      <button
                        onClick={handleRequestDeviceCode}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                      >
                        Reintentar con este Client ID
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pestaña: Archivo de Sesión (Cookies) */}
              {activeTab === 'cookies' && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <UploadCloud className="w-4 h-4 text-rose-400" />
                      <span>Carga tu archivo de sesión o pega las cookies de YouTube:</span>
                    </div>

                    {/* Botón para seleccionar archivo */}
                    <label className="w-full py-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-rose-500/50 bg-slate-900/50 flex items-center justify-center gap-2 text-xs text-slate-300 cursor-pointer transition-colors">
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span>Seleccionar archivo cookies.txt</span>
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Área de texto manual */}
                    <textarea
                      value={cookiesInput}
                      onChange={(e) => setCookiesInput(e.target.value)}
                      placeholder="# Netscape HTTP Cookie File&#10;.youtube.com TRUE / FALSE ... SID ..."
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 font-mono outline-none focus:border-rose-500"
                    />

                    <button
                      onClick={handleSaveCookies}
                      disabled={savingCookies || !cookiesInput.trim()}
                      className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingCookies ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{savingCookies ? 'Guardando...' : 'Guardar Sesión'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
