import {withdrawalStatusMeta} from '../src/core/utils/withdrawalStatusMeta';

describe('withdrawalStatusMeta', () => {
  it.each(['demande', 'validee', 'envoyee', 'payee'] as const)('%s shows frieze', s => {
    const m = withdrawalStatusMeta(s);
    expect(m.known).toBe(true);
    expect(m.showFrieze).toBe(true);
  });
  it('rejetee no frieze', () => {
    const m = withdrawalStatusMeta('rejetee');
    expect(m.isRejected).toBe(true);
    expect(m.showFrieze).toBe(false);
  });
  it('unknown raw badge', () => {
    const m = withdrawalStatusMeta('foo_bar');
    expect(m.known).toBe(false);
    expect(m.showFrieze).toBe(false);
    expect(m.status).toBe('foo_bar');
  });
});
