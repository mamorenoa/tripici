// Metro config wrapped with NativeWind so the bundler picks up
// global.css and emits Tailwind classes for both web and native.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
