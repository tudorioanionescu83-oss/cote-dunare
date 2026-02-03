"use client";

import React, { useMemo } from 'react';
import { getFlowInfo } from '../lib/flowCalculator';

export default function TulceaFlowWidget({ latestData, position = 'bottom-right' }) {
  const flowInfo = useMemo(() => {
    if (!latestData?.nivel_cm) return null;
    return getFlowInfo(latestData.nivel_cm);
  }, [latestData]);

  if (!flowInfo) return null;

  // Pozitionare widget
  const positionStyles = {
    'bottom-right': { bottom: 24, right: 24 },
    'bottom-left': { bottom: 24, left: 24 },
    'top-right': { top: 24, right: 24 },
    'top-left': { top: 24, left: 24 }
  };

  // Calculează înălțimea bară 3D (0-100% bazat pe nivel)
  const barHeight = Math.min(100, (flowInfo.nivel_cm / 400) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1000,
        width: 240,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 20,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${flowInfo.color}22, ${flowInfo.color}44)`,
          padding: '14px 16px',
          borderBottom: `2px solid ${flowInfo.color}`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>
          🌊 TULCEA
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
          Debit Dunăre
        </div>
      </div>

      {/* 3D Visual */}
      <div
        style={{
          padding: 16,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          height: 120,
          background: 'linear-gradient(to top, #f9fafb, #ffffff)',
        }}
      >
        {/* Bara 3D */}
        <div
          style={{
            position: 'relative',
            width: 60,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Bara verticală colorată */}
          <div
            style={{
              width: '100%',
              height: `${barHeight}%`,
              background: `linear-gradient(135deg, ${flowInfo.color}, ${flowInfo.color}dd)`,
              borderRadius: '8px 8px 4px 4px',
              boxShadow: `0 -4px 12px ${flowInfo.color}44, inset 0 -2px 8px ${flowInfo.color}66`,
              position: 'relative',
              transition: 'all 0.5s ease',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            {/* Highlight 3D */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
                borderRadius: '8px 8px 0 0',
              }}
            />
          </div>

          {/* Bază */}
          <div
            style={{
              width: '120%',
              height: 8,
              background: '#e5e7eb',
              borderRadius: 4,
              marginLeft: '-10%',
              marginTop: 4,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Nivel */}
        <div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, marginBottom: 4 }}>
            Nivel
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: '#111827' }}>
            {flowInfo.nivel_cm} cm
          </div>
        </div>

        {/* Debit */}
        <div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, marginBottom: 4 }}>
            Debit calculat
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 950, color: '#111827' }}>
              {flowInfo.debit_formatted}
            </span>
            <span style={{ fontSize: 16 }}>{flowInfo.emoji}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: 999,
            background: `${flowInfo.color}22`,
            border: `1.5px solid ${flowInfo.color}`,
            fontSize: 11,
            fontWeight: 900,
            color: flowInfo.color,
            textAlign: 'center',
          }}
        >
          {flowInfo.label}
        </div>

        {/* Data */}
        {latestData?.data && (
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
            Ultima citire: {latestData.data}
          </div>
        )}
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(1.02);
          }
        }
      `}</style>
    </div>
  );
}
