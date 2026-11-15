// The reminder is a local notification scheduled on the phone, so the app
// needs no push entitlement. expo-notifications adds one by default, which
// then requires a provisioning profile with the Push Notifications capability.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = (config) =>
  withEntitlementsPlist(config, (entitlements) => {
    delete entitlements.modResults['aps-environment'];
    return entitlements;
  });
