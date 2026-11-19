/**
 * Deux éventails de couvertures : celui du haut s'ouvre vers le haut, celui du
 * bas vers le bas, ils se chevauchent (celui du haut par-dessus). Les couvertures
 * viennent du Worker (liens https), rien n'est embarqué.
 *  · CoverFans : bandeau d'une maison, format propre à la maison ;
 *  · MixedCoverFans : accueil Academy, couvertures des quatre maisons mélangées.
 * Sans couverture, ou le temps du chargement : icône(s) de la maison, même hauteur.
 */

import React, {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {Image, View} from 'react-native';
import {Icon, useTheme, withAlpha} from '@shared/designsystem';
import {HOUSE_STORES} from '../store/houseStores';
import {FAN_COVERS, type CoverItem} from '../store/coversStore';
import {HOUSE_ORDER, HOUSE_VISUALS, type HouseId} from '@shared/houses/houseVisuals';
import {
  FAN_SPECS,
  MIX_SPECS,
  fanHeight,
  mixCovers,
  mixedHeight,
  placeFans,
  placeMixedFans,
  splitCovers,
  type FanKind,
} from '../logic/coverFan';

/** Couvertures préchargées pour que l'éventail apparaisse d'un coup. */
const PREFETCH = 8;

type Card = {
  key: string;
  url: string;
  w: number;
  h: number;
  top: number;
  angle: number;
  origin: string;
  z: number;
};

function useHouseCovers(houseId: HouseId): CoverItem[] {
  const store = HOUSE_STORES[houseId].covers;
  const subscribe = useCallback((cb: () => void) => store.subscribe(() => cb()), [store]);
  const state = useSyncExternalStore(subscribe, () => store.getState());
  useEffect(() => {
    void store.load();
  }, [store]);
  return useMemo(() => state.data ?? [], [state.data]);
}

function useWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback(
    (e: {nativeEvent: {layout: {width: number}}}) => setWidth(e.nativeEvent.layout.width),
    [],
  );
  return {width, onLayout};
}

function usePrefetch(covers: CoverItem[]) {
  useEffect(() => {
    covers.slice(0, PREFETCH).forEach(c => {
      void Image.prefetch(c.imageUrl).catch(() => undefined);
    });
  }, [covers]);
}

type CanvasProps = {
  height: number;
  /** Cartes du dessous (éventail du bas) puis du dessus (éventail du haut). */
  cards: Card[];
  fallbackIcons: HouseId[];
};

function FanCanvas({height, cards, fallbackIcons}: CanvasProps) {
  const {colors, radii} = useTheme();
  const {width, onLayout} = useWidth();
  const ready = width > 0 && cards.length > 0;

  return (
    <View
      onLayout={onLayout}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{alignSelf: 'stretch', height, overflow: 'hidden'}}
      testID="cover-fans">
      {ready ? (
        cards.map(c => (
          <View
            key={c.key}
            style={{
              backgroundColor: colors.bgDarkPremium,
              borderColor: withAlpha(colors.textOnDark, 0.25),
              borderRadius: radii.sm,
              borderWidth: 1,
              height: c.h,
              left: width / 2 - c.w / 2,
              overflow: 'hidden',
              position: 'absolute',
              top: c.top,
              transform: [{rotate: `${c.angle}deg`}],
              transformOrigin: c.origin,
              width: c.w,
              zIndex: c.z,
            }}>
            <Image source={{uri: c.url}} style={{height: '100%', width: '100%'}} resizeMode="cover" />
          </View>
        ))
      ) : (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            gap: 18,
            justifyContent: 'center',
            opacity: 0.5,
          }}>
          {fallbackIcons.map(id => (
            <Icon key={id} name={HOUSE_VISUALS[id].icon} size={40} color={colors.textOnDark} />
          ))}
        </View>
      )}
    </View>
  );
}

export type CoverFansProps = {
  houseId: HouseId;
};

/** Bandeau d'une maison : ses couvertures, dans son format. */
export function CoverFans({houseId}: CoverFansProps) {
  const covers = useHouseCovers(houseId);
  usePrefetch(covers);
  const kind = HOUSE_VISUALS[houseId].kind;
  const spec = FAN_SPECS[kind];

  const cards = useMemo(() => {
    const halves = splitCovers(covers);
    const p = placeFans(kind, halves.top.length, halves.bottom.length);
    const make = (list: CoverItem[], pl: typeof p.top, tag: string): Card[] =>
      pl.map(x => ({
        key: `${tag}-${list[x.index].id}`,
        url: list[x.index].imageUrl,
        w: spec.w,
        h: spec.h,
        top: x.top,
        angle: x.angle,
        origin: x.origin,
        z: x.z,
      }));
    return [...make(halves.bottom, p.bottom, 'b'), ...make(halves.top, p.top, 't')];
  }, [covers, kind, spec]);

  return <FanCanvas height={fanHeight(kind)} cards={cards} fallbackIcons={[houseId]} />;
}

/** Accueil Academy : couvertures des quatre maisons mélangées (4 requêtes en parallèle). */
export function MixedCoverFans() {
  const library = useHouseCovers('library');
  const videos = useHouseCovers('videos');
  const formations = useHouseCovers('formations');
  const audio = useHouseCovers('audio');

  const mixed = useMemo(() => {
    const tag = (list: CoverItem[], kind: FanKind) => list.map(c => ({...c, kind}));
    return mixCovers(
      [tag(library, 'book'), tag(videos, 'video'), tag(formations, 'course'), tag(audio, 'audio')],
      FAN_COVERS,
    );
  }, [library, videos, formations, audio]);
  usePrefetch(mixed);

  const cards = useMemo(() => {
    const halves = splitCovers(mixed);
    const p = placeMixedFans(
      halves.top.map(c => c.kind),
      halves.bottom.map(c => c.kind),
    );
    const make = (list: typeof mixed, pl: typeof p.top, tag: string): Card[] =>
      pl.map(x => ({
        key: `${tag}-${list[x.index].kind}-${list[x.index].id}`,
        url: list[x.index].imageUrl,
        w: MIX_SPECS[x.kind].w,
        h: MIX_SPECS[x.kind].h,
        top: x.top,
        angle: x.angle,
        origin: x.origin,
        z: x.z,
      }));
    return [...make(halves.bottom, p.bottom, 'b'), ...make(halves.top, p.top, 't')];
  }, [mixed]);

  return <FanCanvas height={mixedHeight()} cards={cards} fallbackIcons={[...HOUSE_ORDER]} />;
}
