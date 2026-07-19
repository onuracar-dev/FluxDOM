# Changelog

FluxDOM is experimental and follows pre-1.0 Semantic Versioning.

## 0.1.0 - 2026-07-19

### Added

- Structural `.flow` parsing with nested `if` and `each` directives, reactive attributes, events, expressions, and filename-aware errors.
- Prototype analysis and direct DOM code generation.
- Fine-grained signals, effects, computed values, batching, and DOM operations.
- Virtual scoped-CSS output through the Vite plugin.
- Router, signal-backed store, safe static server serialization, and working CLI scaffold packages.
- Generated-app integration build, compiler fixtures, server guards, and runtime tests.
- Literal-safe route matching and cross-platform CLI command execution.
- A clean tarball consumer smoke test covering all seven public packages and a real CLI-driven Vite build.
- Security and contribution policies, architecture decision record, CI, package documentation, and interactive website.

### Security

- Removed dynamic source evaluation from static SSR. Dynamic templates now return a client-render mount point instead of executing component source.

### Known limitations

- General TypeScript AST transforms, keyed reconciliation, lifecycle hooks, source maps, robust HMR, nested route mounting, dynamic SSR, and non-destructive hydration are not complete.
- This release is an engineering prototype, not a production framework.
