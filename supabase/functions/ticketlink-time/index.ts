const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

const TICKETLINK_URL = 'https://www.ticketlink.co.kr/';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

async function fetchTicketlinkDate(method: 'HEAD' | 'GET') {
  const started = Date.now();
  const response = await fetch(`${TICKETLINK_URL}?_eoheung_time=${started}`, {
    method,
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'accept': method === 'HEAD' ? '*/*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
    },
  });
  const ended = Date.now();
  const dateHeader = response.headers.get('date');
  const serverMs = dateHeader ? Date.parse(dateHeader) : NaN;

  return {
    ok: response.ok,
    status: response.status,
    method,
    dateHeader,
    serverMs,
    ticketlinkRtt: ended - started,
    fetchedAt: new Date(ended).toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    let result = await fetchTicketlinkDate('HEAD');

    if (!Number.isFinite(result.serverMs)) {
      result = await fetchTicketlinkDate('GET');
    }

    if (!Number.isFinite(result.serverMs)) {
      return json(
        {
          ok: false,
          error: 'Ticketlink Date header not available',
          ticketlinkStatus: result.status,
          method: result.method,
          dateHeader: result.dateHeader,
          fetchedAt: result.fetchedAt,
        },
        502,
      );
    }

    return json({
      ok: true,
      source: 'ticketlink-date-header',
      host: TICKETLINK_URL,
      method: result.method,
      ticketlinkStatus: result.status,
      dateHeader: result.dateHeader,
      serverMs: result.serverMs,
      serverIso: new Date(result.serverMs).toISOString(),
      ticketlinkRtt: result.ticketlinkRtt,
      fetchedAt: result.fetchedAt,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        source: 'edge-function-error',
      },
      500,
    );
  }
});
