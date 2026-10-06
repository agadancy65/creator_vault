# CreatorVault

CreatorVault is a frontend prototype for checking creator handles before making payments to online vendors.

## Project structure

```text
creatorvault/
├── index.html
├── 404.html
├── pages/
│   ├── verified.html
│   ├── flagged.html
│   ├── not-found.html
│   ├── signup.html
│   ├── handles.html
│   ├── payout.html
│   ├── dashboard.html
│   ├── login.html
│   ├── forgot-password.html
│   └── reset-password.html
├── css/
│   └── style.css
├── js/
│   ├── theme.js
│   ├── scoring.js
│   ├── search.js
│   ├── navigation.js
│   ├── result-render.js
│   ├── form-validation.js
│   ├── password-toggle.js
│   ├── forgot-password.js
│   ├── reset-password.js
│   └── login.js
├── assets/
│   ├── icons/
│   └── images/
├── package.json
├── package-lock.json
├── LICENSE
├── robots.txt
├── site.webmanifest
└── README.md
```

## Run locally

No backend is required for the current prototype.

### Option 1 — VS Code Live Server

Open the folder in VS Code and run `index.html` with Live Server.

### Option 2 — Python local server

From the project root:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.

## Demo search behaviour

- `@tobi_official` → Verified
- Handles containing `0fficial` or `mgmt` → Flagged
- Anything else → Not found

The creator flow is:

`Signup → Link Handles → Payout → Dashboard`

The forms currently simulate navigation only. They do not create real accounts or process payments.

### Password reset

`Log in → Forgot password? → Reset password → back to Log in`

The reset flow is also front-end only. `forgot-password.html` validates the email,
shows a confirmation, and passes the address to `reset-password.html` through
`sessionStorage`. `reset-password.html` records a one-time flag that `login.html`
reads to show a "Password updated" notice, then clears it. No email is actually
sent and no password is actually changed.

## Why there are separate HTML pages

Each major screen is now a separate document. This makes the prototype easier to understand while learning HTML/CSS/JavaScript and gives you a straightforward path to a real application later.

When the project grows, repeated UI such as the header/footer can be moved into components using a framework such as React or Next.js.

## Current limitations

This is still a frontend prototype. A production CreatorVault would need:

- Real authentication and authorization
- A database
- Creator verification logic
- Report/review workflows
- Secure payment/payout integration
- Server-side validation
- API endpoints
- Rate limiting
- Proper error handling
- Security and privacy controls
- Real analytics and monitoring

Do not put API keys, passwords, bank credentials, or other secrets in this repository.

## Formatting

The project includes Prettier configuration. If you install the dev dependency:

```bash
npm install
npm run format
```

## Git

Typical first setup:

```bash
git init
git add .
git commit -m "Initial CreatorVault frontend"
```

Then create a GitHub repository and add it as the remote.

## Figma handoff

The UI was built from the supplied CreatorVault dark-screen design. For exact production handoff, compare spacing, typography, colors, icons, and assets against the Figma file in Dev Mode before finalizing.
