export async function onRequest(context) {
  if (!context.env.API?.fetch) {
    return Response.json({ error: 'API_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
  return context.env.API.fetch(context.request);
}
