# ADR-0001: Keep FluxDOM and NimbleJS independently versioned

## Status

Accepted on 2026-07-19.

## Context

FluxDOM contains a tuple-based signal runtime optimized for compiler output.
NimbleJS is a framework-agnostic state toolkit with an object-based public API,
stores, history, and persistence. Both projects currently implement signals,
effects, computed state, dependency cleanup, and batching concepts.

FluxDOM's compiler/runtime contract is still experimental. Making FluxDOM
depend on NimbleJS now would either expose NimbleJS internals to generated code
or force one project's public API to follow the other's immature requirements.
Keeping two completely unrelated semantic models, however, would make bugs and
future convergence harder to reason about.

## Decision drivers

- NimbleJS must remain usable without a renderer, compiler, or browser DOM.
- FluxDOM must be free to optimize generated code and runtime helpers together.
- Neither project should claim API stability before real-world usage supports it.
- Shared reactivity terms should have observable, testable meanings.
- A future integration must be reversible and benchmarked, not assumed.

## Considered options

### Make NimbleJS the FluxDOM runtime now

This removes duplicate code, but couples two experimental APIs, increases the
framework bundle surface, and makes compiler-specific optimization harder.

### Fork NimbleJS into FluxDOM

This gives FluxDOM control, but creates unclear ownership and guarantees that
the implementations drift.

### Keep independent packages with a shared semantic boundary

This retains autonomy while documenting common observable behavior. It costs
some duplicate implementation and conformance work.

## Decision

FluxDOM will keep `@fluxdom/runtime`; it will not depend on NimbleJS while either
public API is pre-1.0. NimbleJS remains framework-agnostic and must not import
FluxDOM packages.

The projects share only these conceptual guarantees:

1. Reading a signal in an active effect subscribes that effect.
2. Effects discard dependencies that were not read during their latest run.
3. Stopped effects do not run again and execute their final cleanup once.
4. Computed values notify consumers when their derived value changes.
5. A batch coalesces multiple writes so each affected effect runs once after the
   outermost batch completes.
6. Writing an `Object.is`-equal value does not notify consumers.

Each repository tests these behaviors against its own public API. This is a
semantic agreement, not a shared package or cross-repository test dependency.

## Consequences

### Positive

- NimbleJS remains useful to vanilla JS, Web Components, and other frameworks.
- FluxDOM can keep its compiler-friendly getter/setter tuple API.
- Either runtime can evolve without lockstep releases.
- A later adapter or consolidation has explicit compatibility criteria.

### Negative

- Similar low-level code exists in two repositories.
- Fixes may need to be applied and tested twice.
- "Compatible concepts" must not be presented as API compatibility.

### Revisit criteria

Write a superseding ADR only after both projects have usage data, benchmarked
bundle/runtime costs, and a migration design. Plausible future outcomes are a
small adapter package, a shared internal core, or continued independence.
