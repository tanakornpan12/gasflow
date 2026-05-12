const { createFileStore } = require("./store-file");
const { isProductionMode } = require("../production-readiness");

function createStore() {
  if ((process.env.DB_ENGINE || "file").toLowerCase() === "mysql") {
    try {
      return require("./store-mysql").createMySqlStore();
    } catch (error) {
      if (isProductionMode()) {
        throw new Error(`MySQL store unavailable in production: ${error.message}`);
      }
      console.warn(`MySQL store unavailable, using file store: ${error.message}`);
    }
  }
  if (isProductionMode()) {
    throw new Error("File store is not allowed in production. Set DB_ENGINE=mysql and configure MySQL.");
  }
  return createFileStore();
}

module.exports = { createStore };
