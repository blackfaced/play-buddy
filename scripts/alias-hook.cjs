// Verify-time module alias: map '@/...' imports (compiled from src) to the
// compiled output tree, so Node can run store-level verify scripts that
// import path-aliased modules. Usage: node -r ./scripts/alias-hook.cjs <script>
const path = require('node:path');
const Module = require('node:module');

const compiledSrc = path.join(__dirname, '..', 'node_modules', '.tmp-verify', 'src');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === '@' || request.startsWith('@/')) {
    request = path.join(compiledSrc, request.slice(2));
  }
  return origResolve.call(this, request, ...args);
};
