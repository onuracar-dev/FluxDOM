import { describe, expect, it } from 'vitest';

import { matchRoute, type Route } from '../src/matcher.js';

const component = async () => ({});

describe('matchRoute', () => {
  it('matches dynamic parameters and ignores query strings', () => {
    const routes: Route[] = [{ path: '/users/[userId]/posts/[postId]', component }];

    expect(matchRoute('/users/42/posts/7?preview=true', routes)?.params).toEqual({
      userId: '42',
      postId: '7',
    });
  });

  it('treats regex metacharacters in static route text literally', () => {
    const route: Route = { path: '/docs/v1.0/[slug]', component };

    expect(matchRoute('/docs/v1.0/start', [route])?.params.slug).toBe('start');
    expect(matchRoute('/docs/v1x0/start', [route])).toBeNull();
  });

  it('does not throw for literal parentheses in a route', () => {
    const route: Route = { path: '/releases/(draft)', component };

    expect(matchRoute('/releases/(draft)', [route])?.route).toBe(route);
    expect(matchRoute('/releases/draft', [route])).toBeNull();
  });
});
