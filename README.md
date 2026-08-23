<h1 align="center">iOS Font Installer</h1>

A browser-based tool for installing static TrueType and OpenType fonts on iOS and iPadOS using Apple configuration profiles.

Originally based on [toast-riot/iOS-Font-Installer](https://github.com/toast-riot/iOS-Font-Installer) and substantially rewritten with a new TypeScript application, build system, interface, and Google Fonts integration.

## Features

- Browse installable static styles from the [Google Fonts Developer API](https://developers.google.com/fonts/docs/developer_api).
- Upload local `.ttf` and `.otf` files.
- Detect and reject variable fonts, web fonts, corrupt files, and font collections.
- Generate the profile locally; font data is never uploaded to this project.
- Mobile-first interface with explicit profile preparation and installation steps.

> This does not change the iOS system font. Installed fonts are available only in apps that support custom fonts.

## Development

Requirements: Node.js 24 or newer.

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm run typecheck
npm test
npm run build
npm run check
```

The app uses Vite, strict TypeScript, `plist` v5, and Vitest. Production output is written to `dist/`.

## Updating the Google Fonts catalog

The generated catalog contains the static `.ttf` variants returned by the Google Fonts Developer API. The catalog is git-ignored and regenerated before deployment.

Enable the Google Fonts Developer API, create an API key, and copy the example environment file:

```sh
cp .env.example .env
# Edit .env and replace the placeholder with your key.
npm run catalog
```

Node loads `.env` natively; no dotenv package is used. Only `GOOGLE_FONTS_API_KEY` is read by the Node-based catalog generator. It is not exposed to Vite or included in the browser bundle. The API returns standard static instances by default, including for variable-font families, because Apple font profiles cannot install variable fonts directly.

## Deployment

Pull requests and pushes run typechecking, tests, and a production build. Pushes to `main` generate the catalog and deploy the `dist/` artifact through GitHub Actions. Add the API key as a repository Actions secret named `GOOGLE_FONTS_API_KEY`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Installation

1. Choose a Google Fonts family and one or more static styles, or upload local font files.
2. Configure the profile name, description, and identifier if desired.
3. Prepare and download the profile.
4. On iOS or iPadOS, open Settings, tap **Profile Downloaded**, and follow the installation prompts.

## License

The application source is licensed under the terms in [LICENCE](LICENCE). Fonts retain their own upstream licenses.
