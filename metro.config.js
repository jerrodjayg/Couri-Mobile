const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// <- THE line that stops the Hermes “require” crash
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
