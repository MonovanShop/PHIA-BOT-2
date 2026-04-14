const fs = require("fs");
const path = require("path");
const config = require("./config");

const plugins = fs.readdirSync("./plugins").map(file =>
  require(`./plugins/${file}`)
);

module.exports = async function handler(ctx) {
  const { text, sock, from } = ctx;

  // ejecutar todos los "all"
  for (const plugin of plugins) {
    if (plugin.all) await plugin.all(ctx);
  }

  if (!text.startsWith(config.prefix)) return;

  const args = text.slice(1).split(" ");
  const command = args.shift().toLowerCase();

  const plugin = plugins.find(p =>
    Array.isArray(p.command)
      ? p.command.includes(command)
      : p.command === command
  );

  if (!plugin) {
    return sock.sendMessage(from, { text: "Comando no válido" });
  }

  await plugin.run(ctx, args);
};
