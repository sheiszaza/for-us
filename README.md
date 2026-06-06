# For Us ❤️

A private, romantic, mobile-first PWA for two people. Built with React, Vite, TypeScript, Tailwind CSS, Firebase, React Router, Framer Motion, Lucide React, and `vite-plugin-pwa`.

## Installation

```bash
npm install
```

## Firebase Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Add a Web app and copy the Firebase config values.
3. Enable Anonymous Authentication:
   - Authentication → Sign-in method → Anonymous → Enable.
4. Create Firestore Database in production mode.
5. Enable Firebase Storage.
6. Copy `.env.local.example` to `.env.local` and fill in the values.
7. Deploy rules when ready:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,storage
```

The app uses anonymous Firebase auth so Firestore and Storage rules can block unauthenticated access while keeping the couple login simple.

## Running Locally

```bash
npm run dev
```

Open the local Vite URL on your phone or desktop. The default local PINs are:

- Me: `1432`
- Her: `7777`

PIN changes are stored locally on the current device.

## Vercel Deployment

1. Push the project to GitHub.
2. Import the repository in [Vercel](https://vercel.com/).
3. Set the environment variables from `.env.local.example`.
4. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy.

## PWA Installation On iPhone

1. Open the deployed URL in Safari on iPhone.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Confirm the app name `For Us`.

The app includes mobile web app meta tags, a generated manifest, service worker support, safe-area styling, and an offline app shell.

## Environment Variables

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Vite is configured to expose `NEXT_PUBLIC_` variables through `envPrefix`.

## Firestore Collections

- `messages`: realtime chat messages with sender, timestamps, and seen flags.
- `memories`: timeline/grid memories with optional Firebase Storage images.
- `letters`: Open When letters.
- `countdowns`: live countdown targets.
- `dateIdeas`: planned, upcoming, and completed date ideas.

## Production Checks

```bash
npm run build
```

The build runs TypeScript first, then creates the Vite production bundle and PWA assets.
# for-us
