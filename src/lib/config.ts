/* ═══════════════════════════════════════════════════════════════
   CONFIGURAÇÕES GERAIS — GS CRED
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
  'Olá! Preciso de ajuda com a plataforma GS CRED.';

/**
 * Monta o link do WhatsApp (wa.me) com mensagem opcional.
 */
export function buildWhatsappLink(message: string = SUPPORT_DEFAULT_MESSAGE): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/* ═══════════════════════════════════════════════════════════════
   PÁGINA DE VENDAS (/planos)
═══════════════════════════════════════════════════════════════ */

/**
 * Link do checkout (onde o botão "Assinar" leva).
 * >>> Cole aqui o link de checkout do seu produto quando tiver. <<<
 * Se ficar vazio, o botão abre o WhatsApp de vendas.
 */
export const CHECKOUT_URL = 'https://pay.cakto.com.br/ifmhc6c_1015990';

/** Preço exibido na página de planos. */
export const PLAN_PRICE = 'R$ 399';
export const PLAN_PERIOD = 'pagamento único';

/** Destino do botão de compra: checkout se configurado, senão WhatsApp de vendas. */
export function buildCheckoutLink(): string {
  return CHECKOUT_URL || buildWhatsappLink('Olá! Tenho interesse no sistema GS CRED. Pode me passar mais informações?');
}
