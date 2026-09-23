/**
 * Gera um código de convite legível e curto com 6 caracteres alfanuméricos em maiúsculas.
 * Exclui caracteres ambíguos como 0/O e 1/I para evitar confusão na digitação pelos pais.
 */
export function generateInviteCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}
