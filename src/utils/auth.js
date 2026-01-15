// utilitaires pour l'auth : normalisation téléphone + email synthétique
export function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D+/g, ''); // conserve seulement les chiffres
}

export function phoneToSyntheticEmail(phone) {
  const digits = normalizePhone(phone);
  return `${digits}@covoit.local`;
}