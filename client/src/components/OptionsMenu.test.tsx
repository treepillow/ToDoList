import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OptionsMenu } from './OptionsMenu';

const options = [
  { value: 'all', label: 'All tasks' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
] as const;

const setup = () => {
  const onChange = vi.fn();
  render(<OptionsMenu label="Filter" icon={<span />} options={options} value="all" onChange={onChange} />);
  return { onChange, user: userEvent.setup(), trigger: screen.getByRole('button', { name: 'Filter' }) };
};

describe('OptionsMenu', () => {
  it('keeps options hidden until the icon is clicked', async () => {
    const { user, trigger } = setup();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole('menuitemradio', { name: 'All tasks' })).toHaveAttribute('aria-checked', 'true');
  });

  it('reports the chosen option and closes', async () => {
    const { user, trigger, onChange } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('menuitemradio', { name: 'Completed' }));

    expect(onChange).toHaveBeenCalledWith('completed');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and on outside click, returning focus to the icon', async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
