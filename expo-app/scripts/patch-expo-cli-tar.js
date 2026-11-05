// @expo/cli (SDK 52) reads tar's default export, which tar 7 does not have, so
// `expo prebuild` fails on EAS with "Cannot read properties of undefined (reading 'extract')".
// package.json pins tar to 7.x (older versions are blocked by Replit's package firewall),
// so make @expo/cli use tar's named exports. Runs from npm postinstall (EAS runs eas-build-post-install only after prebuild, too late); idempotent.
const fs = require('fs');
const path = require('path');

const files = ['npm.js', 'tar.js'].map((f) =>
  path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'build', 'src', 'utils', f),
);
const FROM = '_interopRequireDefault(require("tar"))';
const TO = '{ default: require("tar") }';

let patched = 0;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(FROM)) continue;
  fs.writeFileSync(file, src.split(FROM).join(TO));
  patched += 1;
  console.log(`[patch-expo-cli-tar] patched ${path.relative(process.cwd(), file)}`);
}
console.log(`[patch-expo-cli-tar] done (${patched} file(s) patched)`);
