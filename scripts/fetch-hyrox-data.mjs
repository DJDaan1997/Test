import { readFile, writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://www.hyresult.com/athlete/mabel-de-glas';
const OUTPUT_FILE = new URL('../athlete-data.json', import.meta.url);

const decode = (str) =>
  str
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

const cleanTime = (value) => {
  const [h, m, s] = value.split(':').map((x) => x.padStart(2, '0'));
  return `${h}:${m}:${s}`;
};

const parseRaceText = (text) => {
  const normalized = decode(text).replace(/\s+/g, ' ').trim();
  const match = normalized.match(/(?<time>\d{1,2}:\d{2}:\d{2})\s*#\s*(?<rank>\d+)\s*(?<tail>.+)$/);
  if (!match?.groups) return null;

  const { time, rank, tail } = match.groups;
  const [fullTail, partner] = tail.split(' + ').map((x) => x.trim());
  const eventMatch = fullTail.match(/^(?<event>HYROX .*? \d{4})(?<division>.*)$/);

  if (!eventMatch?.groups) return null;

  const event = eventMatch.groups.event.trim();
  const division = eventMatch.groups.division.trim();
  const yearMatch = event.match(/(20\d{2})$/);
  const year = Number(yearMatch?.[1] ?? new Date().getUTCFullYear());

  return {
    date: `${year}-01-01`,
    event,
    division: division || 'Onbekend',
    time: cleanTime(time),
    rank: Number(rank),
    partner: partner || null,
  };
};

const parseRacesFromHtml = (html) => {
  const races = [];
  const anchorRegex = /<a[^>]*>(.*?)<\/a>/gims;
  for (const match of html.matchAll(anchorRegex)) {
    const race = parseRaceText(match[1]);
    if (race) races.push(race);
  }

  const deduped = Array.from(new Map(races.map((race) => [`${race.event}-${race.time}-${race.rank}`, race])).values());
  return deduped.sort((a, b) => a.time.localeCompare(b.time));
};

const fallbackData = JSON.parse(await readFile(OUTPUT_FILE, 'utf8'));

try {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; HyroxDashboardBot/1.0; +https://github.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const html = await response.text();
  const races = parseRacesFromHtml(html);

  if (races.length === 0) {
    throw new Error('No races found in HTML response');
  }

  const payload = {
    athlete: fallbackData.athlete,
    updatedAt: new Date().toISOString(),
    races,
  };

  await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated ${races.length} races.`);
} catch (error) {
  console.error(`Could not refresh from ${SOURCE_URL}:`, error.message);
  process.exit(1);
}
