import React, { useEffect, useState } from 'react';
import {
  X,
  Server,
  Cpu,
  HardDrive,
  Thermometer,
  RefreshCw,
  CheckCircle2,
  FileText,
  AlertOctagon,
  AlertTriangle,
  Info,
  Trash2,
  Copy,
  Check,
  Activity
} from 'lucide-react';
import type { TelemetryResponse, SystemLogsResponse } from '../api/client';
import {
  getBackendUrl,
  setBackendUrl,
  getTelemetry,
  getSystemLogs,
  clearSystemLogs
} from '../api/client';
import { useToast } from '../context/ToastContext';

interface SettingsModalProps {
  onClose: () => void;
  onConnectionChange: (connected: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onConnectionChange }) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'logs'>('connection');
  const [url, setUrl] = useState(getBackendUrl());
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Estados de Diagnóstico y Logs
  const [logsData, setLogsData] = useState<SystemLogsResponse | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logLevel, setLogLevel] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INFO'>('ALL');
  const [copiedReport, setCopiedReport] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  const { toast } = useToast();

  const checkConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const data = await getTelemetry();
      if (data) {
        setTelemetry(data);
        onConnectionChange(true);
        setStatusMessage('Conexión exitosa con el servidor PiMusic.');
      } else {
        onConnectionChange(false);
        setStatusMessage('No se pudo contactar al servidor. Verifica que esté en ejecución.');
      }
    } catch {
      onConnectionChange(false);
      setStatusMessage('Error de red al intentar conectar.');
    } finally {
      setTesting(false);
    }
  };

  const loadLogs = async (level = logLevel) => {
    setLoadingLogs(true);
    try {
      const data = await getSystemLogs(200, level === 'ALL' ? undefined : level);
      setLogsData(data);
    } catch (err: any) {
      console.warn('No se pudieron obtener registros:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, logLevel]);

  const handleSave = () => {
    setBackendUrl(url.trim());
    setSavedSuccess(true);
    checkConnection();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleFilterChange = (lvl: 'ALL' | 'ERROR' | 'WARNING' | 'INFO') => {
    setLogLevel(lvl);
  };

  const handleClearLogs = async () => {
    if (!confirm('¿Estás seguro de que deseas vaciar los registros del servidor?')) return;
    setClearingLogs(true);
    try {
      await clearSystemLogs();
      toast.success('Registros limpiados', 'El historial del servidor fue reiniciado.');
      await loadLogs();
    } catch (err: any) {
      toast.error('Error', err.message || 'No se pudieron limpiar los registros');
    } finally {
      setClearingLogs(false);
    }
  };

  const handleCopyReport = async () => {
    if (!logsData) return;
    const report = [
      `=== REPORTE DE DIAGNÓSTICO PIMUSIC ===`,
      `Fecha: ${new Date().toLocaleString()}`,
      `Servidor: ${telemetry?.model || 'Desconocido'}`,
      `CPU: ${telemetry?.cpu || 'N/A'} | RAM: ${telemetry?.ram || 'N/A'} | Temp: ${telemetry?.temp || 'N/A'}`,
      `Total Registros: ${logsData.total_lines} | Errores: ${logsData.error_count} | Advertencias: ${logsData.warning_count}`,
      `Archivo de Log: ${logsData.file_path} (${logsData.file_size})`,
      `\n--- ÚLTIMAS LÍNEAS DE REGISTRO ---`,
      ...logsData.logs.slice(-30)
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      setCopiedReport(true);
      toast.success('Reporte Copiado', 'Diagnóstico copiado al portapapeles para soporte.');
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      toast.error('Error', 'No se pudo copiar al portapapeles');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header con Pestañas Móviles */}
        <div className="flex flex-col border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-base text-white">Centro de Control & Diagnóstico</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex px-4 gap-2 border-t border-slate-900/60 pt-2 pb-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('connection')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'connection'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Conexión & Estado</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                activeTab === 'logs'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Diagnóstico & Registros</span>
              {logsData && logsData.error_count > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {logsData.error_count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contenido de la Pestaña */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
          {activeTab === 'connection' && (
            <>
              {/* Dirección del Backend */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Dirección del Servidor Backend (FastAPI / Raspberry Pi)
                </label>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Conexión directa a tu servidor local o Raspberry Pi (ejemplo:{' '}
                  <code className="text-rose-400 font-mono">http://localhost:5000</code> o{' '}
                  <code className="text-rose-400 font-mono">http://raspberrypi.local:5000</code>). Deja vacío para utilizar la conexión automática.
                </p>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://localhost:5000 (o vacío para auto)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-rose-500 transition-colors font-mono"
                  />
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                  >
                    Guardar
                  </button>
                </div>
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Guardado y verificado correctamente
                  </span>
                )}
              </div>

              {/* Estado de Conexión */}
              {statusMessage && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span>{statusMessage}</span>
                  <button
                    onClick={checkConnection}
                    disabled={testing}
                    className="p-1 rounded text-slate-400 hover:text-white"
                    title="Reintentar prueba"
                  >
                    <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin text-rose-500' : ''}`} />
                  </button>
                </div>
              )}

              {/* Telemetría Hardware de la Raspberry Pi */}
              {telemetry && (
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Métricas del Hardware ({telemetry.model})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-rose-400" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Uso de CPU</span>
                        <span className="text-sm font-bold text-white">{telemetry.cpu}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
                      <Thermometer className="w-5 h-5 text-amber-400" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Temperatura</span>
                        <span className="text-sm font-bold text-white">{telemetry.temp}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Memoria RAM</span>
                        <span className="text-xs font-bold text-white truncate block">{telemetry.ram}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-indigo-400" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Disco Local</span>
                        <span className="text-sm font-bold text-white">{telemetry.disk} ocupado</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'logs' && (
            <div className="flex flex-col gap-4">
              {/* Tarjetas de Resumen de Diagnóstico */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Eventos</span>
                  <span className="text-base font-bold text-white">{logsData?.total_lines || 0}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-rose-400">Errores</span>
                  <span className="text-base font-bold text-rose-500">{logsData?.error_count || 0}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-amber-400">Advertencias</span>
                  <span className="text-base font-bold text-amber-400">{logsData?.warning_count || 0}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Espacio Log</span>
                  <span className="text-base font-bold text-emerald-400">{logsData?.file_size || '0 B'}</span>
                </div>
              </div>

              {/* Barra de Filtros & Acciones de Soporte */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => handleFilterChange('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      logLevel === 'ALL' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => handleFilterChange('ERROR')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      logLevel === 'ERROR' ? 'bg-rose-600 text-white shadow' : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    <AlertOctagon className="w-3 h-3" />
                    Errores
                  </button>
                  <button
                    onClick={() => handleFilterChange('WARNING')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      logLevel === 'WARNING' ? 'bg-amber-600 text-white shadow' : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Warn
                  </button>
                  <button
                    onClick={() => handleFilterChange('INFO')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      logLevel === 'INFO' ? 'bg-blue-600 text-white shadow' : 'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    <Info className="w-3 h-3" />
                    Info
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadLogs()}
                    disabled={loadingLogs}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
                    title="Actualizar registros"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95"
                    title="Copiar reporte al portapapeles"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? '¡Copiado!' : 'Copiar'}</span>
                  </button>

                  <button
                    onClick={handleClearLogs}
                    disabled={clearingLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-semibold transition-all active:scale-95"
                    title="Vaciar archivo de registros"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Limpiar</span>
                  </button>
                </div>
              </div>

              {/* Visor de Registros Visual e Interactivo (Tipo App Console) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-[360px] overflow-y-auto font-mono text-[11px] leading-relaxed select-text space-y-1">
                {loadingLogs && !logsData && (
                  <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
                    <span>Leyendo registros del servidor...</span>
                  </div>
                )}

                {logsData && logsData.logs.length === 0 && (
                  <div className="py-8 text-center text-slate-500">
                    No hay registros disponibles para este filtro.
                  </div>
                )}

                {logsData &&
                  logsData.logs.map((logLine, idx) => {
                    const isError = logLine.includes('[ERROR]');
                    const isWarn = logLine.includes('[WARNING]');
                    const isInfo = logLine.includes('[INFO]');

                    let badgeColor = 'text-slate-400';
                    if (isError) badgeColor = 'text-rose-400 bg-rose-950/50 border border-rose-800/50';
                    else if (isWarn) badgeColor = 'text-amber-400 bg-amber-950/50 border border-amber-800/50';
                    else if (isInfo) badgeColor = 'text-blue-400';

                    return (
                      <div
                        key={idx}
                        className={`p-1 rounded transition-colors ${
                          isError ? 'bg-rose-950/30' : isWarn ? 'bg-amber-950/20' : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mr-1.5 ${badgeColor}`}>
                          {isError ? 'ERR' : isWarn ? 'WARN' : 'INFO'}
                        </span>
                        <span className={isError ? 'text-rose-200' : isWarn ? 'text-amber-200' : 'text-slate-300'}>
                          {logLine}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>Ruta en Raspberry Pi: <code className="text-slate-400">~/pi-music-cache/logs/pimusic.log</code></span>
                <span>Rotación automática activa (10MB x 5)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            PiMusic v3.0 • Hardware Local
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
