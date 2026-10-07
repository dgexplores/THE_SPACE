import './ui.css';
import type { Net } from '../../net';
import { parseSpotifyUrl, spotifyEmbed } from '../../../shared/spotify';
import { store } from '../../state';
import { h, openModal } from '../../ui/dom';

/** The 🎵 Spotify window: what's on the wall, a box to put a link up, and the way to play it. */
export function openSpotify(net: Net) {
  const body = h('div.body');
  const close = h('button.btn.close', { 'aria-label': 'Close' }, '✕');
  const footer = h(
    'footer',
    {},
    h('span.grow', {}, 'Playback stays in Spotify: the wall shows what the floor picked.'),
  );
  const el = h(
    'div.modal.spotify',
    { role: 'dialog', 'aria-label': 'Spotify', style: 'width:min(560px,100%)' },
    h('header', {}, h('h2', {}, '🎵 Spotify'), close),
    body,
    footer,
  );

  const render = () => {
    const s = store.spotify;
    const play = s ? player(s.url) : null;
    const input = h('input', {
      type: 'text',
      placeholder: 'Paste a Spotify link: track, album, playlist…',
      'aria-label': 'Spotify link',
      spellcheck: 'false',
      autocomplete: 'off',
    }) as HTMLInputElement;
    const put = h(
      'button.btn.primary',
      {
        type: 'button',
        onclick: () => {
          if (input.value.trim()) net.send({ t: 'spotify.set', url: input.value.trim() });
        },
      },
      'Put on the wall',
    );
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') put.click();
    });
    body.replaceChildren(
      s
        ? h(
            'div.sp-now',
            {},
            s.art ? h('img.sp-art', { src: s.art, alt: '' }) : null,
            h(
              'div.svc-main',
              {},
              h('div.svc-title', {}, s.title),
              h('div.svc-meta', {}, [s.artist, s.by ? `put on by ${s.by}` : ''].filter(Boolean).join(' · ')),
            ),
          )
        : h('p.note', { style: 'margin:0 0 12px' }, 'The wall is bare. Paste a track, album or playlist and the whole floor sees it.'),
      h('div.sp-paste', {}, input, put),
      s
        ? h(
            'div.seg',
            { style: 'margin-top:12px' },
            h('a.btn', { href: s.url, target: '_blank', rel: 'noopener' }, 'Open in Spotify ↗'),
            h(
              'button.btn',
              {
                type: 'button',
                onclick: () => net.send({ t: 'spotify.clear' }),
              },
              'Take it down',
            ),
          )
        : h(
            'div.seg',
            { style: 'margin-top:12px' },
            h('a.btn', { href: 'https://open.spotify.com/', target: '_blank', rel: 'noopener' }, 'Open Spotify ↗'),
          ),
      ...(play ? [play] : []),
    );
    const box = body.querySelector('input');
    if (box && !s) (box as HTMLInputElement).focus();
  };

  /** The playable embed, right in the window: Spotify builds this player for embedding. */
  function player(url: string): HTMLElement | null {
    const link = parseSpotifyUrl(url);
    if ('error' in link) return null;
    const frame = h('iframe.sp-player', {
      src: spotifyEmbed(link),
      height: '152',
      width: '100%',
      frameborder: '0',
      allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
      loading: 'lazy',
      title: 'Play it in Spotify',
    }) as HTMLIFrameElement;
    return frame;
  }

  const off = store.on('spotify', render);
  const modal = openModal(el, {
    doing: '🎵 at the Spotify wall',
    onClose: () => off(),
  });
  close.addEventListener('click', () => modal.close());
  render();
}
