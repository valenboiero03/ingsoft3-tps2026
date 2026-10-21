// Todas las llamadas al backend pasan por aca. La logica vive en
// lib/cliente.js; este archivo solo le conecta el fetch real del navegador.
// La URL es relativa a proposito: en produccion la resuelve nginx y en
// desarrollo el proxy de vite.config.js.

import { crearCliente } from './lib/cliente.js'

const cliente = crearCliente((url, opciones) => fetch(url, opciones))

export const {
  getNegocio,
  getServicios,
  getProfesionales,
  getDisponibilidad,
  crearTurno,
  cancelarTurno,
} = cliente
