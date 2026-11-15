// Adds what app.json cannot express: local signing details that are not
// committed, and the removal of the unused push entitlement.
// Put APPLE_TEAM_ID=XXXXXXXXXX into .env.local to build for an iPhone.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
  },
  // Entitlement changes run in reverse order of this list, so the removal
  // comes first to take effect after expo-notifications has added its entry.
  plugins: ['./plugins/without-push', ...(config.plugins ?? []), 'expo-notifications'],
});
