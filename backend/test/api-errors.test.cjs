const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ApiExceptionFilter } = require("../dist/src/api-errors.js");

test("unexpected errors never expose credentials, SQL or stack traces", () => {
  let status, body;
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status(value) {
          status = value;
          return {
            json(value) {
              body = value;
            },
          };
        },
      }),
    }),
  };
  new ApiExceptionFilter().catch(new Error("DATABASE_URL=password SELECT sensitive_column"), host);
  assert.equal(status, 500);
  assert.equal(body.error.code, "internal_error");
  assert.equal(typeof body.error.message, "string");
  assert.ok(!/password|SELECT|stack|sensitive_column/.test(JSON.stringify(body)));
});
