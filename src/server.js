
require("dotenv").config();

const config = require("./config");
const app = require("./app");

const server = app.listen(config.PORT, () => {
  console.log(`2B Zone API listening on port ${config.PORT}`);
});

function stop(signal) {
  console.log(`${signal} received`);

  server.close(async () => {
    await require("./db").end();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
