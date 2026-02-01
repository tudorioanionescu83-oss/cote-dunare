// app/api/wiki/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "").trim();

  if (!title) {
    return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });
  }

  // 1) încercăm RO summary
  const trySummary = async (lang) => {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const r = await fetch(url, { headers: { "User-Agent": "cote-dunare/1.0" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") return null;
    return {
      lang,
      title: j?.title || title,
      extract: j?.extract || "",
      url: j?.content_urls?.desktop?.page || null,
    };
  };

  let data = await trySummary("ro");
  if (!data) data = await trySummary("en");

  if (!data) {
    return NextResponse.json({ ok: true, found: false, title, extract: "" });
  }

  // 4 rânduri max (scurt)
  const lines = String(data.extract || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

  const short = lines.length > 420 ? lines.slice(0, 420).trim() + "…" : lines;

  return NextResponse.json({
    ok: true,
    found: true,
    title: data.title,
    extract: short,
    url: data.url,
    lang: data.lang,
  });
}
