/**
 * Utilidades de métricas de red y estimación de tiempos de descarga
 * Calculado para transferencias en Red Local (Wi-Fi 2.4/5GHz), Ethernet o Tailscale VPN
 */

export interface DownloadEstimate {
  secondsMin: number;
  secondsMax: number;
  secondsAvg: number;
  formattedTime: string;
  speedDescription: string;
  sizeMb: number;
  formattedSize: string;
  speedMbps: number;
}

/**
 * Parsea cadenas como '~45 MB', '~1.2 GB', '350 KB' o números en MB o bytes a un valor numérico en Megabytes (MB).
 */
export function parseSizeToMb(size: string | number | undefined | null): number {
  if (size === undefined || size === null) return 0;
  if (typeof size === 'number') {
    // Si es un número grande (> 100_000), asumimos que son bytes
    if (size > 100_000) {
      return Number((size / (1024 * 1024)).toFixed(2));
    }
    return Number(size.toFixed(2));
  }

  const clean = size.trim().toLowerCase();
  if (clean.includes('gb')) {
    const val = parseFloat(clean.replace(/[^0-9.]/g, ''));
    return isNaN(val) ? 0 : Number((val * 1024).toFixed(2));
  }
  if (clean.includes('kb')) {
    const val = parseFloat(clean.replace(/[^0-9.]/g, ''));
    return isNaN(val) ? 0 : Number((val / 1024).toFixed(2));
  }

  const val = parseFloat(clean.replace(/[^0-9.]/g, ''));
  return isNaN(val) ? 0 : Number(val.toFixed(2));
}

/**
 * Detecta la velocidad de red disponible o estima una media para red local/Wi-Fi
 */
export function detectNetworkSpeedMbps(): { speedMbps: number; description: string } {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn && typeof conn.downlink === 'number' && conn.downlink > 0) {
      // downlink viene en Mbps
      const detected = Math.round(conn.downlink * 8); // Ajuste a throughput real de carga
      const clamped = Math.min(Math.max(detected, 20), 100);
      return {
        speedMbps: clamped,
        description: `Conexión detectada (~${clamped} Mbps)`
      };
    }
  }
  // Estimado estándar en red local Wi-Fi con Raspberry Pi
  return {
    speedMbps: 35,
    description: 'Wi-Fi local / Tailscale (~25-50 Mbps)'
  };
}

/**
 * Formatea segundos a texto amigable en español
 */
export function formatDurationEstimate(secMin: number, secMax: number, context: string = 'en Wi-Fi'): string {
  if (secMax <= 2) {
    return `Menos de 2 seg ${context}`;
  }

  if (secMax < 60) {
    if (secMin === secMax) {
      return `Aprox. ${secMin} seg ${context}`;
    }
    return `Aprox. ${secMin} a ${secMax} seg ${context}`;
  }

  const minMin = Math.floor(secMin / 60);
  const minMax = Math.ceil(secMax / 60);

  if (minMin === minMax || minMin === 0) {
    return `Aprox. ${minMax} min ${context}`;
  }
  return `Aprox. ${minMin} a ${minMax} min ${context}`;
}

/**
 * Calcula la estimación de descarga dado un tamaño y una velocidad opcional
 * @param sizeBytesOrMb Tamaño en MB o bytes o cadena formateada (ej. '~45 MB')
 * @param speedMbps Velocidad en Mbps (opcional, por defecto detectada o 35 Mbps)
 */
export function getDownloadEstimate(
  sizeBytesOrMb: number | string,
  speedMbps?: number
): DownloadEstimate {
  const sizeMb = parseSizeToMb(sizeBytesOrMb);
  const netInfo = detectNetworkSpeedMbps();
  const effectiveSpeed = speedMbps && speedMbps > 0 ? speedMbps : netInfo.speedMbps;

  // Tamaño en Megabits = MB * 8
  const totalMegabits = sizeMb * 8;

  // Calculamos rango considerando variación de señal Wi-Fi (±25%)
  const speedHigh = effectiveSpeed * 1.25;
  const speedLow = Math.max(effectiveSpeed * 0.75, 5);

  const secondsMin = Math.max(1, Math.round(totalMegabits / speedHigh));
  const secondsMax = Math.max(secondsMin, Math.round(totalMegabits / speedLow));
  const secondsAvg = Math.round((secondsMin + secondsMax) / 2);

  const formattedTime = sizeMb <= 0
    ? 'Calculando...'
    : formatDurationEstimate(secondsMin, secondsMax, 'en Wi-Fi');

  const formattedSize = sizeMb >= 1024
    ? `${(sizeMb / 1024).toFixed(2)} GB`
    : `${sizeMb.toFixed(1)} MB`;

  return {
    secondsMin,
    secondsMax,
    secondsAvg,
    formattedTime,
    speedDescription: netInfo.description,
    sizeMb,
    formattedSize,
    speedMbps: effectiveSpeed
  };
}
