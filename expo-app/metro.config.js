const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/global.css' });

// Web e2e harness (Playwright, see e2e/). Only active with E2E_WEB=1; native
// builds are unaffected. expo-notifications / expo-file-system have no web
// implementation, so the browser run gets tiny stubs instead.
if (process.env.E2E_WEB === '1') {
  const path = require('path');
  const original = module.exports.resolver.resolveRequest;
  module.exports.resolver.resolveRequest = (ctx, name, platform) => {
    if (platform === 'web' && (name === 'expo-notifications' || name === 'expo-file-system')) {
      return { type: 'sourceFile', filePath: path.join(__dirname, 'e2e', 'stubs', `${name}.js`) };
    }
    return (original || ctx.resolveRequest)(ctx, name, platform);
  };
}
