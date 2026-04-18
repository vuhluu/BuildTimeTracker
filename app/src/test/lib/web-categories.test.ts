import { describe, it, expect } from 'vitest';
import {
  DOMAIN_META,
  domainCategory,
  domainFavicon,
  extractDomain,
} from '../../lib/web-categories';

describe('extractDomain', () => {
  it('strips scheme', () => {
    expect(extractDomain('https://github.com/foo/bar')).toBe('github.com');
    expect(extractDomain('http://github.com')).toBe('github.com');
  });

  it('strips www. prefix', () => {
    expect(extractDomain('https://www.github.com')).toBe('github.com');
  });

  it('strips path and query', () => {
    expect(extractDomain('https://github.com/foo/bar?baz=1#q')).toBe('github.com');
  });

  it('strips port', () => {
    expect(extractDomain('http://localhost:5173/today')).toBe('localhost');
  });

  it('returns the input unchanged when it is already a bare domain', () => {
    expect(extractDomain('github.com')).toBe('github.com');
  });

  it('lowercases', () => {
    expect(extractDomain('https://GitHub.COM/foo')).toBe('github.com');
  });
});

describe('domainCategory', () => {
  it('returns the known category', () => {
    expect(domainCategory('github.com')).toBe('Code');
    expect(domainCategory('figma.com')).toBe('Work');
    expect(domainCategory('slack.com')).toBe('Comms');
    expect(domainCategory('claude.ai')).toBe('AI');
  });

  it('returns "Other" for unknown domains', () => {
    expect(domainCategory('totally-unknown.example')).toBe('Other');
  });
});

describe('domainFavicon', () => {
  it('returns the known favicon glyph', () => {
    expect(domainFavicon('github.com')).toBe('GH');
    expect(domainFavicon('figma.com')).toBe('F');
  });

  it('falls back to first letter uppercased for unknowns', () => {
    expect(domainFavicon('totally-unknown.example')).toBe('T');
    expect(domainFavicon('')).toBe('?');
  });
});

describe('DOMAIN_META', () => {
  it('has all known seed domains', () => {
    const required = [
      'github.com',
      'stackoverflow.com',
      'developer.mozilla.org',
      'vercel.com',
      'npmjs.com',
      'linear.app',
      'notion.so',
      'figma.com',
      'mail.google.com',
      'calendar.google.com',
      'docs.google.com',
      'slack.com',
      'zoom.us',
      'news.ycombinator.com',
      'reddit.com',
      'twitter.com',
      'youtube.com',
      'netflix.com',
      'spotify.com',
      'amazon.com',
      'claude.ai',
      'chat.openai.com',
      'perplexity.ai',
      'nytimes.com',
      'wikipedia.org',
    ];
    for (const d of required) {
      expect(DOMAIN_META[d]).toBeDefined();
    }
  });
});
