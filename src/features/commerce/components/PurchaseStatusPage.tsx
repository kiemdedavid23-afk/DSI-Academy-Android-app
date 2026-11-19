/**
 * Pages plein écran de l'achat, après « Payer » :
 *  · attente de confirmation (paiement en cours ou en attente, vérification automatique) ;
 *  · succès (reçu des données envoyées par le Worker, puis redirection automatique
 *    vers le produit après quelques secondes, annulable).
 * L'écran ne calcule rien : l'état vient du store d'achat (R-LAY-5).
 */

import React, {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {Modal, ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Button,
  Icon,
  LoadingState,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {accessErrorKey} from '../logic/errorKey';
import {formatDsiAmount} from '../logic/format';
import {
  AUTO_VERIFY_DELAY_MS,
  AUTO_VERIFY_MAX,
  nextCountdown,
  receiptRows,
  REDIRECT_SECONDS,
  redirectTarget,
} from '../logic/purchaseResult';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceAccess, CommerceSource} from '../store/commerceTypes';

export type PurchaseStatusPageProps = {
  source: CommerceSource;
  onOpenPurchases: () => void;
  onOpenLibrary?: () => void;
  onOpenAccess: (access: CommerceAccess) => void;
};

export function PurchaseStatusPage({
  source,
  onOpenPurchases,
  onOpenLibrary,
  onOpenAccess,
}: PurchaseStatusPageProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const insets = useSafeAreaInsets();
  const p = useSyncExternalStore(stores.purchase.subscribe, stores.purchase.getState);

  const [left, setLeft] = useState<number | null>(null);
  const [accessing, setAccessing] = useState(false);
  const [accessMsg, setAccessMsg] = useState<string | null>(null);
  const attempts = useRef(0);
  const [exhausted, setExhausted] = useState(false);

  const paid = p.phase === 'paid' && p.order !== null;
  const pending = p.phase === 'pending';
  const target = redirectTarget(source, p.cart, onOpenLibrary !== undefined);

  const goPurchases = useCallback(() => {
    stores.purchase.dismiss();
    onOpenPurchases();
  }, [stores, onOpenPurchases]);

  const openAccess = useCallback(async () => {
    if (!p.order || !p.product || accessing) {
      return;
    }
    setLeft(null);
    setAccessMsg(null);
    setAccessing(true);
    const res = await stores.orders.access({orderId: p.order.orderId, productId: p.product.id});
    setAccessing(false);
    if (res.ok) {
      stores.purchase.dismiss();
      onOpenAccess({url: res.url, mode: res.mode});
    } else {
      setAccessMsg(accessErrorKey(res.errorKind));
    }
  }, [p.order, p.product, accessing, stores, onOpenAccess]);

  const proceed = useCallback(() => {
    if (target === 'library' && onOpenLibrary) {
      stores.purchase.dismiss();
      onOpenLibrary();
    } else if (target === 'purchases') {
      goPurchases();
    } else {
      void openAccess();
    }
  }, [target, onOpenLibrary, stores, goPurchases, openAccess]);

  // Succès : le compte à rebours démarre une seule fois par achat.
  const orderId = p.order?.orderId ?? null;
  useEffect(() => {
    setLeft(paid ? REDIRECT_SECONDS : null);
    setAccessMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, orderId]);

  useEffect(() => {
    if (left === null) {
      return;
    }
    if (left === 0) {
      setLeft(null);
      proceed();
      return;
    }
    const id = setTimeout(() => setLeft(l => (l === null ? null : nextCountdown(l))), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  // Attente : relecture automatique, la même commande, jamais un nouveau paiement.
  useEffect(() => {
    if (!pending) {
      attempts.current = 0;
      setExhausted(false);
      return;
    }
    if (p.verifying) {
      return;
    }
    if (attempts.current >= AUTO_VERIFY_MAX) {
      setExhausted(true);
      return;
    }
    const id = setTimeout(() => {
      attempts.current += 1;
      void stores.purchase.verify();
    }, AUTO_VERIFY_DELAY_MS);
    return () => clearTimeout(id);
  }, [pending, p.verifying, p.order, stores]);

  if (!p.product || !(p.phase === 'processing' || pending || paid)) {
    return null;
  }

  const order = p.order;
  const rows = paid && order ? receiptRows(order) : [];

  const header = (icon: React.ReactNode, title: string, text: string | null) => (
    <View style={{alignItems: 'center', gap: spacing.md}}>
      {icon}
      <Text variant="title" style={{textAlign: 'center'}} accessibilityRole="header">
        {title}
      </Text>
      {text ? (
        <Text variant="body" color="secondary" style={{textAlign: 'center'}}>
          {text}
        </Text>
      ) : null}
    </View>
  );

  let content: React.ReactNode;
  if (p.phase === 'processing') {
    content = (
      <>
        {header(
          <LoadingState accessibilityLabel={t('mp.checkout.paying')} />,
          t('mp.checkout.paying'),
          null,
        )}
        <Text variant="caption" color="secondary" style={{textAlign: 'center'}} testID="purchase-processing">
          {t('commerce.purchase.doNotClose')}
        </Text>
      </>
    );
  } else if (pending) {
    content = (
      <>
        {header(
          <LoadingState accessibilityLabel={t('mp.checkout.result.processingTitle')} />,
          t('mp.checkout.result.processingTitle'),
          t('mp.orders.noteProcessing'),
        )}
        <Text variant="body" style={{textAlign: 'center'}} testID="purchase-pending">
          {order?.note ?? t('mp.checkout.result.processingText')}
        </Text>
        {p.verifyFailed ? (
          <Text variant="caption" color="secondary" style={{textAlign: 'center'}}>
            {t('app.catalogue.errorNetwork')}
          </Text>
        ) : null}
        {!exhausted ? (
          <Text variant="caption" color="secondary" style={{textAlign: 'center'}}>
            {t('commerce.purchase.autoChecking')}
          </Text>
        ) : null}
        <Button
          label={t(p.verifying ? 'mp.orders.checking' : 'mp.orders.check')}
          loading={p.verifying}
          onPress={() => void stores.purchase.verify()}
          testID="purchase-verify"
        />
        <Button variant="ghost" label={t('mp.checkout.result.myPurchases')} onPress={goPurchases} />
      </>
    );
  } else {
    content = (
      <>
        {header(
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.goldLight,
              borderColor: colors.goldBorder,
              borderRadius: 40,
              borderWidth: 1,
              height: 80,
              justifyContent: 'center',
              width: 80,
            }}>
            <Icon name="CheckIcon" size={40} color={colors.goldPrestige} />
          </View>,
          t('mp.checkout.result.paidTitle'),
          t(target === 'access' ? 'mp.checkout.result.paidText' : 'commerce.cart.paid'),
        )}
        <Text variant="caption" color="secondary" style={{textAlign: 'center'}} testID="purchase-paid">
          {p.cart ? t('commerce.cart.title') : p.product.title}
        </Text>
        <View
          testID="purchase-receipt"
          style={{
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderLight,
            borderRadius: radii.md,
            borderWidth: 1,
            gap: spacing.sm,
            padding: spacing.lg,
          }}>
          {rows.map(row => (
            <View
              key={row.id}
              style={{flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between'}}>
              <Text variant="bodySmall" color="secondary">
                {t(`commerce.purchase.receipt.${row.id}`)}
              </Text>
              <Text
                variant={row.id === 'total' ? 'bodyStrong' : 'bodySmall'}
                style={{flexShrink: 1, textAlign: 'right'}}
              >
                {row.kind === 'dsi'
                  ? `${row.negative ? '− ' : ''}${t('commerce.priceDsi', {
                      amount: formatDsiAmount(row.value as number),
                    })}`
                  : String(row.value)}
              </Text>
            </View>
          ))}
        </View>
        {accessMsg ? (
          <Text variant="caption" color="secondary" style={{textAlign: 'center'}} testID="purchase-access-error">
            {t(accessMsg)}
          </Text>
        ) : null}
        {left !== null ? (
          <Text variant="body" color="secondary" style={{textAlign: 'center'}} testID="purchase-countdown">
            {t(`commerce.purchase.redirect.${target}`, {count: left})}
          </Text>
        ) : null}
        <Button
          label={t(
            accessing
              ? 'mp.orders.accessLoading'
              : target === 'access'
                ? 'mp.checkout.result.access'
                : target === 'library'
                  ? 'commerce.library.myLibrary'
                  : 'mp.checkout.result.myPurchases',
          )}
          loading={accessing}
          onPress={() => {
            setLeft(null);
            proceed();
          }}
          testID={target === 'library' ? 'purchase-open-library' : 'purchase-access'}
        />
        {left !== null ? (
          <Button
            variant="secondary"
            label={t('commerce.purchase.stayHere')}
            onPress={() => setLeft(null)}
            testID="purchase-stay"
          />
        ) : null}
        <Button
          variant={left !== null ? 'ghost' : 'secondary'}
          label={t('mp.checkout.result.myPurchases')}
          onPress={goPurchases}
        />
        <Button variant="ghost" label={t('common.close')} onPress={stores.purchase.dismiss} />
      </>
    );
  }

  return (
    <Modal animationType="fade" visible onRequestClose={paid || pending ? stores.purchase.dismiss : undefined}>
      <View style={{backgroundColor: colors.bgApp, flex: 1, paddingTop: insets.top}} testID="purchase-status-page">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            gap: spacing.lg,
            justifyContent: 'center',
            padding: spacing.xl,
            paddingBottom: spacing.xxl + insets.bottom,
          }}>
          {content}
        </ScrollView>
      </View>
    </Modal>
  );
}
