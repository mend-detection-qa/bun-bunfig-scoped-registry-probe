// Minimal stub — exercises the bun-bunfig-scoped-registry-probe pattern.
// This file is not executed; it exists to make the project a valid TypeScript project.
//
// The probe tests whether Mend reads bunfig.toml [install.scopes] and correctly
// routes @myorg/private-utils through https://npm.example.com/ (source: private-index)
// while leaving hono on the default https://registry.npmjs.org (source: registry).

import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("bun-bunfig-scoped-registry-probe"));

export default app;