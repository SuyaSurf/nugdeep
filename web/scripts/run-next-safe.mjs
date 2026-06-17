import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const HEAP_LIMIT_MB = 2048;
const NEXT_CLI = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../node_modules/next/dist/bin/next",
);

export function buildNextArguments(mode) {
  if (!["dev", "build", "start"].includes(mode)) {
    throw new Error(`Unsupported Next.js mode: ${mode}`);
  }
  return mode === "start" ? [mode] : [mode, "--webpack"];
}

export function buildSafeEnvironment(sourceEnvironment) {
  const environment = { ...sourceEnvironment };

  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.__NEXT_TEST_MODE;
  delete environment.NEXT_TEST_MODE;
  delete environment.NEXT_PRIVATE_WORKER;
  delete environment.NEXT_PRIVATE_BUILD_WORKER;
  delete environment.NEXT_PRIVATE_START_TIME;

  const existingNodeOptions = (environment.NODE_OPTIONS ?? "")
    .replace(/--max-old-space-size(?:=|\s+)\d+/g, "")
    .trim();
  environment.NODE_OPTIONS = [
    existingNodeOptions,
    `--max-old-space-size=${HEAP_LIMIT_MB}`,
  ]
    .filter(Boolean)
    .join(" ");

  return environment;
}

function run() {
  const mode = process.argv[2];
  const child = spawn(
    process.execPath,
    [NEXT_CLI, ...buildNextArguments(mode)],
    {
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
      env: buildSafeEnvironment(process.env),
      stdio: "inherit",
      windowsHide: true,
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  run();
}

