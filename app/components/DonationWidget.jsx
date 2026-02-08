"use client";

import React, { useState, useEffect } from "react";

export default function DonationWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copied, setCopied] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration - așteaptă mount-ul
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // COMPLETEAZĂ CU DATELE TALE:
  const bankDetails = {
    name: "Tudor IONESCU",
    iban: "RO86BREL0002005296230101",
    bank: "Libra Internet Bank",
  };
  const email = "tudor.ionescu@sturgeons.eu";

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <>
      <style>{`
        @keyframes pulse-btn {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 6px 30px rgba(245, 158, 11, 0.6); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(8deg); }
          60% { transform: rotate(-5deg); }
          80% { transform: rotate(5deg); }
        }
        @keyframes float-in {
          from { opacity: 0; transform: translateY(-20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          10% { transform: scale(1.2); }
          20% { transform: scale(1); }
          30% { transform: scale(1.2); }
          50% { transform: scale(1); }
        }
        @keyframes coin-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .donation-trigger {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 9998;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 10px 14px 8px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          border-radius: 14px;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
          animation: pulse-btn 2s ease-in-out infinite, float-in 0.5s ease-out;
          transition: all 0.3s ease;
        }
        .donation-trigger:hover {
          animation: none;
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(245, 158, 11, 0.6);
        }
        .donation-trigger-icon {
          font-size: 22px;
          animation: wiggle 2s ease-in-out infinite;
        }
        .donation-trigger:hover .donation-trigger-icon {
          animation: wiggle 0.4s ease-in-out infinite;
        }
        .donation-trigger-text {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .donation-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: float-in 0.3s ease-out;
        }
        .donation-modal {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-radius: 24px;
          max-width: 400px;
          width: 100%;
          overflow: hidden;
          border: 2px solid rgba(245, 158, 11, 0.3);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(245, 158, 11, 0.15);
          animation: float-in 0.4s ease-out;
        }
        .donation-header {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          padding: 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .donation-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2.5s infinite;
        }
        .donation-heart {
          font-size: 50px;
          display: inline-block;
          animation: heartbeat 1.5s ease-in-out infinite;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        .donation-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0,0,0,0.25);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
          color: white;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 1;
        }
        .donation-close:hover {
          background: rgba(0,0,0,0.5);
          transform: scale(1.1) rotate(90deg);
        }
        .copy-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 10px;
          transition: all 0.2s;
        }
        .copy-row:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .copy-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          color: white;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .copy-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }
        .copy-btn.copied {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        .coin-icon {
          display: inline-block;
          animation: coin-spin 3s linear infinite;
          font-size: 32px;
        }
        @media (max-width: 500px) {
          .donation-trigger {
            top: 12px;
            right: 12px;
            padding: 8px 10px 6px;
          }
          .donation-trigger-icon {
            font-size: 18px;
          }
          .donation-trigger-text {
            font-size: 7px;
          }
          .donation-modal {
            margin: 10px;
          }
        }
      `}</style>

      {/* Buton principal - mână cu text DONEAZĂ dedesubt */}
      {isMounted && (
        <button className="donation-trigger" onClick={() => setIsOpen(true)}>
          <span className="donation-trigger-icon">👆</span>
          <span className="donation-trigger-text">DONEAZĂ</span>
        </button>
      )}

      {/* Modal principal */}
      {isMounted && isOpen && !showBankDetails && (
        <div className="donation-overlay" onClick={() => setIsOpen(false)}>
          <div className="donation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="donation-header">
              <button className="donation-close" onClick={() => setIsOpen(false)}>✕</button>
              <div className="donation-heart">💙</div>
              <h2 style={{ 
                fontSize: 22, 
                fontWeight: 900, 
                color: "white", 
                margin: "12px 0 0 0",
                position: "relative",
                textShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}>
                Contribuie la Proiect
              </h2>
            </div>
            
            <div style={{ padding: "20px 24px 24px" }}>
              <p style={{ 
                fontSize: 15, 
                color: "#e2e8f0", 
                lineHeight: 1.7,
                marginBottom: 16,
                textAlign: "center",
              }}>
                Prima platformă hidrologică interactivă din România, dedicată 
                <strong style={{ color: "#38bdf8" }}> iubitorilor de natură</strong>, 
                <strong style={{ color: "#22c55e" }}> pasionaților de pescuit</strong> și 
                <strong style={{ color: "#fbbf24" }}> comunităților riverane</strong>.
              </p>
              
              <p style={{ 
                fontSize: 13, 
                color: "#94a3b8", 
                lineHeight: 1.7,
                marginBottom: 20,
                textAlign: "center",
              }}>
                Cu contribuția ta, putem menține platforma <strong style={{ color: "#10b981" }}>GRATUITĂ</strong> și 
                să adăugăm funcții noi pentru o experiență și mai bună!
              </p>

              <div style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))",
                border: "2px solid rgba(245, 158, 11, 0.4)",
                borderRadius: 16,
                padding: "20px 16px",
                textAlign: "center",
                marginBottom: 20,
              }}>
                <p style={{ 
                  fontSize: 15, 
                  color: "#e2e8f0", 
                  fontWeight: 600,
                  margin: "0 0 12px 0",
                }}>
                  Împreună putem îmbunătăți experiența!
                </p>
                <div style={{ 
                  fontSize: 24, 
                  color: "#fbbf24", 
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  textShadow: "0 2px 10px rgba(251, 191, 36, 0.4)",
                }}>
                  <span style={{ fontSize: 32 }}>🦁</span>
                  <span className="coin-icon">🪙</span>
                  <span style={{ fontSize: 32 }}>🦁</span>
                </div>
              </div>

              <button
                onClick={() => setShowBankDetails(true)}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  borderRadius: 14,
                  color: "white",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 30px rgba(245, 158, 11, 0.5)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(245, 158, 11, 0.4)";
                }}
              >
                <span style={{ fontSize: 20 }}>💳</span>
                <span>Contribuie acum!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalii bancare */}
      {isMounted && isOpen && showBankDetails && (
        <div className="donation-overlay" onClick={() => { setIsOpen(false); setShowBankDetails(false); }}>
          <div className="donation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="donation-header" style={{ padding: "20px 24px" }}>
              <button 
                className="donation-close" 
                onClick={() => { setIsOpen(false); setShowBankDetails(false); }}
              >
                ✕
              </button>
              <div style={{ fontSize: 36 }}>🏦</div>
              <h2 style={{ 
                fontSize: 20, 
                fontWeight: 900, 
                color: "white", 
                margin: "8px 0 0 0",
                position: "relative",
              }}>
                Detalii Transfer Bancar
              </h2>
            </div>
            
            <div style={{ padding: "20px 20px 24px" }}>
              {/* Nume */}
              <div className="copy-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>BENEFICIAR</div>
                  <div style={{ fontSize: 14, color: "white", fontWeight: 700 }}>{bankDetails.name}</div>
                </div>
                <button 
                  className={`copy-btn ${copied === 'name' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(bankDetails.name, 'name')}
                >
                  {copied === 'name' ? '✓ Copiat!' : '📋 Copiază'}
                </button>
              </div>

              {/* IBAN */}
              <div className="copy-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>IBAN</div>
                  <div style={{ 
                    fontSize: 13, 
                    color: "#fbbf24", 
                    fontWeight: 700, 
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}>
                    {bankDetails.iban}
                  </div>
                </div>
                <button 
                  className={`copy-btn ${copied === 'iban' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(bankDetails.iban, 'iban')}
                >
                  {copied === 'iban' ? '✓ Copiat!' : '📋 Copiază'}
                </button>
              </div>

              {/* Banca */}
              <div className="copy-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>BANCA</div>
                  <div style={{ fontSize: 14, color: "white", fontWeight: 700 }}>{bankDetails.bank}</div>
                </div>
                <button 
                  className={`copy-btn ${copied === 'bank' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(bankDetails.bank, 'bank')}
                >
                  {copied === 'bank' ? '✓ Copiat!' : '📋 Copiază'}
                </button>
              </div>

              {/* Divider */}
              <div style={{ 
                height: 1, 
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                margin: "16px 0",
              }} />

              {/* Contact */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>📧 CONTACT</div>
                <div 
                  onClick={() => copyToClipboard(email, 'email')}
                  style={{ 
                    fontSize: 14, 
                    color: "#38bdf8", 
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "8px 16px",
                    background: "rgba(56, 189, 248, 0.1)",
                    borderRadius: 8,
                    display: "inline-block",
                    transition: "all 0.2s",
                  }}
                >
                  {copied === 'email' ? '✓ Copiat!' : email}
                </div>
              </div>

              {/* Mulțumire */}
              <div style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🙏</div>
                <div style={{ fontSize: 14, color: "#10b981", fontWeight: 700 }}>
                  Mulțumim pentru susținere!
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                  Fiecare contribuție contează enorm!
                </div>
              </div>

              {/* Buton înapoi */}
              <button
                onClick={() => setShowBankDetails(false)}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: "12px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
              >
                ← Înapoi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
