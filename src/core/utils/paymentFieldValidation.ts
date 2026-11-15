/**
 * Validations de champ paiement direct — pure, testable.
 * Reprend la logique du site shared/payment/directPayment (validerChampPaiement).
 * Retourne une clé i18n d'erreur ou null si OK.
 */

export type PaymentFieldName = 'numeroPaiement' | 'otp' | 'emailPaiement';

const NUMERO_MIN = 8;
const NUMERO_MAX = 20;
const OTP_MIN = 4;
const OTP_MAX = 10;

export function validerChampPaiement(
  name: PaymentFieldName,
  value: string,
): string | null {
  const v = (value ?? '').trim();
  if (name === 'numeroPaiement') {
    if (!v) {
      return 'inscription.fields.numeroPaiement.required';
    }
    const digits = v.replace(/\D/g, '');
    if (digits.length < NUMERO_MIN || digits.length > NUMERO_MAX) {
      return 'inscription.fields.numeroPaiement.invalid';
    }
    return null;
  }
  if (name === 'otp') {
    if (!v) {
      return 'inscription.fields.otp.required';
    }
    if (!/^\d+$/.test(v) || v.length < OTP_MIN || v.length > OTP_MAX) {
      return 'inscription.fields.otp.invalid';
    }
    return null;
  }
  if (name === 'emailPaiement') {
    if (!v) {
      return null; // optionnel
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 200) {
      return 'inscription.fields.emailPaiement.invalid';
    }
    return null;
  }
  return null;
}
