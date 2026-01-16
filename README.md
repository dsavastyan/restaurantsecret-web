# restaurantsecret-web

**RestaurantSecret — Frontend Application**

This repository contains the user interface and client-side logic for RestaurantSecret. It is built as a modern Single Page Application (SPA) that functions seamlessly as a web app, a Progressive Web App (PWA), and a Telegram Mini App.

## Core Functionality

- **Restaurant Discovery**: Browsing and searching for restaurants and dishes using Cloudflare-backed search.
- **Nutrition Tracking**: Interactive dish cards and menus with detailed nutrition breakdown.
- **User Authentication**: Secure login via email OTP handled by the PD-API.
- **Subscription Management**: Subscription-aware UI with integrated paywalls and feature gating.
- **Map Integration**: Interactive maps for locating restaurants using Leaflet.
- **Cross-Platform**: Optimized for both standard browsers and Telegram's WebView environment.

## Repository Structure

```text
├── public/             # Static assets (icons, manifest.json, etc.)
├── src/
│   ├── api/            # API client and request handlers
│   ├── app/            # Global application state and providers
│   ├── components/     # Reusable UI components (Modals, Cards, UI kit)
│   ├── config/         # App configuration (API endpoints, constants)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries and helpers
│   ├── pages/          # Page components (Home, Search, Restaurant details, Account)
│   ├── routes/         # Routing logic
│   ├── store/          # State management (Zustand stores)
│   ├── styles.css      # Main CSS file (Vanilla CSS)
│   └── main.jsx        # Application entry point
├── tests/              # E2E tests (Playwright)
├── index.html          # HTML entry point
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Starts the Vite development server with hot module replacement. |
| `npm run build` | Compiles the application for production and prepares the `/dist` folder. |
| `npm run preview` | Locally previews the production build. |
| `npm run test:e2e` | Runs end-to-end tests using Playwright. |

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Setup environment variables**:
   Create a `.env` file (if applicable) or ensure `src/config/index.js` points to the correct API endpoints.
3. **Run in development mode**:
   ```bash
   npm run dev
   ```

## Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router 6
- **Maps**: Leaflet & React Leaflet
- **Styling**: Vanilla CSS
