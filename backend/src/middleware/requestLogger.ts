import { Request, Response, NextFunction } from 'express';

// Structured JSON request log, per this repo's Observability Framework
// (CLAUDE.md). Applied globally so every route gets it for free — this is
// what makes STORY-001's "all field availability views are logged with
// timestamps" true, without hard-coding logging into that one route.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    // req.path gets consumed as the request traverses into a mounted
    // sub-router (it's relative to the sub-router by the time this fires),
    // so build the event name from req.originalUrl instead — that stays
    // the full path for the life of the request.
    const fullPath = req.originalUrl.split('?')[0];
    const logLine = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : 'info',
      service: 'backend',
      event: `${req.method.toLowerCase()}_${(fullPath.replace(/^\/|\/$/g, '') || 'root').replace(/\//g, '_')}`,
      duration_ms: Date.now() - startedAt,
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      context: { method: req.method, path: fullPath, status: res.statusCode },
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logLine));
  });

  next();
}
