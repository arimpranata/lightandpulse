# Bali Guide

A Bali travel app (iOS, Android and web) with a MySQL database and a small PHP API. It is designed to run on Hostinger Cloud Hosting.

```
app/        Expo (React Native) app: mobile app and web version (see app/README.md)
api/        PHP 8.1+ read-only REST API that serves content from MySQL
database/   schema.sql, seed.sql, and scripts to generate the seed and check a deployment
deploy/     build.sh (produces the upload bundle) and the site's root .htaccess
```

The app works without the API, using content bundled into it. With the API connected, content edited in the database (places, itineraries, exchange rates, phrases and so on) reaches the app the next time it starts, without publishing a new app version.

## API

Base URL: `https://your-domain.com/api`

| Endpoint | Returns |
| --- | --- |
| `GET /health` | `{"status":"ok","database":"connected"}` |
| `GET /content` | Everything the app needs in one response (used by the app) |
| `GET /places` | Places, filterable with `?category=temple&region=ubud&q=lake&featured=1` |
| `GET /places/{id}` | One place, with highlights and tips |
| `GET /categories`, `GET /regions` | Lookup lists |
| `GET /itineraries`, `GET /itineraries/{id}` | Day-by-day trips |
| `GET /guide` | Currencies, phrases, essentials, etiquette and emergency numbers |

Responses are JSON, cached for 5 minutes (`cache_seconds` in `config.php`), and allow cross-origin requests (`cors_origins`).

## Deploying to Hostinger

### 1. Create the database

1. In **hPanel**, open your website and go to **Databases → MySQL Databases**.
2. Create a database and a user. Hostinger prefixes both names with your account ID, for example `u123456789_bali`. Write down the full database name, user name and password.
3. Open **phpMyAdmin** for that database and use **Import** to upload `database/schema.sql`, then `database/seed.sql`.

Re-importing `schema.sql` drops and recreates every table. Re-importing `seed.sql` on its own resets the content to the defaults.

### 2. Build the upload bundle

On your computer (Node 22+ required):

```bash
cd app && npm install && cd ..
deploy/build.sh https://your-domain.com/api
```

This creates:

- `build/bali-guide-public_html.zip`: the web app, the API and `.htaccess` files
- `build/database/`: copies of the SQL files

### 3. Upload the files

1. In hPanel, open **Files → File Manager → public_html**. Delete Hostinger's placeholder `default.php` if it is there.
2. Upload `bali-guide-public_html.zip` and **Extract** it into `public_html`. Make sure the hidden `.htaccess` files were extracted too.
3. In `public_html/api`, copy `config.example.php` to **`config.php`** and fill in the database name, user and password from step 1. Keep `'host' => 'localhost'`.

### 4. Configure the site

- **Advanced → PHP Configuration**: use PHP 8.1 or newer (8.3 recommended). `pdo_mysql` is enabled by default.
- **Security → SSL**: install the free SSL certificate and turn on **Force HTTPS**.

### 5. Verify

- Open `https://your-domain.com/api/health`. It should return `"status":"ok"`.
- Open `https://your-domain.com`. The web app should load, and deep links such as `/place/tanah-lot` should work.
- Optionally, from your computer: `node database/check-api.mjs https://your-domain.com/api`. This compares the live API with the app's bundled content.

### 6. Point the mobile app at the API

In `app/`, copy `.env.example` to `.env`, set `EXPO_PUBLIC_API_URL=https://your-domain.com/api`, then build with EAS (see `app/README.md`).

## Editing content

Edit rows directly in phpMyAdmin. For example, set `places.published = 0` to hide a place, `places.featured = 1` to show it in Top picks, or update `currencies.per_unit_idr` to change the converter's default rates. Changes appear in the app within about 5 minutes.

To change the default content for new installs, edit `app/src/data/*.ts` and run:

```bash
node database/generate-seed.mjs    # rewrites database/seed.sql
```

## Security notes

- `api/config.php` holds the database password. It is git-ignored, `.htaccess` blocks web access to it, and the build script never includes it in the bundle.
- The API is read-only and uses prepared statements throughout. With `debug` set to `false`, database errors are logged rather than shown to visitors.
