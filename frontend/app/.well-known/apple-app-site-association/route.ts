// Apple universal links: lets curiocalc.org links open the CurioCalc iOS app.
// Served at /.well-known/apple-app-site-association as JSON (no file extension, per Apple).
const APP_ID = '7F36L8H2QU.org.curiocalc.app';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [APP_ID],
            components: [
              { '/': '/api/*', exclude: true },
              { '/': '/admin*', exclude: true },
              { '/': '/*' },
            ],
          },
        ],
      },
      webcredentials: { apps: [APP_ID] },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
