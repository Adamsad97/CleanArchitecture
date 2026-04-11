import { readEnv } from "./env.js";
import { createAppDeps } from "./composition-root.js";
import { createFastifyApp } from "../frameworks/http/fastify/create-fastify-app.js";
const env = readEnv();
const deps = await createAppDeps(env);
const app = createFastifyApp(deps);
await app.listen({ port: env.port, host: "0.0.0.0" });
