import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FavoritesStore } from '../../../shared/favorites/favoritesStore';
import { SelectionsStore } from '../../../shared/selections/selectionsStore';
import { ChevronLeftIcon, BookmarkIcon, PlusIcon, CheckIcon, ShareIcon } from '../../../shared/ui/Icons';
import Skeleton, { SkeletonRegion } from '../../../shared/ui/Skeleton';
import { HOUSE_VISUALS } from './houseVisuals';
import './ContentDetail.css';

/** Bouton retour : revient à la page précédente, sinon à la découverte de la maison. */
export function DetailBackButton({ fallbackTo, className = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackTo, { replace: true });
    }
  };
  return (
    <button type="button" className={`dsi-cd-back${className ? ` ${className}` : ''}`} onClick={goBack}>
      <ChevronLeftIcon />
      <span>{t('content.back')}</span>
    </button>
  );
}

/**
 * Fiche d'un contenu (réutilisable par les quatre maisons).
 *
 * Props :
 *  houseId, kind        — identité visuelle et format du média
 *  title, subtitle, description, thumbnailUrl — la vignette occupe toute la carte du héros
 *  chips                — tableau de textes (nouveau, niveau, durée…)
 *  primary              — { to, label, Icon } : action principale (Lire, Regarder…)
 *  favEntry, selEntry   — objets à enregistrer dans FavoritesStore / SelectionsStore (même format qu'avant)
 *  backTo               — retour par défaut
 *  children             — contenu additionnel sous la fiche (rangée « même catégorie »)
 */
export default function ContentDetail({
  houseId,
  kind = 'book',
  title,
  subtitle,
  description,
  thumbnailUrl,
  chips = [],
  primary,
  favEntry,
  selEntry,
  backTo,
  children,
}) {
  const { t } = useTranslation();
  const [isFav, setIsFav] = useState(() => FavoritesStore.has(favEntry.id));
  const [isSelected, setIsSelected] = useState(() => SelectionsStore.has(selEntry.id));
  const [expanded, setExpanded] = useState(false);
  const [shared, setShared] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const visual = HOUSE_VISUALS[houseId];
  const hasThumb = typeof thumbnailUrl === 'string' && thumbnailUrl.trim() !== '' && !imageFailed;
  const bg = hasThumb ? thumbnailUrl : visual?.image;
  const PrimaryIcon = primary?.Icon;
  const longText = (description || '').length > 220;

  const toggleFav = () => {
    FavoritesStore.toggle(favEntry);
    setIsFav(FavoritesStore.has(favEntry.id));
  };

  const toggleSelection = () => {
    SelectionsStore.toggle(selEntry);
    setIsSelected(SelectionsStore.has(selEntry.id));
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared('copied');
        setTimeout(() => setShared(''), 2000);
      }
    } catch {
      // Partage annulé ou presse-papier refusé : rien à faire.
    }
  };

  return (
    <article className="dsi-cd">
      <section className="dsi-cd-hero" data-kind={kind}>
        {bg && (
          <img
            className="dsi-cd-hero-bg"
            src={bg}
            alt=""
            aria-hidden="true"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="dsi-cd-hero-inner">
          <DetailBackButton fallbackTo={backTo} className="dsi-cd-back--hero" />
          <div className="dsi-cd-info">
            {chips.length > 0 && (
              <div className="dsi-cd-chips">
                {chips.map((chip) => <span key={chip} className="dsi-cd-chip">{chip}</span>)}
              </div>
            )}
            <h1 className="dsi-cd-title">{title}</h1>
            {subtitle && <p className="dsi-cd-sub">{subtitle}</p>}

            <div className="dsi-cd-actions">
              {primary && (
                <Link to={primary.to} className="dsi-cd-primary">
                  {PrimaryIcon && <PrimaryIcon />}
                  {primary.label}
                </Link>
              )}
              <button
                type="button"
                className={`dsi-cd-icon-btn${isFav ? ' is-on' : ''}`}
                onClick={toggleFav}
                aria-pressed={isFav}
                aria-label={isFav ? t('content.detail.removeFav') : t('content.detail.addFav')}
                title={isFav ? t('content.detail.removeFav') : t('content.detail.addFav')}
              >
                <BookmarkIcon />
              </button>
              <button
                type="button"
                className={`dsi-cd-icon-btn${isSelected ? ' is-on' : ''}`}
                onClick={toggleSelection}
                aria-pressed={isSelected}
                aria-label={isSelected ? t('content.detail.removeSel') : t('content.detail.addSel')}
                title={isSelected ? t('content.detail.removeSel') : t('content.detail.addSel')}
              >
                {isSelected ? <CheckIcon /> : <PlusIcon />}
              </button>
              <button
                type="button"
                className="dsi-cd-icon-btn"
                onClick={handleShare}
                aria-label={t('content.detail.share')}
                title={t('content.detail.share')}
              >
                {shared === 'copied' ? <CheckIcon /> : <ShareIcon />}
              </button>
            </div>
            <p className="dsi-cd-feedback" role="status" aria-live="polite">
              {shared === 'copied' ? t('content.detail.linkCopied') : ''}
            </p>
          </div>
        </div>
      </section>

      {description && (
        <section className="dsi-cd-about">
          <h2 className="dsi-sec-title">{t('content.detail.aboutTitle')}</h2>
          <p className={`dsi-cd-desc${expanded || !longText ? ' is-open' : ''}`}>{description}</p>
          {longText && (
            <button type="button" className="dsi-cd-more" onClick={() => setExpanded((v) => !v)}>
              {expanded ? t('content.detail.readLess') : t('content.detail.readMore')}
            </button>
          )}
        </section>
      )}

      {children}
    </article>
  );
}

/** Squelette de la fiche : même hero et mêmes blocs. */
export function ContentDetailSkeleton({ kind = 'book' }) {
  return (
    <SkeletonRegion className="dsi-cd">
      <section className="dsi-cd-hero" data-kind={kind}>
        <div className="dsi-cd-hero-inner">
          <Skeleton tone="onDark" variant="pill" width={90} height={34} />
          <div className="dsi-cd-info">
            <Skeleton tone="onDark" width="85%" height={28} />
            <Skeleton tone="onDark" width="45%" height={14} />
            <Skeleton tone="onDark" variant="pill" width={170} height={46} />
          </div>
        </div>
      </section>
      <section className="dsi-cd-about">
        <Skeleton width={110} height={16} />
        <Skeleton width="100%" height={12} />
        <Skeleton width="92%" height={12} />
        <Skeleton width="70%" height={12} />
      </section>
    </SkeletonRegion>
  );
}
