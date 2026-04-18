import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusSparkline } from '../../../features/week/FocusSparkline';

describe('FocusSparkline', () => {
  it('renders nothing when every value is null', () => {
    const { container } = render(
      <FocusSparkline values={[null, null, null]} labels={['a', 'b', 'c']} />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders one dot per non-null value', () => {
    const { container } = render(
      <FocusSparkline values={[0.7, 0.8, null, 0.6]} labels={['a', 'b', 'c', 'd']} />,
    );
    const circles = container.querySelectorAll('svg circle');
    expect(circles.length).toBe(3);
  });

  it('renders labels', () => {
    render(<FocusSparkline values={[0.7]} labels={['Mon']} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });
});
