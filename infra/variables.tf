# La organizacion de Neon donde se crea el proyecto. No es un secreto, pero es
# propia de cada cuenta: se pasa por el entorno como TF_VAR_neon_org_id.
variable "neon_org_id" {
  type = string
}

# Las imagenes del TP7 en ghcr.io. Van SIN la etiqueta: Render la pide aparte.
variable "image_repo_api" {
  type    = string
  default = "ghcr.io/valenboiero03/ingsoft3-tps2026-backend"
}

variable "image_repo_front" {
  type    = string
  default = "ghcr.io/valenboiero03/ingsoft3-tps2026-frontend"
}

# La imagen de un merge concreto (el cierre del TP7, a23f8b7). Cambiarla es un PR,
# y en Render free no se puede actualizar en caliente: se recrea con -replace.
variable "image_tag" {
  type    = string
  default = "sha-a23f8b7731167ec164a35b4e71ec48bbc0985d5f"
}

# Ohio: la misma zona que la base de Neon (us-east-2), para que la api quede cerca.
variable "region" {
  type    = string
  default = "ohio"
}
