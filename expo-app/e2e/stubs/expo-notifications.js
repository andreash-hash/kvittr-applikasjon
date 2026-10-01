// Web-test stub only for the web e2e harness (E2E_WEB=1) only.
const noopSub = () => ({ remove() {} });
module.exports = {
  setNotificationHandler() {},
  setNotificationChannelAsync: async () => {},
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false }),
  getPermissionsAsync: async () => ({ status: 'denied', granted: false }),
  getLastNotificationResponseAsync: async () => null,
  getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[web-test]' }),
  addNotificationResponseReceivedListener: noopSub,
  addNotificationReceivedListener: noopSub,
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
};
