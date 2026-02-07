"use client";
import React from "react";
import dynamic from "next/dynamic";
const LeafletMapInner = dynamic(() => import("./_LeafletMapInner.jsx"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: 420,
        borderRadius: 16,
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(0,119,182,0.14)",
        boxShadow: "0 12px 34px rgba(0,60,90,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(0,45,70,0.65)",
        fontWeight: 800,
      }}
    >
      Încarc harta...
    </div>
  ),
});
export default function MapView(props) {
  return <LeafletMapInner {...props} />;
}
