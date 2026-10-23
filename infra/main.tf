terraform {
  required_version = ">= 1.5"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "0.18.0" # fijada: el repo del provider esta archivado
    }
    render = {
      source  = "render-oss/render"
      version = "1.9.1"
    }
  }
}

# Ninguna credencial en el codigo: cada provider la lee del entorno.
provider "neon" {}   # NEON_API_KEY
provider "render" {} # RENDER_API_KEY y RENDER_OWNER_ID

# Sin bloque backend: el estado queda en infra/terraform.tfstate (ignorado por git).

# --- La base de PREPROD: un proyecto de Neon propio, que no existe hasta el apply ---
# Proyecto aparte (y no una base mas en el de QA/PROD): se destruye entero sin tocarlos.

resource "neon_project" "preprod" {
  name   = "turnero-preprod"
  org_id = var.neon_org_id # la cuenta de Neon esta dentro de una organizacion

  # Region fijada: sin esto Neon elige una por defecto y el preprod recreado
  # no queda identico (paso de us-east-2 a us-east-1). Ohio, como Render.
  region_id = "aws-us-east-2"

  # El provider pide 86400 s de historial por defecto y el plan gratuito permite 21600.
  history_retention_seconds = 21600
}

resource "neon_role" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id # default_branch_id, NO branch_id
  name       = "turnero_preprod_owner"
}

resource "neon_database" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id
  name       = "turnero_preprod"
  owner_name = neon_role.preprod.name
}

# --- Los dos servicios de PREPROD en Render, con la imagen del TP7 ---

locals {
  # La cadena de conexion se ARMA con lo que devolvio Neon: nadie la copia y pega.
  # urlencode por si la contrasena trae caracteres especiales.
  database_url = "postgresql://${neon_role.preprod.name}:${urlencode(neon_role.preprod.password)}@${neon_project.preprod.database_host}/${neon_database.preprod.name}?sslmode=require"
}

resource "render_web_service" "api" {
  name   = "turnero-api-preprod"
  plan   = "free"
  region = var.region

  runtime_source = {
    image = {
      image_url = var.image_repo_api # SIN la etiqueta
      tag       = var.image_tag      # la etiqueta va en su propio campo
    }
  }

  # GIT_COMMIT NO va aca: viene horneado en la imagen y una variable del servicio lo pisaria.
  env_vars = {
    DATABASE_URL = { value = local.database_url }
  }
}

resource "render_web_service" "front" {
  name   = "turnero-front-preprod"
  plan   = "free"
  region = var.region

  runtime_source = {
    image = {
      image_url = var.image_repo_front
      tag       = var.image_tag
    }
  }

  env_vars = {
    # La URL sale del atributo de SU api, no de un copy-paste. Sin barra final (TP6).
    BACKEND_URL  = { value = trimsuffix(render_web_service.api.url, "/") }
    DNS_RESOLVER = { value = "8.8.8.8" }
  }
}
