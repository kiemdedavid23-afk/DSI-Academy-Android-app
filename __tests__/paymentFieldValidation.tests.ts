import {validerChampPaiement} from '../src/core/utils/paymentFieldValidation';

describe('validerChampPaiement', () => {
  it('numero required', () => {
    expect(validerChampPaiement('numeroPaiement', '')).toBeTruthy();
  });
  it('numero ok', () => {
    expect(validerChampPaiement('numeroPaiement', '70123456')).toBeNull();
  });
  it('otp digits', () => {
    expect(validerChampPaiement('otp', '12')).toBeTruthy();
    expect(validerChampPaiement('otp', '123456')).toBeNull();
  });
  it('email optional', () => {
    expect(validerChampPaiement('emailPaiement', '')).toBeNull();
    expect(validerChampPaiement('emailPaiement', 'a@b.c')).toBeNull();
    expect(validerChampPaiement('emailPaiement', 'bad')).toBeTruthy();
  });
});
