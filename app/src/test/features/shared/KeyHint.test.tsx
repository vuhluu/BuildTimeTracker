import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyHint } from '../../../features/shared/KeyHint';

describe('KeyHint', () => {
  it('renders children', () => {
    render(<KeyHint>⌘K search</KeyHint>);
    expect(screen.getByText('⌘K search')).toBeInTheDocument();
  });

  it('applies a fixed-position container', () => {
    const { container } = render(<KeyHint>hi</KeyHint>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('fixed');
  });
});
