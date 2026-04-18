import { describe, it, expect } from 'vitest';
import { APP_CATEGORY, appCategory } from '../../lib/categories';

describe('appCategory', () => {
  it('returns the default category for a known app (case-insensitive)', () => {
    expect(appCategory('VS Code')).toBe('code');
    expect(appCategory('vs code')).toBe('code');
    expect(appCategory('VS CODE')).toBe('code');
  });

  it('returns "browse" for unknown apps', () => {
    expect(appCategory('Obscure Journaling App')).toBe('browse');
    expect(appCategory('')).toBe('browse');
  });

  it('overrides defaults when an override is provided', () => {
    const overrides = { figma: 'code' as const };
    expect(appCategory('Figma', overrides)).toBe('code');
  });

  it('overrides are keyed case-insensitively', () => {
    const overrides = { 'linear': 'code' as const };
    expect(appCategory('Linear', overrides)).toBe('code');
  });

  it('falls through to defaults when the override is missing', () => {
    const overrides = { 'vs code': 'code' as const };
    expect(appCategory('Slack', overrides)).toBe('comm');
  });

  it('ships expected defaults for seed apps', () => {
    expect(appCategory('VS Code')).toBe('code');
    expect(appCategory('Cursor')).toBe('code');
    expect(appCategory('Terminal')).toBe('code');
    expect(appCategory('Warp')).toBe('code');
    expect(appCategory('iTerm')).toBe('code');
    expect(appCategory('Xcode')).toBe('code');
    expect(appCategory('IntelliJ IDEA')).toBe('code');
    expect(appCategory('Figma')).toBe('creative');
    expect(appCategory('Notion')).toBe('creative');
    expect(appCategory('Linear')).toBe('creative');
    expect(appCategory('Obsidian')).toBe('creative');
    expect(appCategory('Slack')).toBe('comm');
    expect(appCategory('Discord')).toBe('comm');
    expect(appCategory('Mail')).toBe('comm');
    expect(appCategory('Gmail')).toBe('comm');
    expect(appCategory('Messages')).toBe('comm');
    expect(appCategory('Zoom')).toBe('meeting');
    expect(appCategory('Google Meet')).toBe('meeting');
    expect(appCategory('Microsoft Teams')).toBe('meeting');
    expect(appCategory('Chrome')).toBe('browse');
    expect(appCategory('Safari')).toBe('browse');
    expect(appCategory('Arc')).toBe('browse');
    expect(appCategory('Firefox')).toBe('browse');
  });

  it('APP_CATEGORY keys are all lowercase', () => {
    for (const key of Object.keys(APP_CATEGORY)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});
