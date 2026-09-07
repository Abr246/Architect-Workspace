import express from 'express';
import fieldsRouter from './routes/fields';
import bookingsRouter from './routes/bookings';
import escalationsRouter from './routes/escalations';
import auditTrailRouter from './routes/auditTrail';
import { requestLogger } from './middleware/requestLogger';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use('/api/fields', fieldsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/escalations', escalationsRouter);
  app.use('/api/audit-trail', auditTrailRouter);
  return app;
}
