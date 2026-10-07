import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { lookupTrack, SpotifyWall } from '../src/server/spotify.js';
import { parseSpotifyUrl, spotifyEmbed, spotifyKindWord } from '../src/shared/spotify.js';

test('only open.spotify.com track, album, playlist, episode and show links parse', () => {
  assert.deepEqual(parseSpotifyUrl('https://open.spotify.com/track/abc123'), {
    url: 'https://open.spotify.com/track/abc123',
    kind: 'track',
    id: 'abc123',
  });
  assert.deepEqual(parseSpotifyUrl('https://open.spotify.com/playlist/xyz?si=noise'), {
    url: 'https://open.spotify.com/playlist/xyz',
    kind: 'playlist',
    id: 'xyz',
  });
  for (const bad of ['not a link', 'https://example.com/track/abc', 'https://open.spotify.com/', 'https://open.spotify.com/user/someone', 42]) {
    assert.ok('error' in parseSpotifyUrl(bad), JSON.stringify(bad));
  }
  assert.equal(spotifyEmbed({ url: 'https://open.spotify.com/track/abc123', kind: 'track', id: 'abc123' }), 'https://open.spotify.com/embed/track/abc123?utm_source=generator&theme=0');
  assert.equal(spotifyKindWord('playlist'), 'Playlist');
});

test('the wall sets a track from oEmbed, persists it, and clears it', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ao-spotify-'));
  t.after(() => {
    (globalThis as { fetch?: unknown }).fetch = realFetch;
    rmSync(dir, { recursive: true, force: true });
  });
  const realFetch = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = async () => ({
    ok: true,
    json: async () => ({ title: 'Test Song', author_name: 'Test Artist', thumbnail_url: 'https://i.test/cover.jpg' }),
  });
  const wall = new SpotifyWall(dir);
  assert.equal(wall.state(), null);
  assert.deepEqual(await wall.set('https://open.spotify.com/track/abc123', 'Ada'), { changed: true });
  assert.deepEqual(wall.state(), {
    url: 'https://open.spotify.com/track/abc123',
    title: 'Test Song',
    artist: 'Test Artist',
    art: 'https://i.test/cover.jpg',
    by: 'Ada',
    at: wall.state()!.at,
  });
  // A restart reads it back.
  assert.equal(new SpotifyWall(dir).state()?.title, 'Test Song');
  assert.equal(wall.clear(), true);
  assert.equal(wall.state(), null);
  assert.equal(new SpotifyWall(dir).state(), null);
  assert.deepEqual(await wall.set('https://example.com/nope', 'Ada'), { error: 'Only open.spotify.com links go on the wall' });
});

test('an unreachable Spotify is an error, not a crash', async () => {
  const realFetch = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = async () => {
    throw new Error('down');
  };
  try {
    assert.deepEqual(await lookupTrack('https://open.spotify.com/track/abc123'), { error: 'Could not reach Spotify just now' });
  } finally {
    (globalThis as { fetch: unknown }).fetch = realFetch;
  }
});

test('when the lookup fails the link still goes up under its kind', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ao-spotify-fallback-'));
  t.after(() => {
    (globalThis as { fetch?: unknown }).fetch = realFetch;
    rmSync(dir, { recursive: true, force: true });
  });
  const realFetch = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = async () => {
    throw new Error('down');
  };
  const wall = new SpotifyWall(dir);
  assert.deepEqual(await wall.set('https://open.spotify.com/album/abc123', 'Ada'), { changed: true });
  assert.equal(wall.state()?.title, 'Album on Spotify');
  assert.equal(wall.state()?.url, 'https://open.spotify.com/album/abc123');
});
