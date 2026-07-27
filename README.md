# DANFE Online

📄 **DANFE Visualization & Generation — 100% in the Browser**

A modern, progressive web application for generating and visualizing Brazilian electronic invoice documents (DANFE — Documento Auxiliar da Nota Fiscal Eletrônica). Supports offline XML-to-PDF generation, online API lookup by access key, camera barcode scanning, and a comprehensive municipal NF-e consultation directory — all packaged in a lightweight Docker container.

<!-- buttons -->
[![Stars](https://img.shields.io/github/stars/ivancarlosti/danfeonline?label=⭐%20Stars&color=gold&style=flat)](https://github.com/ivancarlosti/danfeonline/stargazers)
[![Watchers](https://img.shields.io/github/watchers/ivancarlosti/danfeonline?label=Watchers&style=flat&color=red)](https://github.com/sponsors/ivancarlosti)
[![Forks](https://img.shields.io/github/forks/ivancarlosti/danfeonline?label=Forks&style=flat&color=ff69b4)](https://github.com/sponsors/ivancarlosti)
[![Downloads](https://img.shields.io/github/downloads/ivancarlosti/danfeonline/total?label=Downloads&color=success)](https://github.com/ivancarlosti/danfeonline/releases)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/ivancarlosti/danfeonline?label=Activity)](https://github.com/ivancarlosti/danfeonline/pulse)
[![GitHub Issues](https://img.shields.io/github/issues/ivancarlosti/danfeonline?label=Issues&color=orange)](https://github.com/ivancarlosti/danfeonline/issues)  
[![License](https://img.shields.io/github/license/ivancarlosti/danfeonline?label=License)](LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/ivancarlosti/danfeonline?label=Last%20Commit)](https://github.com/ivancarlosti/danfeonline/commits)
[![Security](https://img.shields.io/badge/Security-View%20Here-purple)](https://github.com/ivancarlosti/danfeonline/security)
[![Code of Conduct](https://img.shields.io/badge/Code%20of%20Conduct-2.1-4baaaa)](https://github.com/ivancarlosti/danfeonline?tab=coc-ov-file)
<!-- endbuttons -->

---

## Features

### 📄 DANFE PDF Generation (Offline)
- **XML Upload** — Drag-and-drop or select an NFe XML file. Parses the official `http://www.portalfiscal.inf.br/nfe` namespace and extracts all fields: emitter, recipient, products, taxes (ICMS, IPI), transport, and totals.
- **Authentic Layout** — Generates a pixel-perfect DANFE PDF matching the official SEFAZ layout with all quadrants (A through H), product table, tax calculation, transport details, and access key barcode area.
- **100% Offline** — XML parsing and PDF generation happen entirely in the browser using `pdfmake`. No server-side processing, no API calls, no internet required.

### 🔑 Access Key Lookup (Online)
- **44-Digit Key Input** — Masked input field with real-time digit counter, paste support, and validation.
- **Meu Danfe API Integration** — Server-side PHP proxy forwards access keys to the Meu Danfe API v2, retrieves the official DANFE PDF, and returns it to the browser.
- **Smart Retry Logic** — If the NFe is not yet in the account, the proxy automatically adds it via the API and polls until the SEFAZ query completes (up to 30 seconds).

### 📸 Camera Barcode Scanner
- **Quagga2 Barcode Detection** — Scan the 44-digit access key directly from the DANFE barcode using your device's camera (Code 128 and Code 39).
- **Dual Context** — Use the scanner from the "Search by Key" tab (auto-fills the input) or from the "Upload XML" tab (copies the key for SEFAZ portal use).
- **Camera Controls** — Toggle front/rear camera, retry, and zoom slider for fine-tuning barcode detection.

### 🌐 NF-e Municipal Consultation Directory
- **National System Banner** — Quick link to the unified national NFS-e public query portal (`nfse.gov.br`).
- **45+ Municipalities** — Searchable, filterable table of city-level NF-e consultation portals across all Brazilian states, with system classification (GINFES, Nota Paulistana, Nota Carioca, and independent portals).
- **GINFES Tip** — Helpful note explaining how to use other GINFES-based city portals.

### 🎨 Modern UI/UX
- **Dark & Light Themes** — Full dark mode support with persistent preference stored in `localStorage`.
- **Internationalization** — Portuguese (pt), English (en), and Spanish (es) translations for all UI strings.
- **Toast Notifications** — Non-intrusive, auto-dismissing notifications for success, error, warning, and info messages.
- **Loading Overlay** — Context-aware loading messages for each processing stage.
- **Responsive Design** — Works on desktop, tablet, and mobile with adaptive layouts.

### 🔐 Flexible Authentication
Three auth modes configurable via environment variable:

| Mode | Description |
|------|-------------|
| `none` | No authentication (default, open access) |
| `account` | HTTP Basic Authentication with username/password |
| `keycloak` | OpenID Connect SSO via Keycloak with optional email restriction |

### 🐳 Docker-Ready
- **Lightweight Image** — Based on `php:8.3-cli-alpine` (~30 MB compressed).
- **Multi-Arch** — Automatic builds for `linux/amd64` and `linux/arm64` via GitHub Actions.
- **Non-Root** — Container runs as unprivileged `phpuser` (UID 1000).
- **Reverse Proxy Ready** — Configurable `PORT` and `DOMAIN` environment variables for seamless integration behind Nginx, Traefik, Caddy, or any reverse proxy.

---

## Architecture

```
┌────────────────────────┐      ┌─────────────────────────┐
│    Docker Container    │      │   Meu Danfe API v2      │
│                        │      │   (external, SaaS)      │
│  ┌──────────────────┐  │      │                         │
│  │ danfeonline_app  │  │      │  api.meudanfe.com.br    │
│  │                  │  │      │                         │
│  │  ┌────────────┐  │  │      │  GET  /fd/get/da/{key}  │
│  │  │ index.html │  │  │      │  PUT  /fd/add/{key}     │
│  │  │ app.js     │──┼──┼──┐   │                         │
│  │  │ styles.css │  │  │  │   └─────────────────────────┘
│  │  └────────────┘  │  │  │
│  │                  │  │  │   ┌─────────────────────────┐
│  │  ┌────────────┐  │  │  │   │   Keycloak (optional)   │
│  │  │ proxy.php  │──┼──┼──┤   │                         │
│  │  │ auth.php   │  │  │  │   │  OIDC /userinfo         │
│  │  └────────────┘  │  │  │   └─────────────────────────┘
│  │        │         │  │  │
│  │  Static files ───┼──┼──┼──► Port 8080
│  │  (no processing) │  │  │    (configurable)
│  └──────────────────┘  │  │
└────────────────────────┘  │
                            │
                     Browser (SPA)
```

### Data Flow

1. **XML Upload Path (Offline):** User drops an NFe XML → `app.js` parses with `DOMParser` → extracts NFe data → builds official DANFE layout → `pdfmake` generates PDF blob → download triggered. **No server involvement.**

2. **Access Key Path (Online):** User enters 44-digit key → `app.js` POSTs to `proxy.php` → `auth.php` validates credentials → `proxy.php` calls Meu Danfe API v2 → if NFe not found, adds it and polls → transforms response to `{pdf_base64}` format → `app.js` converts base64 to PDF blob → download triggered.

3. **Barcode Path:** Camera opens → Quagga2 scans Code 128/39 barcode → extracts 44 digits → auto-fills input or copies to clipboard → user proceeds with online lookup or manual SEFAZ consultation.

### Project Structure

```
danfeonline/
├── webapp/
│   ├── index.html                # Single-page application shell
│   ├── app.js                    # Core logic: tabs, PDF gen, API, i18n, camera
│   ├── styles.css                # Complete stylesheet (light + dark themes)
│   ├── proxy.php                 # Server-side CORS proxy for Meu Danfe API
│   └── auth.php                  # Authentication gate (none/account/keycloak)
├── docker/
│   ├── docker-compose.yml        # Single-service container stack
│   └── .env                      # Configuration template
├── .github/
│   └── workflows/
│       ├── release_build.yml     # Build, tag, release + multi-arch Docker push
│       ├── keepalive.yml         # Weekly keepalive commit
│       └── update_readme.yml     # Daily README badge/footer sync
├── Dockerfile                    # PHP 8.3-cli-alpine image
├── .dockerignore                 # Exclude secrets and dev files from image
├── LICENSE                       # MIT License
└── README.md                     # This file
```

---

## Setup Instructions

### Prerequisites
- Docker & Docker Compose installed
- (Optional) A [Meu Danfe](https://meudanfe.com.br) API key for online access key lookups. The XML-to-PDF feature works without any API key.

### 1. Configure Environment

Navigate into the `docker` directory and edit the `.env` file with your settings:

```bash
cd docker
nano .env
```

**Minimum settings (offline-only, no API, no auth):**
```env
PORT=8080
AUTH_METHOD=none
```

**Full settings (online API + authentication):**
```env
PORT=8080
DOMAIN=danfeonline.example.com

# Meu Danfe API v2 (required for access key lookups)
API_BASE=https://api.meudanfe.com.br/v2
API_KEY=your-api-key-here
API_TIMEOUT=60

# Authentication
AUTH_METHOD=account
ACCOUNT_LOGIN=admin
ACCOUNT_PASSWORD=your_secure_password
```

### 2. Start the Application

```bash
docker compose up -d
```

### 3. Access the Application

Navigate to `http://localhost:8080` (or your configured `PORT`).

The default tab is "Upload XML" — drop an NFe XML file to instantly generate a DANFE PDF. Switch to "Search by Key" for online API lookups.

---

## Environment Variables Reference

### Web Server & Proxy

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8080` | Host port mapping for the application |
| `DOMAIN` | No | — | Public domain for reverse proxy reference |

### Meu Danfe API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_BASE` | No | `https://api.meudanfe.com.br/v2` | Meu Danfe API base URL |
| `API_KEY` | No* | — | Your Meu Danfe API key (*required for online lookups) |
| `API_TIMEOUT` | No | `60` | Seconds before timing out SEFAZ queries |

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_METHOD` | No | `none` | `none`, `account`, or `keycloak` |
| `ACCOUNT_LOGIN` | No | — | Username for `account` auth |
| `ACCOUNT_PASSWORD` | No | — | Password for `account` auth |
| `KEYCLOAK_BASE_URL` | No | — | Keycloak server URL |
| `KEYCLOAK_REALM` | No | — | Keycloak realm name |
| `KEYCLOAK_CLIENT_ID` | No | — | Keycloak client ID |
| `KEYCLOAK_CLIENT_SECRET` | No | — | Keycloak client secret |
| `KEYCLOAK_REDIRECT_URI` | No | — | OAuth2 redirect URI |
| `KEYCLOAK_EMAIL_ACCOUNT` | No | — | Restrict access to this email |

---

## Authentication Options

### None (Default)
```env
AUTH_METHOD=none
```
Application is publicly accessible. No login required.

### Account (HTTP Basic Authentication)
```env
AUTH_METHOD=account
ACCOUNT_LOGIN=admin
ACCOUNT_PASSWORD=your_secure_password
```
Browser prompts for username and password via standard HTTP Basic Auth dialog. Credentials are validated against the configured values on every API request.

### Keycloak (SSO)
```env
AUTH_METHOD=keycloak
KEYCLOAK_BASE_URL=https://sso.example.com
KEYCLOAK_REALM=YourRealm
KEYCLOAK_CLIENT_ID=danfeonline
KEYCLOAK_CLIENT_SECRET=your_client_secret
KEYCLOAK_REDIRECT_URI=https://danfeonline.example.com/
KEYCLOAK_EMAIL_ACCOUNT=you@example.com
```
Bearer token-based authentication. The SPA obtains an access token from Keycloak (via Authorization Code flow with PKCE) and includes it in the `Authorization: Bearer <token>` header. The proxy validates the token against Keycloak's `/userinfo` endpoint. If `KEYCLOAK_EMAIL_ACCOUNT` is set, only that specific email is allowed.

---

## Reverse Proxy

DANFE Online works seamlessly behind Nginx, Traefik, Caddy, or any reverse proxy:

1. Set `PORT` in `.env` to your desired host port (container internally uses `8080`).
2. Point your reverse proxy upstream to `localhost:<PORT>`.
3. Optionally set `DOMAIN` for proxy configuration references.

**Example Nginx config:**
```nginx
server {
    listen 443 ssl;
    server_name danfeonline.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Note:** When using Basic Auth behind a reverse proxy, ensure `proxy_set_header Authorization $http_authorization;` is included so the `Authorization` header reaches the PHP backend.

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | PHP 8.3 (CLI, Alpine) |
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| PDF Generation | pdfmake 0.2.10 |
| Barcode Scanner | Quagga2 1.8.3 |
| HTTP Client (PHP) | cURL |
| Auth (Basic) | PHP built-in `getenv()` + header parsing |
| Auth (SSO) | cURL to Keycloak OIDC `/userinfo` |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions (multi-arch build + release) |

---

## Troubleshooting

**Online lookup fails with "Server configuration error":**
- Ensure `API_KEY` is set in `docker/.env` and is a valid Meu Danfe API key.
- Restart the container after changing `.env`: `docker compose restart`

**Online lookup returns 402 (no credits):**
- Your Meu Danfe account has run out of credits. Each SEFAZ query costs R$0.03. Add credits at the Meu Danfe customer area.
- As a workaround, use the "Upload XML" tab which works without any API.

**PDF generation from XML fails:**
- Ensure the file is a valid NFe XML (not a different XML type like NFSe or CT-e).
- Verify the XML contains the correct namespace: `http://www.portalfiscal.inf.br/nfe`.
- Check the browser console for specific parse errors.

**Camera scanner not working:**
- The browser must support `getUserMedia` (all modern browsers do).
- Ensure you've granted camera permissions when prompted.
- For HTTPS sites, camera access requires a secure context. If testing locally on `localhost`, this is not an issue.

**Port conflict:**
- Change `PORT` in `.env` to an available port (e.g., `8081`).

**Authentication not working behind reverse proxy:**
- Nginx strips the `Authorization` header by default. Add `proxy_set_header Authorization $http_authorization;` to your Nginx config.
- For Apache: `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1`

---

## Security

- **API keys are never stored in source code.** They are read from environment variables at runtime via `getenv()`.
- **The `.env` file is excluded from Docker images** via `.dockerignore`. It is only mounted at container runtime.
- **Error responses never expose internal configuration**, API keys, file paths, or stack traces.
- **The container runs as a non-root user** (`phpuser`, UID 1000).
- **Only the `webapp/` directory is copied into the image.** Docker, GitHub, and development files are excluded.
- **PHP files are executed, never served as raw text**, thanks to the PHP built-in server.

<!-- footer -->
---

## 🧑‍💻 Consulting and technical support
* For personal support and queries, please submit a new issue to have it addressed.
* For commercial related questions, please [**contact me**][ivancarlos] for consulting costs.

[cc]: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project
[contributing]: https://docs.github.com/en/articles/setting-guidelines-for-repository-contributors
[security]: https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository
[support]: https://docs.github.com/en/articles/adding-support-resources-to-your-project
[it]: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#configuring-the-template-chooser
[prt]: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository
[funding]: https://docs.github.com/en/articles/displaying-a-sponsor-button-in-your-repository
[ivancarlos]: https://ivancarlos.me
