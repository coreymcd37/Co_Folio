# All the Best Internet Utilities

Privacy-first standalone toolkit of browser utilities by **Corey McDaniel**.

## Live demo

- GitHub Pages: https://coreymcd37.github.io/Co_Folio/utilities/
- Portfolio home: https://coreymcd37.github.io/Co_Folio/
- Future custom domain: https://coreymcdaniel.com/utilities/ (planned; path retained)

## NOTICE — Demo only · All rights reserved

© 2026 Corey McDaniel. All rights reserved.

You may use the live demo in a browser. You may **not** copy, redistribute, republish,
or host this toolkit (or its source / obfuscated bundles) elsewhere. See the root
[`LICENSE`](../LICENSE) for the full proprietary terms.

Shipped JavaScript in this folder is obfuscated or minified for casual-theft resistance.
Client-side code cannot be made truly unstealable.

## Architecture

- Static HTML, CSS, and JavaScript
- `js/catalog.js` — categories and tool index (minified)
- `js/core.js` — navigation, search, footer (obfuscated)
- `js/tools.js` — tool implementations (heavily obfuscated)
- Relative `css/` / `js/` paths; `BASE` auto-detects `/utilities` under project Pages or apex domain

## Privacy

Default processing is in-browser. The DNS tool is the only optional third-party call
(Cloudflare DoH, user-initiated). See [`privacy.html`](./privacy.html).
