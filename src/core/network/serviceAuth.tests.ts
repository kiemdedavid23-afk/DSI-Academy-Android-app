import {getDefaultAuth, resolveAuthMode} from './serviceAuth';

describe('serviceAuth', () => {
  it('community par défaut accessProof', () => {
    expect(getDefaultAuth('community')).toBe('accessProof');
  });

  it('autres services par défaut none', () => {
    expect(getDefaultAuth('payment')).toBe('none');
    expect(getDefaultAuth('shop')).toBe('none');
    expect(getDefaultAuth('marketplace')).toBe('none');
    expect(getDefaultAuth('content')).toBe('none');
    expect(getDefaultAuth('admin')).toBe('none');
  });

  it('resolveAuthMode respecte l\'override', () => {
    expect(resolveAuthMode('payment', 'bearer')).toBe('bearer');
    expect(resolveAuthMode('community', 'none')).toBe('none');
    expect(resolveAuthMode('shop')).toBe('none');
  });
});
