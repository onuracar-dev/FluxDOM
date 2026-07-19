# Security policy

## Supported versions

FluxDOM is a pre-1.0 prototype. Security fixes are applied to the latest commit
and latest published pre-release only. It is not yet recommended for production
or for rendering untrusted `.flow` source.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for
`onuracar-dev/FluxDOM`. Do not open a public issue with exploit details. Include
the affected package/version, reproduction, impact, and any suggested fix. You
should receive an acknowledgement within seven days.

Never execute untrusted compiler output. FluxDOM's SSR helper intentionally does
not evaluate component source.
