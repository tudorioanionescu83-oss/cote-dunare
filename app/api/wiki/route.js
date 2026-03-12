// app/api/wiki/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "").trim();

  if (!title) {
    return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });
  }

  const trySummary = async (lang) => {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetch(url, { headers: { "User-Agent": "cote-dunare/1.0" } });
    if (!response.ok) return null;

    const payload = await response.json();
    if (payload?.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") return null;

    return {
      lang,
      title: payload?.title || title,
      extract: payload?.extract || "",
      url: payload?.content_urls?.desktop?.page || null,
      image: payload?.thumbnail?.source || payload?.originalimage?.source || null,
    };
  };

  let data = await trySummary("ro");
  if (!data) data = await trySummary("en");

  if (!data) {
    return NextResponse.json({ ok: true, found: false, title, extract: "", image: null });
  }

  const lines = String(data.extract || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");

  const short = lines.length > 420 ? `${lines.slice(0, 420).trim()}...` : lines;

  return NextResponse.json({
    ok: true,
    found: true,
    title: data.title,
    extract: short,
    url: data.url,
    lang: data.lang,
    image: data.image,
  });
}
