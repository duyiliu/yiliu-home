const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Source = {
  id: string;
  title: string;
  url: string;
  category: string;
};

type FeedItem = {
  source_id: string;
  source_title: string;
  source_category: string;
  title: string;
  url: string;
  summary: string;
  published_at: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey) {
    return json({ error: "Missing Supabase function environment" }, 500);
  }

  if (!authorization) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  const restHeaders = {
    apikey: anonKey,
    Authorization: authorization,
    "Content-Type": "application/json",
  };

  const sourcesResponse = await fetch(
    `${supabaseUrl}/rest/v1/sources?select=id,title,url,category&kind=eq.rss&order=sort_order.asc`,
    { headers: restHeaders },
  );

  if (!sourcesResponse.ok) {
    return json({ error: await sourcesResponse.text() }, sourcesResponse.status);
  }

  const sources = (await sourcesResponse.json()) as Source[];
  const results = [];

  for (const source of sources) {
    try {
      const xml = await fetchText(source.url);
      const items = parseFeed(xml, source).slice(0, 12);
      if (items.length) {
        const response = await fetch(`${supabaseUrl}/rest/v1/feed_items?on_conflict=user_id,source_id,url`, {
          method: "POST",
          headers: {
            ...restHeaders,
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(items),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }
      }

      results.push({ source: source.title, ok: true, count: items.length });
    } catch (error) {
      results.push({ source: source.title, ok: false, error: String(error) });
    }
  }

  return json({ results });
});

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "YiliuHome/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeed(xml: string, source: Source): FeedItem[] {
  const blocks = extractBlocks(xml, "item").length
    ? extractBlocks(xml, "item")
    : extractBlocks(xml, "entry");

  return blocks
    .map((block) => {
      const title = cleanText(tagText(block, "title"));
      const url = cleanText(atomLink(block) || tagText(block, "link"));
      if (!title || !url) return null;
      return {
        source_id: source.id,
        source_title: source.title,
        source_category: source.category,
        title,
        url,
        summary: cleanText(tagText(block, "description") || tagText(block, "summary") || tagText(block, "content"), 220),
        published_at: cleanText(tagText(block, "pubDate") || tagText(block, "published") || tagText(block, "updated"), 80),
      };
    })
    .filter(Boolean) as FeedItem[];
}

function extractBlocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  return Array.from(xml.matchAll(pattern), (match) => match[1]);
}

function tagText(block: string, tag: string): string {
  const pattern = new RegExp(`<(?:[\\w-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "i");
  return block.match(pattern)?.[1] || "";
}

function atomLink(block: string): string {
  const match = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || "";
}

function cleanText(value: string, maxLength = 300): string {
  const cleaned = decodeEntities(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLength);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
