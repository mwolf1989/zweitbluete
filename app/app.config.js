// Adds local signing details to app.json without committing them.
// Put APPLE_TEAM_ID=XXXXXXXXXX into .env.local to build for an iPhone.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
  },
});
