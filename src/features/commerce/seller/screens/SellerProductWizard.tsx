/**
 * Création et modification d'un produit (lot S5), en 3 étapes comme les
 * captures : 1 « Que vendez-vous ? » (nom, lien de livraison, prix), 2 « Rendez-le
 * irrésistible » (description), 3 « C'est presque prêt ! » (catégorie, publié ou
 * brouillon). Hors périmètre tant que le service de fichiers n'est pas branché
 * (D11) : envoi de fichier, formation, image de couverture. Publié = envoyé en
 * modération (`pending_review`) ; le Worker ne publie jamais directement.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {ErrorState, LoadingState, Text, TextField, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {SellerPillButton} from '../components/SellerPillButton';
import {
  DESCRIPTION_MAX,
  EMPTY_DRAFT,
  TITLE_MAX,
  detailToDraft,
  draftErrors,
  draftToInput,
  productErrorKey,
  type ProductDraft,
  type ProductDraftError,
} from '../logic/sellerProductForm';
import {sellerProducts, sellerProductsStore} from '../store/sellerProductsStore';

const P = 'commerce.sellerSpace.products';

export type SellerProductWizardProps = {
  header: React.ReactNode;
  /** Identifiant du produit à modifier ; null = création. */
  editId: string | null;
  onClose: () => void;
  /** Retour Android : l'écran parent appelle `goBack` exposé ici. */
  registerBack?: (back: () => boolean) => void;
};

export function SellerProductWizard({header, editId, onClose, registerBack}: SellerProductWizardProps) {
  const sellerColors = useSellerColors();
  const {t} = useTranslation();
  const categories = useSyncExternalStore(
    cb => sellerProductsStore.subscribe(() => cb()),
    () => sellerProductsStore.getState().categories,
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<ProductDraftError[]>([]);
  const [loading, setLoading] = useState(editId !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void sellerProducts.loadCategories();
  }, []);

  useEffect(() => {
    if (!editId) {
      return;
    }
    let alive = true;
    setLoading(true);
    void sellerProducts.fetchDetail(editId).then(res => {
      if (!alive) {
        return;
      }
      if ('listing' in res) {
        setDraft(detailToDraft(res.listing));
        setLoadError(null);
      } else {
        setLoadError(res.errorKind);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [editId]);

  const patch = (p: Partial<ProductDraft>) => {
    setDraft(d => ({...d, ...p}));
    setErrors([]);
    setSaveError(null);
  };

  const goBack = React.useCallback((): boolean => {
    if (step > 1) {
      setStep(s => (s === 3 ? 2 : 1));
    } else {
      onClose();
    }
    return true;
  }, [step, onClose]);

  useEffect(() => {
    registerBack?.(goBack);
  }, [registerBack, goBack]);

  const next = async () => {
    const errs = draftErrors(draft, step);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    if (step < 3) {
      setStep(step === 1 ? 2 : 3);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await sellerProducts.save(draftToInput(draft, editId === null), editId);
    setSaving(false);
    if (res.ok) {
      onClose();
    } else {
      setSaveError(res.errorKind);
    }
  };

  const wrap = (children: React.ReactNode) => (
    <ScrollView
      style={{flex: 1, backgroundColor: sellerColors.bg}}
      contentContainerStyle={{paddingBottom: 32}}
      keyboardShouldPersistTaps="handled"
      testID="seller-product-wizard">
      {header}
      {children}
    </ScrollView>
  );

  if (loading) {
    return wrap(<LoadingState testID="seller-product-wizard-loading" />);
  }
  if (loadError) {
    return wrap(
      <ErrorState
        message={t(productErrorKey(loadError))}
        retryLabel={t(`${P}.wizard.back`)}
        onRetry={onClose}
        testID="seller-product-wizard-error"
      />,
    );
  }

  const err = (k: ProductDraftError) => (errors.includes(k) ? t(`${P}.wizard.errors.${k}`) : undefined);
  const steps = [1, 2, 3] as const;

  return wrap(
    <View style={{gap: 16, padding: sellerMetrics.margin}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}} accessibilityLabel={t(`${P}.wizard.stepOf`, {step})}>
        {steps.map(n => (
          <View
            key={n}
            style={{
              alignItems: 'center',
              backgroundColor: n === step ? sellerColors.accentDot : sellerColors.surfaceMuted,
              borderRadius: 9999,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}>
            <Text variant="bodyStrong" style={{color: n === step ? sellerColors.onAccent : sellerColors.inkMuted}}>
              {n < step ? '✓' : String(n)}
            </Text>
          </View>
        ))}
      </View>
      <View style={{backgroundColor: sellerColors.surfaceMuted, borderRadius: 9999, height: 4}}>
        <View
          style={{
            backgroundColor: sellerColors.accentDot,
            borderRadius: 9999,
            height: 4,
            width: `${(step / 3) * 100}%`,
          }}
        />
      </View>

      <Text variant="display" accessibilityRole="header" style={{color: sellerColors.ink}}>
        {editId && step === 1 ? t(`${P}.wizard.editTitle`) : t(`${P}.wizard.step${step}Title`)}
      </Text>
      <Text variant="body" style={{color: sellerColors.inkMuted}}>
        {t(`${P}.wizard.step${step}Sub`)}
      </Text>

      {step === 1 ? (
        <>
          <TextField
            label={t(`${P}.wizard.nameLabel`)}
            value={draft.title}
            onChangeText={v => patch({title: v})}
            placeholder={t(`${P}.wizard.namePlaceholder`)}
            maxLength={TITLE_MAX}
            error={err('title')}
            testID="seller-wizard-title"
          />
          <TextField
            label={t(`${P}.wizard.linkLabel`)}
            value={draft.deliveryUrl}
            onChangeText={v => patch({deliveryUrl: v})}
            placeholder="https://"
            helper={t(`${P}.wizard.linkHelper`)}
            keyboardType="url"
            autoCapitalize="none"
            error={err('deliveryUrl')}
            testID="seller-wizard-link"
          />
          <TextField
            label={t(`${P}.wizard.priceLabel`)}
            value={draft.priceText}
            onChangeText={v => patch({priceText: v})}
            placeholder="0"
            helper={t(`${P}.wizard.priceHelper`)}
            keyboardType="number-pad"
            error={err('price')}
            testID="seller-wizard-price"
          />
        </>
      ) : null}

      {step === 2 ? (
        <TextField
          label={t(`${P}.wizard.descLabel`)}
          value={draft.description}
          onChangeText={v => patch({description: v})}
          placeholder={t(`${P}.wizard.descPlaceholder`)}
          maxLength={DESCRIPTION_MAX}
          multiline
          error={err('description')}
          testID="seller-wizard-description"
        />
      ) : null}

      {step === 3 ? (
        <>
          <Text variant="bodyStrong" style={{color: sellerColors.ink}}>
            {t(`${P}.wizard.categoryLabel`)}
          </Text>
          {categories.length === 0 ? (
            <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
              {t(`${P}.wizard.categoriesUnavailable`)}
            </Text>
          ) : (
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {categories.map(c => {
                const on = draft.category === c.slug;
                return (
                  <Pressable
                    key={c.slug}
                    onPress={() => patch({category: c.slug})}
                    accessibilityRole="radio"
                    accessibilityState={{selected: on}}
                    style={{
                      backgroundColor: on ? sellerColors.bg : sellerColors.surfaceMuted,
                      borderColor: on ? sellerColors.accentDot : sellerColors.surfaceMuted,
                      borderRadius: 9999,
                      borderWidth: 2,
                      justifyContent: 'center',
                      minHeight: 44,
                      paddingHorizontal: 16,
                    }}>
                    <Text variant="bodySmall" style={{color: sellerColors.ink}}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {err('category') ? (
            <Text variant="caption" style={{color: sellerColors.negativeText}}>
              {err('category')}
            </Text>
          ) : null}

          {editId === null ? (
            <>
              <Text variant="bodyStrong" style={{color: sellerColors.ink}}>
                {t(`${P}.wizard.visibilityLabel`)}
              </Text>
              {(['pending_review', 'draft'] as const).map(k => {
                const on = draft.launch === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => patch({launch: k})}
                    accessibilityRole="radio"
                    accessibilityState={{selected: on}}
                    style={{
                      backgroundColor: on ? sellerColors.bg : sellerColors.surfaceMuted,
                      borderColor: on ? sellerColors.accentDot : sellerColors.surfaceMuted,
                      borderRadius: 16,
                      borderWidth: 2,
                      gap: 2,
                      minHeight: 56,
                      padding: 12,
                    }}>
                    <Text variant="bodyStrong" style={{color: sellerColors.ink}}>
                      {t(`${P}.wizard.${k === 'draft' ? 'launchDraft' : 'launchPublish'}`)}
                    </Text>
                    <Text variant="caption" style={{color: sellerColors.inkMuted}}>
                      {t(`${P}.wizard.${k === 'draft' ? 'launchDraftSub' : 'launchPublishSub'}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </>
          ) : null}
        </>
      ) : null}

      {saveError ? (
        <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{color: sellerColors.negativeText}}>
          {t(productErrorKey(saveError))}
        </Text>
      ) : null}

      <View style={{alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between'}}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          style={{justifyContent: 'center', minHeight: 44, paddingHorizontal: 8}}>
          <Text variant="bodyStrong" style={{color: sellerColors.inkMuted}}>
            {'← '}
            {t(`${P}.wizard.back`)}
          </Text>
        </Pressable>
        <View style={{flex: 1}}>
          <SellerPillButton
            tone="orange"
            loading={saving}
            label={
              step < 3
                ? t(`${P}.wizard.next`)
                : editId
                ? t(`${P}.wizard.save`)
                : t(`${P}.wizard.launch`)
            }
            onPress={() => void next()}
            testID="seller-wizard-next"
          />
        </View>
      </View>
    </View>,
  );
}
