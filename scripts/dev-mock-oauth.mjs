// DEV ONLY — do not use in production.
//
// Runs the dashboard's Node server (server/index.mjs) locally against a MOCK
// GitHub OAuth provider, so you can exercise the runtime version chip and the
// auto-login chain (github.com + a GitHub Enterprise tenant) WITHOUT
// registering a real OAuth app. The mock "user" is already-logged-in and
// already-authorized, so authorize immediately bounces back — mimicking the
// seamless experience you get on real GitHub when your browser is signed in.
//
// Usage:  npm run dev:mock     (builds the SPA first, then starts this)
//         then open http://localhost:8080
//
// Env overrides: APP_PORT (8080), MOCK_PORT (9100), APP_VERSION.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const APP_PORT = process.env.APP_PORT ?? "8080";
const MOCK_PORT = process.env.MOCK_PORT ?? "9100";
const APP_VERSION = process.env.APP_VERSION ?? "v0.0.0-mock-runtime";

// Two fake providers so you can watch the chain log into BOTH (the second only
// starts after the first lands a session). Hosts are arbitrary; the header
// chips will read "mock-user @ <host>".
const MOCK_HOSTS = ["github.localhost", "enterprise.localhost"];

if (!existsSync(path.join(root, "dist", "index.html"))) {
  console.error("dist/ not found — run `npm run build` first (or use `npm run dev:mock`).");
  process.exit(1);
}

// --- Mock identity provider -------------------------------------------------
const mock = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${MOCK_PORT}`);

  // Simulate an already-authenticated, already-authorized user: redirect
  // straight back to the app's callback with a code (no login/consent screen).
  if (url.pathname === "/login/oauth/authorize") {
    const callback = new URL(url.searchParams.get("redirect_uri"));
    callback.searchParams.set("code", "mock-code");
    callback.searchParams.set("state", url.searchParams.get("state") ?? "");
    res.writeHead(302, { Location: callback.toString() });
    res.end();
    return;
  }

  if (url.pathname === "/login/oauth/access_token") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ access_token: "mock-token", token_type: "bearer", scope: "repo read:org user:email" }));
    return;
  }

  // server/index.mjs fetches <apiUrl>/user after the token exchange.
  if (url.pathname === "/user") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      login: "mock-user",
      avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
      url: `http://localhost:${MOCK_PORT}/user`,
      html_url: `http://localhost:${MOCK_PORT}`,
    }));
    return;
  }

  // Any other proxied API call (repos, PRs, …) — return an empty list so the
  // dashboard renders without errors. Auth state is what this harness shows off.
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end("[]");
});

mock.listen(Number(MOCK_PORT), () => {
  console.log(`[mock-idp]  http://localhost:${MOCK_PORT}`);
});

// --- App server, pointed at the mock ---------------------------------------
const gheOauthApps = Object.fromEntries(
  MOCK_HOSTS.map((host) => [
    host,
    {
      clientId: "mock-client-id",
      clientSecret: "mock-client-secret",
      authUrl: `http://localhost:${MOCK_PORT}`,
      apiUrl: `http://localhost:${MOCK_PORT}`,
      webUrl: `http://localhost:${MOCK_PORT}`,
    },
  ])
);

const app = spawn("node", ["server/index.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    PORT: APP_PORT,
    APP_BASE_URL: `http://localhost:${APP_PORT}`,
    SESSION_SECRET: "dev-mock-session-secret-not-for-prod",
    APP_VERSION,
    GHE_OAUTH_APPS: JSON.stringify(gheOauthApps),
  },
});

console.log(`[dashboard] http://localhost:${APP_PORT}  (APP_VERSION=${APP_VERSION})`);
console.log("Open it: it auto-logs into both mock providers and shows the runtime version chip.\n");

function shutdown() {
  app.kill();
  mock.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
app.on("exit", (code) => {
  mock.close();
  process.exit(code ?? 0);
});
