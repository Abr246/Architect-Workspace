import express from 'express';
import fieldsRouter from './routes/fields';
import bookingsRouter from './routes/bookings';
import { requestLogger } from './middleware/requestLogger';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use('/api/fields', fieldsRouter);
  app.use('/api/bookings', bookingsRouter);
  return app;
}
