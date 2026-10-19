# Interact Studio

A local-first Electron toolkit for live-stream danmaku interactions. It currently ships three tools:

- **Dice** — viewers send `!power 80` (0–100); the dice launches from a pad, with power controlling launch speed and spin. The camera follows the dice.
- **Wheel** — host-triggered; option labels are rendered on the sectors and rotate with the wheel. The center brand mark acts as the pointer.
- **Vote** — viewers vote with `!vote 1` or an option label; a large countdown and live tally are shown.

Also included:

- Named presets for wheel and vote configurations
- Collapsible or hidden live-feed sidebar (for streamers using their own danmaku client)
- In-app result overlay suitable for OBS window capture
- Anonymous read-only Bilibili danmaku adapter and a local mock source
- Window placement on the cursor's monitor, or a selected monitor

## Development

~~~bash
npm install
npm run dev
~~~

Verification:

~~~bash
npm run typecheck
npm run lint
npm run test
npm run build
~~~

Installers (the build scripts produce x64 and arm64):

~~~bash
npm run package:win    # Windows NSIS + portable
npm run package:mac    # macOS dmg + zip
npm run package:linux  # Linux AppImage + deb
~~~

## License

MIT. See [LICENSE](./LICENSE).
