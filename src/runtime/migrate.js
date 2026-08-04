/**
 * Staging migrator entry (compiled path used in Docker).
 * Prefer dist-core after tsc; this file is a thin bootstrap for compose.
 */
try {
  require("../storage/migrate-cli.js");
} catch {
  require("../../dist-core/src/storage/migrate-cli.js");
}
