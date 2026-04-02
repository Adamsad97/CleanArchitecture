import { readEnv } from "./env.js";
import { createAppDeps } from "./composition-root.js";
import { createExpressApp } from "../interface/http/express/create-express-app.js";

const env = readEnv();
const deps = await createAppDeps(env);
const app = createExpressApp(deps);

app.listen(env.port, () => {
  console.log(`[EcoEats][express] listening on :${env.port} (db=${env.db})`);
});

