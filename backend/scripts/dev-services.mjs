import { spawn } from "node:child_process";
import net from "node:net";

function run(name, command, env = process.env) {
  const child = spawn(command, {
    stdio: "inherit",
    env,
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (code === 0 || signal) return;
    console.error(`[dev:services] ${name} exited with code ${code}`);
  });

  return child;
}

function isPortAvailableOnHost(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (error && error.code === "EAFNOSUPPORT") {
        resolve(true);
        return;
      }
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    if (host) {
      server.listen(port, host);
      return;
    }
    server.listen(port);
  });
}

async function isPortAvailable(port) {
  const ipv4Free = await isPortAvailableOnHost(port, "0.0.0.0");
  if (!ipv4Free) return false;

  const ipv6Free = await isPortAvailableOnHost(port, "::");
  if (!ipv6Free) return false;

  return true;
}

async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(port);
    if (available) return port;
  }
  return startPort;
}

let expressProcess;
let fastifyProcess;

async function main() {
  const expressPort = 3002;
  const isExpressPortFree = await isPortAvailable(expressPort);
  const fastifyPort = await findAvailablePort(3003);
  console.log(`[dev:services] Fastify target port: ${fastifyPort}`);

  if (isExpressPortFree) {
    expressProcess = run("express", "npm run dev:express", {
      ...process.env,
      DATABASE: process.env.DATABASE ?? "sqlite",
      SQLITE_PATH: process.env.SQLITE_PATH ?? "./ecoeats.sqlite",
    });
  } else {
    console.log(`[dev:services] Express already running on port ${expressPort}, skipping launch.`);
  }

  fastifyProcess = run("fastify", "npm run dev:fastify", {
    ...process.env,
    DATABASE: process.env.DATABASE ?? "memory",
    PORT: String(fastifyPort),
  });
}

function shutdown() {
  if (expressProcess && !expressProcess.killed) expressProcess.kill("SIGTERM");
  if (fastifyProcess && !fastifyProcess.killed) fastifyProcess.kill("SIGTERM");
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

main().catch((error) => {
  console.error("[dev:services] startup failed", error);
  process.exit(1);
});
