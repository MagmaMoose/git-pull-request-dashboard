import {
  migrateRepositorySettings,
  parseRepositoryKey,
  repositoryKey,
  repositoryRoute,
} from "./repositoryKeys";

describe("repositoryKey", () => {
  it("joins host and full name with a colon", () => {
    expect(repositoryKey("github.com", "octocat/hello-world")).toBe(
      "github.com:octocat/hello-world"
    );
  });
});

describe("parseRepositoryKey", () => {
  it("splits a host-scoped key into its parts", () => {
    expect(parseRepositoryKey("ghe.example.com:octocat/hello-world")).toEqual({
      providerHost: "ghe.example.com",
      fullName: "octocat/hello-world",
      key: "ghe.example.com:octocat/hello-world",
    });
  });

  it("treats a bare owner/repo as a legacy github.com key", () => {
    expect(parseRepositoryKey("octocat/hello-world")).toEqual({
      providerHost: "github.com",
      fullName: "octocat/hello-world",
      key: "github.com:octocat/hello-world",
    });
  });

  it("honours the fallback provider host for legacy keys", () => {
    expect(
      parseRepositoryKey("octocat/hello-world", "ghe.example.com").providerHost
    ).toBe("ghe.example.com");
  });

  it("only treats text before the colon as a host when a slash follows", () => {
    // No slash after the colon → the colon is part of the value, not a host prefix.
    expect(parseRepositoryKey("weird:name")).toEqual({
      providerHost: "github.com",
      fullName: "weird:name",
      key: "github.com:weird:name",
    });
  });

  it("round-trips a key built by repositoryKey", () => {
    const key = repositoryKey("github.com", "octocat/hello-world");
    const parsed = parseRepositoryKey(key);
    expect(parsed.key).toBe(key);
    expect(repositoryKey(parsed.providerHost, parsed.fullName)).toBe(key);
  });
});

describe("repositoryRoute", () => {
  it("encodes the provider host segment", () => {
    expect(repositoryRoute("ghe.example.com", "octocat/hello-world")).toBe(
      "/repositories/ghe.example.com/octocat/hello-world"
    );
  });
});

describe("migrateRepositorySettings", () => {
  it("prefixes legacy bare keys with github.com", () => {
    expect(
      migrateRepositorySettings({ "octocat/hello-world": true })
    ).toEqual({ "github.com:octocat/hello-world": true });
  });

  it("returns the same reference when every key is already host-scoped", () => {
    const settings = { "github.com:octocat/hello-world": true };
    expect(migrateRepositorySettings(settings)).toBe(settings);
  });

  it("OR-merges a legacy and an already-prefixed key for the same repo", () => {
    const migrated = migrateRepositorySettings({
      "octocat/hello-world": true,
      "github.com:octocat/hello-world": false,
    });
    expect(migrated["github.com:octocat/hello-world"]).toBe(true);
    expect(Object.keys(migrated)).toEqual(["github.com:octocat/hello-world"]);
  });

  it("leaves non-github hosts untouched", () => {
    const settings = { "ghe.example.com:octocat/hello-world": true };
    expect(migrateRepositorySettings(settings)).toBe(settings);
  });
});
