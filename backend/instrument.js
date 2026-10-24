// TP9: Sentry. Tiene que cargarse ANTES que la app (por eso el Dockerfile
// arranca con `node --import ./instrument.js index.js`): asi la libreria
// alcanza a medir Express y las consultas a Postgres desde el primer pedido.
//
// El DSN llega por el entorno (SENTRY_DSN, cargado solo en Render PROD). Si no
// esta (compose, tests, QA) la libreria queda apagada y la app anda igual.
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'production',
  tracesSampleRate: 1.0, // medir todos los pedidos: con el uso de la cursada sobra cuota
});
