const fs = require("fs");

["sessions", "logs", "database"].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

require("./main");
