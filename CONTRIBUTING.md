# Contributing to FluxDOM

FluxDOM is experimental. Contributions should preserve that honest scope and
include tests for observable behavior.

1. Use Node.js 20.19 or newer and run `npm ci`.
2. Create a focused branch and make the smallest coherent change.
3. Run `npm test`, `npm run build`, and `npm run smoke:packages`.
4. Add compiler fixtures for syntax changes and update docs for public APIs.
5. Open a pull request describing behavior, trade-offs, and compatibility risk.

Do not commit generated `dist`, TypeScript build info, secrets, or local npm
configuration. Significant package-boundary changes require an ADR.
