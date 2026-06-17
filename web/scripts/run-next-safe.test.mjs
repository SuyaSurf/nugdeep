import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNextArguments,
  buildSafeEnvironment,
} from "./run-next-safe.mjs";

test("development and builds opt out of Turbopack", () => {
  assert.deepEqual(buildNextArguments("dev"), ["dev", "--webpack"]);
  assert.deepEqual(buildNextArguments("build"), ["build", "--webpack"]);
  assert.deepEqual(buildNextArguments("start"), ["start"]);
});

test("launcher removes IDE test flags and caps the Node heap", () => {
  const environment = buildSafeEnvironment({
    ELECTRON_RUN_AS_NODE: "1",
    __NEXT_TEST_MODE: "1",
    NEXT_TEST_MODE: "1",
    NODE_OPTIONS: "--trace-warnings",
  });

  assert.equal(environment.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(environment.__NEXT_TEST_MODE, undefined);
  assert.equal(environment.NEXT_TEST_MODE, undefined);
  assert.match(environment.NODE_OPTIONS ?? "", /--max-old-space-size=2048/);
  assert.match(environment.NODE_OPTIONS ?? "", /--trace-warnings/);
});
