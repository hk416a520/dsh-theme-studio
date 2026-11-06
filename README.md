# Theme Studio for DSH

An appearance panel for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI: a left-sidebar entry that recolors the workbench with RGB values, switches the light/dark scheme, and sets a background image read from a local file.

Everything stays on your machine: the palette and the image live in this browser's `localStorage`, and the plugin makes no network calls.

English | [中文](./README.zh.md)

## Features

- **Left-sidebar entry** — a palette icon opens a full-page panel, next to the built-in Plugins and Schedules panels.
- **Colors by RGB** — 13 theme tokens grouped as backgrounds, text, accent, borders and states. Each row takes `R G B` (0–255) plus `A%` opacity, and can be reset on its own.
- **Two palettes** — a light and a dark palette are edited separately, so switching schemes never produces dark-on-dark or light-on-light text.
- **Background image** — pick a file from this device; it is re-encoded in the browser (long edge ≤ 1920 px) and stored locally. Fit as cover/contain/tile, with a dim slider and a preview.
- **Theme picker** — the scheme row lists the built-in Light / Dark / Follow system plus every other theme registered in the running client, so a separately installed theme is selectable here. A theme's card shows the name from a `theme.<id>` key in `locale/*.json`, and the raw id without one.
- **Instant and reversible** — changes preview immediately, persist across reloads, and disappear when the plugin is unloaded.

## Requirements

- DSH Web GUI `>= 0.2.1-rc.5` — the panel uses `ctx.theme.overrideTokens`, the `main` and `sidebar.panellist` slots, and the `--dsw-alias-*` token layer.

## Install

DSH installs a bundle through its Plugin Manager, which adds the package to the profile and selects its patch layer. In a DSH session, ask the agent:

> Install the plugin at <path, git URL, or tarball>.

or call the `plugin_manager` tool with `action: install_bundle` and that target. A local directory, a git URL, and a tarball all work.

`dsh plugin --profile <name> add <spec>` only records the dependency; it does not select the bundle layer, so prefer the Plugin Manager.

## Usage

1. Click the palette icon in the left sidebar.
2. **Color scheme** — pick Light, Dark or Follow system, or one of the extra theme cards.
3. **Colors** — choose the light or dark palette tab, type RGB values, or click a swatch to pick. `A` is opacity in percent: lower it to let a background image show through a surface.
4. **Background image** — choose a file, then set fit, dim and preview. Remove restores the plain surface.
5. **Reset all** in the header returns every token and the background to the theme's own values.

## How it works

- The panel registers a page into the `main` slot and an icon into `sidebar.panellist`; both are root-scoped, so they survive panel switches.
- Colors are applied with `ctx.theme.overrideTokens(source, { '<token>': { light, dark } })`. The theme registry is never written, sessions are never touched, and the layer is removed when the plugin unloads.
- An override layer stacks **above** the active theme. That is what makes this panel work with any theme, and also why it wins over a third-party theme's own values: the Colors section shows a notice when a non-built-in theme is active, with a pointer to **Reset all**.
- The background image is painted on the document root with the page background made transparent for it; panels that paint their own surface color stay opaque, which is why each surface has an opacity channel.
- Styling uses only documented `--dsw-alias-*` / `--dsw-specific-*` tokens. A renamed token makes that one element keep its default color instead of breaking the panel.

## Storage and privacy

| Key | Contents |
| --- | --- |
| `dsh-theme-studio:v1` | The two palettes, wallpaper data URL, fit and dim |

- No network requests, no telemetry, no session data.
- The wallpaper is decoded, scaled and re-encoded with a canvas before storage, and capped at about 2.6 MB of data URL so the browser accepts it; larger images are rejected with a visible message rather than silently dropped.
- Clearing site data for the DSH origin resets the plugin.

## Development

There is no build step: `client.js` is plain browser JavaScript, loaded as a `window.__ModuleLoader__` factory. React comes from the page's module table, so no Harness Client package is imported.

```
package.json        manifest: dsh.bundle.patch + dsh.client
cordis.patch.yml    inserts the `theme-studio` row
index.js            Host half (registers nothing)
client.js           panel, palette, wallpaper, persistence
locale/en.json      Plugin Manager title and description
locale/zh.json      same, Chinese
icon.svg            plugin icon (exported as ./icon)
scripts/check.mjs   manifest + syntax + locale + icon check
```

```sh
npm run check
```

## Publishing checklist

1. Fill `author`, `homepage`, `repository` and `bugs` in `package.json`.
2. Renaming the package touches three places, and all three must agree:
   - `package.json` → `name`
   - `cordis.patch.yml` → the inserted row's `name`
   - `client.js` → the module `id` and the `SOURCE` prefix
3. Bump `version` and add a `CHANGELOG.md` entry.
4. `npm publish`, or keep it GitHub-only — installing from a git URL works either way.

## License

[MIT](./LICENSE)
