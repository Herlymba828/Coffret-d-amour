import { Router, RequestHandler, RouterOptions } from 'express';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function wrap(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Router Express dont les handlers async sont automatiquement reliés à `next()`.
 * Express 4 ignore les promesses rejetées : sans ce wrapper, une erreur SQL
 * laisse la requête pendante et fait tomber le process (unhandledRejection).
 */
export function asyncRouter(options?: RouterOptions): Router {
  const router = Router(options);

  for (const method of METHODS) {
    const original = router[method].bind(router) as (
      path: string,
      ...handlers: RequestHandler[]
    ) => Router;

    (router as unknown as Record<string, unknown>)[method] = (
      path: string,
      ...handlers: RequestHandler[]
    ) => original(path, ...handlers.map(wrap));
  }

  return router;
}
