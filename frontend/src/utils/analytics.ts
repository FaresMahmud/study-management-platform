/**
 * Utility para instrumentação de funil e métricas de uso (Analytics).
 * Em ambiente de desenvolvimento, loga detalhadamente no console.
 * Suporta disparos únicos por usuário via localStorage (eventos "first_*").
 * Sempre opera em modo fire-and-forget (não bloqueante).
 */

export function track(event: string, properties?: Record<string, any>): void {
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
export function trackOnce(event: string, properties?: Record<string, any>): boolean {
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
