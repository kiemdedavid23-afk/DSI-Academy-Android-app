/**
 * Réexport contrôlé pour la feature register (R-LAY-5 : l'écran n'importe pas @core/config).
 * Le store importe ce module ; l'écran ne voit que le store.
 */

export {isSiteUrl, resolveWebUrl} from '@core/config/serviceRegistry';
