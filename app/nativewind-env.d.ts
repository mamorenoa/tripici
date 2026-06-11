/// <reference types="nativewind/types" />

// Allow side-effect CSS imports (global.css) — bundled by Metro via
// NativeWind, no value to consume in JS.
declare module "*.css" {}
