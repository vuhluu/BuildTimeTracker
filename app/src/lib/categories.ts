import type { Category } from '../types';

export const APP_CATEGORY: Readonly<Record<string, Category>> = {
  'vs code': 'code',
  'cursor': 'code',
  'xcode': 'code',
  'intellij idea': 'code',
  'iterm': 'code',
  'terminal': 'code',
  'warp': 'code',
  'figma': 'creative',
  'notion': 'creative',
  'linear': 'creative',
  'obsidian': 'creative',
  'slack': 'comm',
  'discord': 'comm',
  'mail': 'comm',
  'gmail': 'comm',
  'messages': 'comm',
  'zoom': 'meeting',
  'google meet': 'meeting',
  'microsoft teams': 'meeting',
  'chrome': 'browse',
  'safari': 'browse',
  'arc': 'browse',
  'firefox': 'browse',
};

export function appCategory(
  app: string,
  overrides?: Record<string, Category>,
): Category {
  const key = app.toLowerCase();
  if (overrides) {
    const o = overrides[key];
    if (o) return o;
  }
  return APP_CATEGORY[key] ?? 'browse';
}
