# @fluxdom/server

Server-side primitives for FluxDOM's safe static subset. `renderStaticComponent`
serializes parsed static templates and rejects expressions or directives rather
than evaluating source. `renderToString` accepts a trusted callback and explicit
server DOM operations.

This package is not a general SSR or hydration solution yet.
