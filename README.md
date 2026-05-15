# bun-bunfig-scoped-registry-probe

Probe #19 of `docs/BUN_COVERAGE_PLAN.md` — Tier 4, §3 docs-gap feature S3.

## Pattern

**S3 — `bunfig.toml` `[install.scopes]` → `source: "private-index"`**

Reference: `skills/bun-core/references/workspaces-and-sources.md:58-67`

Two direct dependencies:

| Package | Declared version | Resolved registry | Expected Mend `source` |
|---|---|---|---|
| `@myorg/private-utils` | `^1.0.0` | `https://npm.example.com/` (via `[install.scopes]`) | `private-index` |
| `hono` | `^4.12.0` | `https://registry.npmjs.org` (default `[install]` registry) | `registry` |

## Why standalone

`bunfig.toml` is a **separate config file** from `package.json`. It is Bun's own runtime and install configuration format (TOML, not JSON). Mend's detection pipeline must actively seek out and parse `bunfig.toml` alongside `bun.lock` and `package.json` — it is not part of the standard npm manifest.

The primary failure mode is that Mend parses `package.json` and `bun.lock` correctly but **never reads `bunfig.toml`**. When that happens:

- `@myorg/private-utils` has no registry override visible to Mend.
- Mend falls back to the default registry (`https://registry.npmjs.org`).
- The package is reported as `source: "registry"` — wrong.
- No error is surfaced; the tree looks plausible but mis-classifies the package source.

This is a silent correctness failure, not a parse crash.

## Mend config

No `.whitesource` file is present in this probe.

**Rationale:** Bun is NOT in the Mend `install-tool` supported list. The `scanSettings.versioning` block (from `whitesource-config.md`) cannot pin a Bun toolchain version because the install-tool integration does not exist for Bun. Emitting `.whitesource` would have no effect on Bun toolchain selection and would add noise. Detection is entirely lockfile-driven — Mend's parser reads `bun.lock` statically without invoking `bun install`.

## Files

| File | Role |
|---|---|
| `package.json` | Declares two direct deps: `@myorg/private-utils` (scoped, private) and `hono` (public). |
| `bunfig.toml` | **The config file under test.** `[install]` sets the default registry; `[install.scopes]` maps `@myorg` to `https://npm.example.com/`. |
| `bun.lock` | Text JSONC lockfile (Bun 1.2+). Records `@myorg/private-utils@1.0.0` as resolved from the private registry (stub/placeholder integrity hash) and `hono@4.12.18` from the default registry. |
| `index.ts` | Minimal TypeScript stub — not executed. |
| `expected-tree.json` | Expected Mend dep-tree output. Schema v1.0. |

## Source-routing table

| Package | Declared in `package.json` | Registry routing (from `bunfig.toml`) | Expected Mend `source` | Expected `source_detail.registry` |
|---|---|---|---|---|
| `@myorg/private-utils` | `"^1.0.0"` | `[install.scopes] "@myorg" = "https://npm.example.com/"` | `private-index` | `https://npm.example.com/` |
| `hono` | `"^4.12.0"` | `[install] registry = "https://registry.npmjs.org"` (default) | `registry` | `https://registry.npmjs.org` |

## Failure modes catalogued

1. **`bunfig.toml` not read (primary):** Both packages reported as `source: "registry"`. `@myorg/private-utils` registry shows `https://registry.npmjs.org` — wrong.
2. **Scoped registry applied to all packages:** Both packages reported as `source: "private-index"` with `npm.example.com`. Mend over-applies the scope rule beyond `@myorg/*`.
3. **`private-index` source type not mapped:** `bunfig.toml` is read, the registry URL is found, but the source type is reported as `registry` (not `private-index`). The registry URL in `source_detail` may be correct while the source classification is wrong.
4. **Stub package causes scan error:** `@myorg/private-utils` does not exist on the public npm registry. If Mend attempts live registry resolution during scan instead of reading the lockfile statically, it may error. Correct behavior is to trust the lockfile entry as-recorded.

## Stub package note

`@myorg/private-utils@1.0.0` is a fictional package. `npm.example.com` is a fictional private registry. The `bun.lock` entry uses a placeholder `sha512` integrity hash. This is intentional — the probe tests the Mend **parser's** ability to read `bunfig.toml` and classify the source type, not actual package reachability. The Mend scanner operates in lockfile-driven mode (no install step) and must not attempt to fetch the package from npm.

## Resolver knowledge

The UA javascript resolver documentation does not explicitly enumerate `bunfig.toml` reading as a supported behavior. Bun is not a UA-supported resolver (no `install-tool` key). The nearest analog is the npm resolver's handling of `.npmrc` scoped registry configuration (`registry=https://...` per scope). Whether Mend's Bun parser replicates this `.npmrc`-to-`bunfig.toml` mapping is the open question this probe answers.

## Related probes

- `bun-basic-registry-probe` (Tier 1 #1) — baseline registry detection without `bunfig.toml`. Compare `hono` results between probes to confirm the default-registry path is stable.
- `bun-not-in-install-tool-probe` (Tier 5 #24) — documents the install-tool limitation that makes `.whitesource` `scanSettings.versioning` inoperative for Bun.

## Tracked in

`docs/BUN_COVERAGE_PLAN.md` §11.4 entry #19 — S3 (`bunfig.toml` `[install.scopes]`).
