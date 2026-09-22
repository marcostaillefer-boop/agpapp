const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I, para evitar confusiones

export function generarCodigo(longitud = 8) {
  let codigo = '';
  for (let i = 0; i < longitud; i++) {
    codigo += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return codigo;
}
