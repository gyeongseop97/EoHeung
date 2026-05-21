// Supabase Edge Function: kbo-sync
// 보조용 함수입니다. 브라우저 CORS를 피해서 KBO 영문 Daily Schedule 페이지를 서버에서 읽고,
// 현재 노출되는 월의 삼성 경기만 Supabase games 테이블에 upsert합니다.
// 연간 전체 자동 수집은 scripts/sync_kbo_schedule.py + GitHub Actions 방식을 권장합니다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type GameRow = {
  source_key: string;
  game_date: string;
  game_time: string | null;
  opponent: string;
  home_away: "HOME" | "AWAY" | "NEUTRAL";
  stadium: string | null;
  status: "SCHEDULED" | "FINISHED" | "POSTPONED" | "CANCELLED";
  samsung_score: number | null;
  opponent_score: number | null;
  result: "W" | "L" | "D" | null;
  source: string;
};

const TEAM_KO: Record<string, string> = {
  SAMSUNG: "삼성", LG: "LG", DOOSAN: "두산", KIWOOM: "키움", SSG: "SSG",
  LOTTE: "롯데", KIA: "KIA", KT: "KT", HANWHA: "한화", NC: "NC",
};
const STADIUM_KO: Record<string, string> = {
  DAEGU: "대구 삼성 라이온즈 파크", POHANG: "포항 야구장", JAMSIL: "잠실", SAJIK: "사직",
  MUNHAK: "문학", SUWON: "수원", GWANGJU: "광주", DAEJEON: "대전", CHANGWON: "창원", GOCHEOKSKY: "고척스카이돔",
};

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function parseGames(text: string): GameRow[] {
  const monthMatch = text.match(/(20\d{2})\.(\d{2})/);
  const year = monthMatch ? Number(monthMatch[1]) : new Date().getFullYear();
  let currentDate = "";
  const games: GameRow[] = [];
  const counts = new Map<string, number>();
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    const dateMatch = line.match(/^(\d{2})\.(\d{2})\([A-Z]{3}\)\s+(.*)$/);
    let body = line;
    if (dateMatch) {
      currentDate = `${year}-${dateMatch[1]}-${dateMatch[2]}`;
      body = dateMatch[3];
    }
    if (!currentDate) continue;
    const gameMatch = body.match(/\b(\d{1,2}:\d{2})\s+([A-Z]+)\s*(?:(\d*)\s*:\s*(\d*)|:)\s*([A-Z]+)\b/);
    if (!gameMatch) continue;
    const time = gameMatch[1];
    const away = gameMatch[2];
    const home = gameMatch[5];
    if (away !== "SAMSUNG" && home !== "SAMSUNG") continue;
    const awayScore = gameMatch[3] ? Number(gameMatch[3]) : null;
    const homeScore = gameMatch[4] ? Number(gameMatch[4]) : null;
    const after = body.slice(gameMatch.index! + gameMatch[0].length);
    const stadiumMatch = after.match(/\b(DAEGU|POHANG|JAMSIL|SAJIK|MUNHAK|SUWON|GWANGJU|DAEJEON|CHANGWON|GOCHEOKSKY)\b/);
    const status: GameRow["status"] = /POSTPONED|CANCELLED/i.test(after) ? "POSTPONED" : (awayScore !== null && homeScore !== null ? "FINISHED" : "SCHEDULED");
    const isHome = home === "SAMSUNG";
    const samsungScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;
    let result: GameRow["result"] = null;
    if (status === "FINISHED" && samsungScore !== null && opponentScore !== null) {
      result = samsungScore > opponentScore ? "W" : samsungScore < opponentScore ? "L" : "D";
    }
    const keyBase = `kbo-eng-${currentDate}-${away}-${home}`;
    const n = (counts.get(keyBase) ?? 0) + 1;
    counts.set(keyBase, n);
    const opponent = isHome ? away : home;
    games.push({
      source_key: `${keyBase}-${n}`,
      game_date: currentDate,
      game_time: `${time}:00`,
      opponent: TEAM_KO[opponent] ?? opponent,
      home_away: isHome ? "HOME" : "AWAY",
      stadium: stadiumMatch ? STADIUM_KO[stadiumMatch[1]] : null,
      status,
      samsung_score: samsungScore,
      opponent_score: opponentScore,
      result,
      source: "kbo-eng-daily-schedule",
    });
  }
  return games;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const html = await fetch("https://eng.koreabaseball.com/Schedule/DailySchedule.aspx", {
      headers: { "user-agent": "Mozilla/5.0 Samsung Lions Watch Party Manager" },
    }).then((r) => r.text());
    const games = parseGames(htmlToText(html));
    if (games.length > 0) {
      const { error } = await supabase.from("games").upsert(games, { onConflict: "source_key" });
      if (error) throw error;
    }
    return new Response(JSON.stringify({ ok: true, upserted: games.length, note: "KBO English Daily Schedule current page synced." }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
