import { countryResponse } from '../../src/location/Country.mjs';
export async function onRequest(context) {
  if (new URL(context.request.url).pathname === '/api/location' && context.request.method === 'GET') return countryResponse(context.request);
  if (!context.env.API?.fetch) {
    return Response.json({ error: 'API_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
  return context.env.API.fetch(context.request);
}
