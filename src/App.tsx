import React from "react";
import "./App.css";
import { GitService } from "./service/gitService";
import {
  AppBar,
  Box,
  CssBaseline,
  ThemeProvider,
  Toolbar,
} from "@mui/material";
import { SettingsDrawer } from "./SettingsDrawer";
import { AuthHeader } from "./components/AuthHeader";
import { UnAuthHeader } from "./components/UnAuthHeader";
import { Outlet, useNavigate } from "react-router";
import { ConfigContext } from "./context/ConfigContext";
import { darkTheme, lightTheme } from "./theme";
import { TokenManager } from "./utils/tokenManager";
import { usePersistentState, validators } from "./hooks/usePersistentState";
import { ToastNotification } from "./components/ToastNotification";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  oauthProxyApiUrl,
  providerFromConfiguredEnvironment,
  providerFromHost,
} from "./utils/githubProvider";
import { migrateRepositorySettings } from "./utils/repositoryKeys";
import {
  AuthSession,
  AuthenticatedUser,
  OAuthSessionResponse,
} from "./models/Auth";

const patLoginEnabled = import.meta.env.VITE_ENABLE_PAT_LOGIN !== "false";
// Auto-login is on by default; set VITE_DISABLE_AUTO_LOGIN=true to fall back to
// the manual "Log in with GitHub" button only.
const autoLoginDisabled = import.meta.env.VITE_DISABLE_AUTO_LOGIN === "true";

// Per-tab guards (sessionStorage) that keep the auto-login chain terminating:
// each provider is attempted at most once, and an explicit logout suppresses it.
const AUTO_LOGIN_ATTEMPTED_KEY = "gprd_autologin_attempted";
const LOGGED_OUT_KEY = "gprd_logged_out";

// Guards against launching more than one redirect per page load (e.g. React
// StrictMode double-invoking the effect in dev). Resets naturally on reload.
let autoLoginRedirecting = false;

function getAttemptedAutoLogins(): string[] {
  try {
    const raw = sessionStorage.getItem(AUTO_LOGIN_ATTEMPTED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((host): host is string => typeof host === "string")
      : [];
  } catch {
    return [];
  }
}

function markAutoLoginAttempted(host: string): void {
  try {
    const attempted = new Set(getAttemptedAutoLogins());
    attempted.add(host);
    sessionStorage.setItem(
      AUTO_LOGIN_ATTEMPTED_KEY,
      JSON.stringify([...attempted])
    );
  } catch {
    // sessionStorage unavailable (private mode) — auto-login just can't be
    // deduped, which at worst costs one extra redirect.
  }
}

// HashRouter keeps the route + query in location.hash, e.g.
// "#/login?auth_error=access_denied" — the OAuth callback redirects there on
// failure or denial.
function readAuthError(): string | null {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return null;
  return new URLSearchParams(hash.slice(queryIndex + 1)).get("auth_error");
}

function App() {
  const [authSessions, setAuthSessions] = React.useState<AuthSession[]>([]);
  const [openSettings, setOpenSettings] = React.useState<boolean>(false);
  const [authLoading, setAuthLoading] = React.useState<boolean>(true);
  
  // Use persistent state hook for better state management
  const [isDarkMode, setIsDarkMode] = usePersistentState('DARK_MODE', {
    defaultValue: false,
    validator: validators.isDarkMode,
    storageType: 'localStorage'
  });

  const [repositorySettings, setRepositorySettings] = usePersistentState('REPOSITORY_CONFIG', {
    defaultValue: {} as Record<string, boolean>,
    // Migrate legacy bare `owner/repo` keys to the host-scoped form on load so
    // selections saved before multi-host support survive the upgrade.
    deserialize: (raw) =>
      migrateRepositorySettings(JSON.parse(raw) as Record<string, boolean>),
    validator: validators.repositorySettings,
    storageType: 'localStorage'
  });

  // Toast notification state
  const [toast, setToast] = React.useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const navigate = useNavigate();
  const clients = React.useMemo(
    () =>
      authSessions.map((session) => ({
        account: session,
        client: new GitService(
          session.method === "oauth"
            ? oauthProxyApiUrl(session.provider.host)
            : session.provider.apiUrl,
          session.method === "pat" ? session.token : undefined,
          session.provider.webUrl
        ),
      })),
    [authSessions]
  );
  const octokit = clients[0]?.client ?? null;
  const user = authSessions[0]?.user;
  const provider = authSessions[0]?.provider;

  const showToast = React.useCallback((message: string, severity: 'error' | 'warning' | 'info' | 'success' = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  const setAuthenticatedSessions = React.useCallback((sessions: AuthSession[]) => {
    const sessionsByHost = new Map<string, AuthSession>();
    sessions.forEach((session) => {
      sessionsByHost.set(session.provider.host, session);
    });
    setAuthSessions(
      Array.from(sessionsByHost.values()).sort((a, b) => {
        if (a.provider.host === "github.com") return -1;
        if (b.provider.host === "github.com") return 1;
        return a.provider.host.localeCompare(b.provider.host);
      })
    );
  }, []);

  const upsertAuthenticatedSession = React.useCallback((session: AuthSession) => {
    setAuthSessions((previous) => {
      const sessionsByHost = new Map(
        previous.map((existing) => [existing.provider.host, existing])
      );
      sessionsByHost.set(session.provider.host, session);
      return Array.from(sessionsByHost.values()).sort((a, b) => {
        if (a.provider.host === "github.com") return -1;
        if (b.provider.host === "github.com") return 1;
        return a.provider.host.localeCompare(b.provider.host);
      });
    });
  }, []);

  const getClientForProvider = React.useCallback(
    (providerHost?: string) => {
      if (!providerHost) return octokit;
      return (
        clients.find((entry) => entry.account.provider.host === providerHost)
          ?.client ?? null
      );
    },
    [clients, octokit]
  );

  const onPatLogin = React.useCallback((token: string, providerHost?: string) => {
    if (!token) {
      showToast("Enter a GitHub token first.", "warning");
      return;
    }

    const provider = providerHost?.trim()
      ? providerFromHost(providerHost)
      : providerFromConfiguredEnvironment();

    const octoKit = new GitService(
      provider.apiUrl,
      token,
      provider.webUrl
    );
      octoKit.testAuthentication().then((user) => {
        if (user.status !== 200) {
          showToast("Invalid token. Please check your GitHub token.", "error");
          return;
        }

        const session: AuthSession = {
          method: "pat",
          token,
          provider,
          user: user.data as AuthenticatedUser,
        };

        upsertAuthenticatedSession(session);
        TokenManager.setSession(session);
        navigate("/");
        showToast(`Successfully logged in to ${provider.host}!`, "success");
      }).catch((error) => {
        console.error("Authentication failed:", error);
        showToast("Authentication failed. Please try again.", "error");
      });
  }, [navigate, showToast, upsertAuthenticatedSession]);

  const onOAuthLogin = React.useCallback((providerHost?: string) => {
    const provider = providerFromHost(providerHost || "github.com");
    const loginUrl = new URL("/api/auth/github/start", window.location.origin);
    loginUrl.searchParams.set("provider", provider.host);
    window.location.assign(loginUrl.toString());
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    // Redirect to start OAuth for the next configured provider the user isn't
    // signed into yet (github.com, then any GHE tenant). Each provider is tried
    // at most once per tab, and the chain is skipped after an explicit logout or
    // a failed sign-in, so it always terminates and never loops. Returns true
    // when a redirect was initiated (the page is then unloading).
    async function maybeAutoLogin(
      authenticatedHosts: Set<string>,
      hasPatSession: boolean
    ): Promise<boolean> {
      if (autoLoginDisabled || hasPatSession) return false;
      try {
        if (sessionStorage.getItem(LOGGED_OUT_KEY) === "1") return false;
      } catch {
        // ignore unavailable sessionStorage
      }
      if (readAuthError()) return false;

      let providers: string[] = [];
      try {
        const response = await fetch("/api/auth/providers", {
          credentials: "same-origin",
        });
        if (!response.ok) return false;
        const data = await response.json();
        if (Array.isArray(data?.providers)) {
          providers = data.providers.filter(
            (host: unknown): host is string => typeof host === "string"
          );
        }
      } catch {
        // No OAuth backend (static/dev deploy) — nothing to auto-login.
        return false;
      }

      const attempted = getAttemptedAutoLogins();
      const nextProvider = providers.find(
        (host) => !authenticatedHosts.has(host) && !attempted.includes(host)
      );
      if (!nextProvider) return false;
      if (autoLoginRedirecting) return true;

      autoLoginRedirecting = true;
      markAutoLoginAttempted(nextProvider);
      const loginUrl = new URL("/api/auth/github/start", window.location.origin);
      loginUrl.searchParams.set("provider", nextProvider);
      window.location.assign(loginUrl.toString());
      return true;
    }

    async function hydrateAuth() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json() as OAuthSessionResponse;
          if (data.authenticated) {
            const sessions =
              data.sessions?.map((session) => ({
                method: "oauth" as const,
                provider: session.provider,
                user: session.user,
              })) ??
              (data.user && data.provider
                ? [
                    {
                      method: "oauth" as const,
                      provider: data.provider,
                      user: data.user,
                    },
                  ]
                : []);

            if (!cancelled) {
              setAuthenticatedSessions(sessions);
              TokenManager.clearToken();
            }

            // Signed into at least one provider via OAuth — chain the remaining
            // configured ones (e.g. add GHE after github.com).
            const authenticatedHosts = new Set(
              sessions.map((session) => session.provider.host)
            );
            if (await maybeAutoLogin(authenticatedHosts, false)) return;

            if (!cancelled) {
              setAuthLoading(false);
            }
            return;
          }
        }
      } catch {
        // Static/dev deployments may not have the OAuth server enabled.
      }

      const storedSessions = TokenManager.getSessions();
      if (!cancelled && storedSessions.length > 0) {
        setAuthenticatedSessions(storedSessions);
      }

      // No OAuth session. Unless the user is on a manual PAT session, kick off
      // the sign-in chain for the configured providers.
      if (await maybeAutoLogin(new Set(), storedSessions.length > 0)) return;

      if (!cancelled) {
        setAuthLoading(false);
      }
    }

    hydrateAuth();

    return () => {
      cancelled = true;
    };
  }, [setAuthenticatedSessions]);

  // Surface OAuth failures/denials (the callback lands on /#/login?auth_error=…)
  // and let the auto-login guard fall through to the manual sign-in UI.
  React.useEffect(() => {
    const authError = readAuthError();
    if (authError) {
      showToast(
        `GitHub sign-in failed (${authError}). You can try again from the header.`,
        "error"
      );
    }
  }, [showToast]);

  const logOut = React.useCallback(() => {
    if (authSessions.some((session) => session.method === "oauth")) {
      fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch((error) => {
        console.warn("OAuth logout request failed:", error);
      });
    }

    TokenManager.clearToken();
    setAuthSessions([]);
    // Suppress the auto-login chain until this tab is closed, so logout can't
    // immediately bounce the user back into GitHub on the next load.
    try {
      sessionStorage.setItem(LOGGED_OUT_KEY, "1");
      sessionStorage.removeItem(AUTO_LOGIN_ATTEMPTED_KEY);
    } catch {
      // ignore unavailable sessionStorage
    }
    navigate("/login");
    showToast("Logged out successfully", "info");
  }, [authSessions, navigate, showToast]);

  const switchDarkMode = React.useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, [setIsDarkMode]);

  const handleRepositorySelect = React.useCallback(
    (repository: string, selected: boolean) => {
      setRepositorySettings((prev) => ({ ...prev, [repository]: selected }));
    },
    [setRepositorySettings]
  );

  const saveRawSettings = React.useCallback(
    (settings: Record<string, boolean> | undefined) => {
      if (!settings) return;
      setRepositorySettings(settings);
    },
    [setRepositorySettings]
  );

  return (
    <ErrorBoundary>
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <ConfigContext.Provider
          value={{
            octokit,
            clients,
            accounts: authSessions,
            repositorySettings,
            handleRepositorySelect,
            saveRawSettings,
            getClientForProvider,
            user,
            provider,
          }}
        >
          <AppBar
            position="static"
            color="default"
            sx={{ position: "fixed", zIndex: 100 }}
          >
            <Toolbar sx={{ justifyContent: "flex-end" }}>
              {authSessions.length === 0 ? (
                <UnAuthHeader
                  loading={authLoading}
                  onOAuthLogin={onOAuthLogin}
                  onPatLogin={patLoginEnabled ? onPatLogin : undefined}
                />
              ) : (
                <AuthHeader
                  sessions={authSessions}
                  logOut={logOut}
                  setOpenSettings={setOpenSettings}
                  onThemeSwitch={switchDarkMode}
                  darkMode={isDarkMode}
                  onOAuthLogin={onOAuthLogin}
                />
              )}
            </Toolbar>
          </AppBar>
          <Box
            component={"main"}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              justifyContent: "center",
              alignItems: "center",
              paddingTop: "4em",
            }}
          >
            <Box
              padding={2}
              width={"calc(100vw - 2em)"}
              justifyContent={"center"}
            >
              <Outlet />
            </Box>
          </Box>
          {clients.length > 0 && (
            <SettingsDrawer
              opened={openSettings}
              onClose={() => setOpenSettings(false)}
            />
          )}
          <ToastNotification
            open={toast.open}
            message={toast.message}
            severity={toast.severity}
            onClose={() => setToast(prev => ({ ...prev, open: false }))}
          />
        </ConfigContext.Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
