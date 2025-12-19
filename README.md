# restaurantsecret-web

RestaurantSecret — Web (Frontend)

Frontend application for RestaurantSecret.
Single codebase that runs as:

Web app in browser

Progressive Web App (PWA)

Telegram Mini App (WebView)

This repo contains UI + client-side logic only.
All sensitive operations are handled by PD-API (Cloud.ru).

What this app does

Public browsing (restaurants, dishes)

Search (via Cloudflare Worker)

User login via email OTP

Subscription-aware UI (paywall, badges)

Dish cards, menus, nutrition display

Works inside Telegram Mini App


Frontend trusts PD-API as source of truth.

