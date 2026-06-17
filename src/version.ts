import { useEffect, useState } from "react";

// Build-time fallback only. The running version is injected at runtime from the
// container's APP_VERSION env via GET /api/version (see server/index.mjs and the
// Flux-managed value in k8s/overlays/prod/app-version.yaml). The release
// pipeline promotes the CI image to the version tag WITHOUT rebuilding, so a
// value baked into this bundle would always lag a release behind — hence the
// runtime lookup. This constant is what shows in dev / static deployments that
// don't run the Node backend.
export const APP_VERSION = "v1.5.1";

let cachedVersion: string | null = null;
let inFlight: Promise<string> | null = null;

async function loadAppVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  if (!inFlight) {
    // same-origin so the oauth2-proxy session cookie is sent and the request is
    // authorized; never "omit" (that would bounce to the Google login gate).
    inFlight = fetch("/api/version", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const version =
          typeof data?.version === "string" ? data.version.trim() : "";
        const resolved = version || APP_VERSION;
        cachedVersion = resolved;
        return resolved;
      })
      .catch(() => {
        cachedVersion = APP_VERSION;
        return APP_VERSION;
      });
  }
  return inFlight;
}

// Returns the running app version, preferring the runtime value reported by the
// Node backend and falling back to the compiled constant.
export function useAppVersion(): string {
  const [version, setVersion] = useState(cachedVersion ?? APP_VERSION);

  useEffect(() => {
    let active = true;
    loadAppVersion().then((resolved) => {
      if (active) setVersion(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return version;
}
