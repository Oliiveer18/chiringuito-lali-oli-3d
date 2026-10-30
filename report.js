/* =========================================================
   report.js
   Informe de fin de día y reseñas: el modelo se genera una vez y el render es puro.
   v25.7: voz por tipo de cliente, intensidad por estrellas y firma con pueblo.
   ========================================================= */
export {
  recordVisit, starsOf, ensureOpinions, dayStarsSummary, opinionLine,
  mulberry32, pickPhrase, REVIEW_BANK, PRAISE, DETAIL,
  itemsStr, askedStr, waitMinsLabel, fill, triggerFor, reviewText,
  REV_RESP_MAX, REV_INVITE_COST, REV_INVITE_REP, REV_APOLOGY_REP, Rev,
  buildRevModel,
} from './report-model.js?v=28.17.0-online-web';
export {
  endDay, reportStatsHtml, reviewsWrapHtml, revSigOf, wageLine,
  respondReview, applyRevResp, refreshReportUI, advanceFromReport,
  showReportUI, teamHtml, reviewsSectionHtml,
} from './report-render.js?v=28.17.0-online-web';
