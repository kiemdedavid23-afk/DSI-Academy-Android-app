/**
 * Deux éventails de couvertures pour le bandeau d'une maison : celui du haut
 * s'ouvre vers le haut, celui du bas vers le bas, ils se chevauchent. Les
 * couvertures viennent du Worker (liens https), rien n'est embarqué.
 * Sans couverture, ou le temps du chargement : pastille de la maison, même hauteur.
 */

import React, {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {Image, View} from 'react-native';
import {Icon, useTheme, withAlpha} from '@shared/designsystem';
import {HOUSE_STORES} from '../store/houseStores';
import {HOUSE_VISUALS, type HouseId} from '@shared/houses/houseVisuals';
import {FAN_SPECS, fanHeight, placeFans, splitCovers, type FanPlacement} from '../logic/coverFan';

/** Couvertures préchargées pour que l'éventail apparaisse d'un coup. */
const PREFETCH = 8;

export type CoverFansProps = {
  houseId: HouseId;
};

export function CoverFans({houseId}: CoverFansProps) {
  const {colors, radii} = useTheme();
  const store = HOUSE_STORES[houseId].covers;
  const state = useSyncExternalStore(
    cb => store.subscribe(() => cb()),
    () => store.getState(),
  );
  const [width, setWidth] = useState(0);
  const kind = HOUSE_VISUALS[houseId].kind;
  const spec = FAN_SPECS[kind];
  const height = fanHeight(kind);

  useEffect(() => {
    void store.load();
  }, [store]);

  const covers = useMemo(() => state.data ?? [], [state.data]);
  const halves = useMemo(() => splitCovers(covers), [covers]);
  const placement = useMemo(
    () => placeFans(kind, halves.top.length, halves.bottom.length),
    [kind, halves],
  );

  useEffect(() => {
    covers.slice(0, PREFETCH).forEach(c => {
      void Image.prefetch(c.imageUrl).catch(() => undefined);
    });
  }, [covers]);

  const renderCard = (url: string, id: number, p: FanPlacement, tag: string) => (
    <View
      key={`${tag}-${id}`}
      style={{
        backgroundColor: colors.bgDarkPremium,
        borderColor: withAlpha(colors.textOnDark, 0.25),
        borderRadius: radii.sm,
        borderWidth: 1,
        height: spec.h,
        left: width / 2 - spec.w / 2,
        overflow: 'hidden',
        position: 'absolute',
        top: p.top,
        transform: [{rotate: `${p.angle}deg`}],
        transformOrigin: p.origin,
        width: spec.w,
        zIndex: p.z,
      }}>
      <Image source={{uri: url}} style={{height: '100%', width: '100%'}} resizeMode="cover" />
    </View>
  );

  const ready = width > 0 && covers.length > 0;

  return (
    <View
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{alignSelf: 'stretch', height, overflow: 'hidden'}}
      testID="cover-fans">
      {ready ? (
        <>
          {placement.bottom.map(p => renderCard(halves.bottom[p.index].imageUrl, halves.bottom[p.index].id, p, 'b'))}
          {placement.top.map(p => renderCard(halves.top[p.index].imageUrl, halves.top[p.index].id, p, 't'))}
        </>
      ) : (
        <View style={{alignItems: 'center', flex: 1, justifyContent: 'center', opacity: 0.5}}>
          <Icon name={HOUSE_VISUALS[houseId].icon} size={40} color={colors.textOnDark} />
        </View>
      )}
    </View>
  );
}
