// Validacion de los datos de contacto del formulario de reserva, antes de
// mandarlos al backend. Devuelve el primer problema que encuentra, o null si
// esta todo bien.

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarContacto({ nombre, telefono, email }) {
  if (!nombre || nombre.trim().length < 3) {
    return 'Ingresá tu nombre y apellido'
  }

  const digitos = (telefono || '').replace(/\D/g, '')
  if (digitos.length < 8) {
    return 'El teléfono tiene que tener al menos 8 dígitos'
  }

  // El email es opcional: solo se valida si lo completaron.
  if (email && !FORMATO_EMAIL.test(email)) {
    return 'El email no tiene un formato válido'
  }

  return null
}
