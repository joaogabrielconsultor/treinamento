/* ═══════════════════════════════════════════════════════════════
   CONFIGURAÇÕES GERAIS — Aprova Mais
═══════════════════════════════════════════════════════════════ */

/**
 * Número de WhatsApp do suporte, no formato internacional só com dígitos:
 * 55 (Brasil) + DDD + número.  Ex.: 5511912345678
 *
 * >>> ALTERE AQUI para o seu número de WhatsApp. <<<
 */
export const SUPPORT_WHATSAPP = '5591985289909';

/** Mensagem que já vem preenchida ao abrir o WhatsApp. */
export const SUPPORT_DEFAULT_MESSAGE =
  'Olá! Preciso de ajuda com a plataforma Aprova Mais.';

/**
 * Monta o link do WhatsApp (wa.me) com mensagem opcional.
 */
export function buildWhatsappLink(message: string = SUPPORT_DEFAULT_MESSAGE): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
