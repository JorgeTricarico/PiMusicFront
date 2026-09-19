import { describe, it, expect } from 'vitest';
import {
  parseSizeToMb,
  detectNetworkSpeedMbps,
  formatDurationEstimate,
  getDownloadEstimate,
} from '../downloadMetrics';

describe('Download Metrics & Formatters Unit Tests', () => {
  describe('parseSizeToMb', () => {
    it('debe retornar 0 para valores nulos, undefined o cadenas vacías', () => {
      expect(parseSizeToMb(null)).toBe(0);
      expect(parseSizeToMb(undefined)).toBe(0);
      expect(parseSizeToMb('')).toBe(0);
    });

    it('debe interpretar números pequeños como MB y grandes como Bytes', () => {
      expect(parseSizeToMb(45.5)).toBe(45.5);
      // 104,857,600 bytes = 100 MB
      expect(parseSizeToMb(104857600)).toBe(100);
    });

    it('debe parsear cadenas de GB convirtiéndolas a MB (* 1024)', () => {
      expect(parseSizeToMb('1.5 GB')).toBe(1536);
      expect(parseSizeToMb('~1.2 GB')).toBe(1228.8);
    });

    it('debe parsear cadenas de KB convirtiéndolas a MB (/ 1024)', () => {
      expect(parseSizeToMb('512 KB')).toBe(0.5);
      expect(parseSizeToMb('~1024 KB')).toBe(1);
    });

    it('debe parsear cadenas regulares de MB', () => {
      expect(parseSizeToMb('~48 MB')).toBe(48);
      expect(parseSizeToMb('32.4 MB')).toBe(32.4);
    });
  });

  describe('detectNetworkSpeedMbps', () => {
    it('debe devolver valor estimado por defecto (35 Mbps) si no existe navigator.connection', () => {
      const res = detectNetworkSpeedMbps();
      expect(res.speedMbps).toBe(35);
      expect(res.description).toContain('Wi-Fi local');
    });

    it('debe calcular velocidad limitada (clamped) cuando navigator.connection está disponible', () => {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { downlink: 10 } // 10 * 8 = 80 Mbps
      });

      const res = detectNetworkSpeedMbps();
      expect(res.speedMbps).toBe(80);
      expect(res.description).toContain('80 Mbps');

      // Limpieza de navigator.connection
      delete (navigator as any).connection;
    });
  });

  describe('formatDurationEstimate', () => {
    it('debe devolver "Menos de 2 seg" cuando el tiempo máximo es menor o igual a 2', () => {
      expect(formatDurationEstimate(1, 2, 'en Wi-Fi')).toBe('Menos de 2 seg en Wi-Fi');
    });

    it('debe dar formato en segundos para duraciones menores a un minuto', () => {
      expect(formatDurationEstimate(10, 10, 'en Wi-Fi')).toBe('Aprox. 10 seg en Wi-Fi');
      expect(formatDurationEstimate(5, 12, 'en Wi-Fi')).toBe('Aprox. 5 a 12 seg en Wi-Fi');
    });

    it('debe dar formato en minutos para duraciones superiores a 60 segundos', () => {
      expect(formatDurationEstimate(60, 120, 'en Wi-Fi')).toBe('Aprox. 1 a 2 min en Wi-Fi');
      expect(formatDurationEstimate(120, 120, 'en Wi-Fi')).toBe('Aprox. 2 min en Wi-Fi');
    });
  });

  describe('getDownloadEstimate', () => {
    it('debe devolver "Calculando..." cuando el tamaño sea 0 o inválido', () => {
      const estimate = getDownloadEstimate(0);
      expect(estimate.formattedTime).toBe('Calculando...');
      expect(estimate.sizeMb).toBe(0);
    });

    it('debe calcular rango de segundos y tamaños formateados correctamente', () => {
      const estimate = getDownloadEstimate('~100 MB', 40);
      expect(estimate.sizeMb).toBe(100);
      expect(estimate.formattedSize).toBe('100.0 MB');
      expect(estimate.speedMbps).toBe(40);
      expect(estimate.secondsMin).toBeGreaterThan(0);
      expect(estimate.secondsMax).toBeGreaterThanOrEqual(estimate.secondsMin);
      expect(estimate.secondsAvg).toBe(Math.round((estimate.secondsMin + estimate.secondsMax) / 2));
    });
  });
});
