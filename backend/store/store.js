const { createFileStore } = require("./store-file");

function createStore() {
  if ((process.env.DB_ENGINE || "file").toLowerCase() === "mysql") {
    try {
      return require("./store-mysql").createMySqlStore();
    } catch (error) {
      console.warn(`MySQL store unavailable, using file store: ${error.message}`);
    }
  }
  return createFileStore();
}

module.exports = { createStore };
