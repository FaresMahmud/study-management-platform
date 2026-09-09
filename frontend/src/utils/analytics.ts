/**
 * Utility para instrumentação de funil e métricas de uso (Analytics).
 * Em ambiente de desenvolvimento, loga detalhadamente no console.
 * Suporta disparos únicos por usuário via localStorage (eventos "first_*").
 * Sempre opera em modo fire-and-forget (não bloqueante).
 *
 * Eventos da Fase 1 (Onboarding):
 * - onboarding_started, onboarding_step_viewed, onboarding_step_skipped,
 *   onboarding_step_completed, onboarding_dismissed, first_steps_checklist_clicked,
 *   pdf_upload_completed, pdf_upload_failed, post_upload_cta_clicked,
 *   first_simulation_started, first_questions_generated
 *
 * Novos Eventos da Fase 2 (Banco de Questões & Simulados no Estilo do Material):
 * - style_profile_detected: { subject_id, bank, format, confidence, sample_count, source }
 * - question_generation_started: { job_id, subject_id, requested_count, format }
 * - question_generation_completed: { job_id, subject_id, generated_count, duration_ms }
 * - question_generation_failed: { job_id, subject_id, error, generated_so_far }
 * - simulation_started_from_bank: { simulation_id, subject_id, requested, available, is_partial }
 * - question_bank_exhausted: { subject_id, requested, available, remaining_deficit }
 */

export type AnalyticsEventName =
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'onboarding_step_skipped'
  | 'onboarding_step_completed'
  | 'onboarding_dismissed'
  | 'first_steps_checklist_clicked'
  | 'pdf_upload_completed'
  | 'pdf_upload_failed'
  | 'post_upload_cta_clicked'
  | 'first_simulation_started'
  | 'first_questions_generated'
  | 'style_profile_detected'
  | 'question_generation_started'
  | 'question_generation_completed'
  | 'question_generation_failed'
  | 'simulation_started_from_bank'
  | 'question_bank_exhausted';

export function track(event: AnalyticsEventName | string, properties?: Record<string, any>): void {
  try {
    const payload = {
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
    };

    // Log legível no console
    if (import.meta.env.DEV || localStorage.getItem('debug_analytics') === 'true') {
      console.log('[Analytics]', event, payload.properties);
    }
  } catch (err) {
    // Analytics nunca deve quebrar a execução da aplicação
    console.warn('Falha no tracking de analytics:', err);
  }
}

/**
 * Dispara o evento apenas UMA vez por usuário/navegador.
 * Retorna true se disparou, ou false se já havia sido registrado anteriormente.
 */
export function trackOnce(event: AnalyticsEventName | string, properties?: Record<string, any>): boolean {
  try {
    const key = `study_tracked_${event}`;
    if (localStorage.getItem(key)) {
      return false;
    }
    localStorage.setItem(key, new Date().toISOString());
    track(event, properties);
    return true;
  } catch (err) {
    console.warn('Falha no trackOnce:', err);
    return false;
  }
}
