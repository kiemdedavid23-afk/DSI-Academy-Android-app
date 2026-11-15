import {formatMontant} from '../src/core/utils/formatMontant';
import {buildReferralInviteLink} from '../src/shared/store/referralStore';

describe('formatMontant', () => {
  it('null → em dash', () => {
    expect(formatMontant(null, 'XOF', 'fr-FR')).toBe('—');
  });
  it('number + devise', () => {
    expect(formatMontant(1050, 'XOF', 'fr-FR')).toMatch(/1[\s\u202f]?050/);
    expect(formatMontant(1050, 'XOF', 'fr-FR')).toMatch(/XOF/);
  });
  it('string amount kept numeric if possible', () => {
    expect(formatMontant('2100', 'XOF', 'en-US')).toMatch(/2,100/);
  });
});

describe('buildReferralInviteLink', () => {
  it('encodes special chars', () => {
    const link = buildReferralInviteLink('DSI A&B');
    expect(link).toContain('/inscription?ref=');
    expect(link).toContain(encodeURIComponent('DSI A&B'));
    expect(link).not.toContain('DSI A&B');
  });
  it('empty code → empty', () => {
    expect(buildReferralInviteLink('')).toBe('');
  });
});
