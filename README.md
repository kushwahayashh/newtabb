# New Tab

A personal start page with a full-screen wallpaper, movable photo widgets, a
live clock, and a random quote. Built with React and Vite.

![New Tab with a gradient wallpaper, clock, quote, and three photo widgets](demo.png)

![New Tab with a blue wallpaper and a different collection of photos](demo2.png)

Everyone starts with the same five default images. Your uploaded photos and
customizations stay in your own browser. No account or backend is required.

## Controls

| Action | How |
| --- | --- |
| Change wallpaper | Right-click the background, then choose **Choose wallpaper…** |
| Add a photo widget | Right-click the background or a widget, then choose **Add photo widget** |
| Move a widget | Drag the photo |
| Resize a widget | Right-click it, choose **Resize widget**, drag an edge or corner, then select **Done** |
| Change a widget's image | Right-click it, then choose **Choose image…** |
| Upload photos | Open either image picker and use **Upload images**, or drop image files into the picker |
| Delete a photo | Hover or focus a gallery tile, select the trash button, and confirm |
| Remove a widget | Right-click it and choose **Remove widget** |
| Dismiss a menu or dialog | Press **Escape** |

Context menus support the arrow keys, Home, End, and Escape.

Widgets scale proportionally with the window to keep their size and spacing
together. Their dimensions also adapt to browser zoom using that same layout
behavior. The clock uses your browser's locale and timezone; the quote changes
on page load and avoids immediately repeating the previous quote.

## Your photos and privacy

- Default wallpapers are bundled with the app and shared by all users.
- Uploaded photos are saved in **IndexedDB in your browser**. The app does not
  send their files to Vercel, GitHub, or another server.
- Wallpaper selection, widget layout, and the previous quote use `localStorage`.
- Deleting a default wallpaper hides it in your own gallery. It does not change
  the files provided to anyone else. Deleting an uploaded photo removes your
  local copy from the gallery.
- Photos and settings do not sync between browsers, profiles, or devices.
- Clearing this site's browser data removes your saved photos and settings.
  Private browsing and browser storage limits can also affect persistence. Keep
  your own copies of important photos.
- Storage is tied to the site's origin. Localhost, a preview deployment, and a
  custom domain have separate collections; changing domains does not transfer
  your existing photos.
- The app contains no analytics or tracking code. A hosting provider still
  receives the ordinary requests needed to serve the website and its defaults.

## Run locally

Use Node.js **22.12 or newer**, or Node.js **20.19 or newer within version 20**,
and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite.

```sh
npm test          # Image identity and saved-gallery validation checks
npm run build    # Production files in dist/
npm run preview  # Serve the production build locally
```

No environment variables, API keys, database, or server setup are needed.

## Deploy to Vercel

1. Push your copy of this repository to GitHub.
2. Import that repository as a new Vercel project.
3. Use the repository root and the **Vite** framework preset.
4. Deploy using the settings already recorded in `vercel.json`:

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |

Choose a Node.js version that satisfies the requirement above. No environment
variables are needed. The app currently has a single root page, so it does not
need a catch-all routing rewrite.

With Vercel's Git integration, pushes to your configured production branch
publish a new version; other branches can receive preview deployments. Choose
a stable public address so users keep the same browser storage origin.

See [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and
[Git deployment documentation](https://vercel.com/docs/git) for setup details.

## Use as a new-tab page

The deployed app is a website. Hosting it does not automatically replace your
browser's new-tab page. Use a browser extension that lets you choose a custom
new-tab URL, and point it at your hosted address. This repository does not
currently contain a browser extension or an offline service worker.

## Development

The app uses React state and plain CSS. `src/App.jsx` manages the page and saved
layout, `PhotoWidget.jsx` handles dragging and resizing, and `ImagePicker.jsx`
provides the shared gallery. `useGallery.js` manages gallery state and serializes
local saves through `galleryStorage.js`. `wallpapers.js` registers the defaults
and restores saved image choices. The clock updates independently, and
`ContextMenu.jsx` provides the shared pointer and keyboard menu behavior.

Default images live in `images/` and are picked up automatically at build time.
WebP is used for the current defaults to reduce download sizes while keeping
their original dimensions. Keep an image's filename stem when changing its
format so saved selections and hidden defaults can migrate. Existing JPG and
PNG image keys are supported by `src/imageKeys.js`.

When contributing, run `npm test` and `npm run build`. For interaction changes,
also check wallpaper selection, uploads, deletion, dragging, resizing, and
restoration after a refresh in a browser. Include window resizing in layout
checks.

## License and artwork

The application code and original documentation use the [MIT license](LICENSE).
Bundled wallpaper artwork is handled separately; see [ASSETS.md](ASSETS.md) for
the file list and the maintainer's redistribution confirmation. User-uploaded
photos are not part of this repository.
