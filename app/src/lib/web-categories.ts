import type { DomainMeta, WebCategory } from '../types';

export const DOMAIN_META: Readonly<Record<string, DomainMeta>> = {
  'github.com':            { cat: 'Code',          favicon: 'GH' },
  'stackoverflow.com':     { cat: 'Code',          favicon: 'SO' },
  'developer.mozilla.org': { cat: 'Docs',          favicon: 'MDN' },
  'vercel.com':            { cat: 'Code',          favicon: '▲' },
  'npmjs.com':             { cat: 'Code',          favicon: 'np' },
  'linear.app':            { cat: 'Work',          favicon: '≡' },
  'notion.so':             { cat: 'Work',          favicon: 'N' },
  'figma.com':             { cat: 'Work',          favicon: 'F' },
  'mail.google.com':       { cat: 'Comms',         favicon: 'M' },
  'calendar.google.com':   { cat: 'Work',          favicon: '31' },
  'docs.google.com':       { cat: 'Work',          favicon: 'D' },
  'slack.com':             { cat: 'Comms',         favicon: 'S' },
  'zoom.us':               { cat: 'Comms',         favicon: 'Z' },
  'news.ycombinator.com':  { cat: 'News',          favicon: 'Y' },
  'reddit.com':            { cat: 'Social',        favicon: 'r' },
  'twitter.com':           { cat: 'Social',        favicon: '𝕏' },
  'youtube.com':           { cat: 'Entertainment', favicon: '▶' },
  'netflix.com':           { cat: 'Entertainment', favicon: 'N' },
  'spotify.com':           { cat: 'Entertainment', favicon: '♫' },
  'amazon.com':            { cat: 'Shopping',      favicon: 'a' },
  'claude.ai':             { cat: 'AI',            favicon: '✶' },
  'chat.openai.com':       { cat: 'AI',            favicon: '◉' },
  'perplexity.ai':         { cat: 'AI',            favicon: 'P' },
  'nytimes.com':            { cat: 'News',         favicon: 'T' },
  'wikipedia.org':         { cat: 'Docs',          favicon: 'W' },
};

export function extractDomain(urlOrDomain: string): string {
  try {
    const u = new URL(urlOrDomain);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return urlOrDomain.replace(/^www\./i, '').toLowerCase();
  }
}

export function domainCategory(domain: string): WebCategory {
  return DOMAIN_META[domain]?.cat ?? 'Other';
}

export function domainFavicon(domain: string): string {
  const meta = DOMAIN_META[domain];
  if (meta) return meta.favicon;
  if (!domain) return '?';
  return domain[0].toUpperCase();
}
