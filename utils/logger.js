import chalk from "chalk";

function line() {
  console.log(chalk.gray("────────────────────────────────────────────"));
}

const logger = {
  banner() {
    console.clear();
    console.log(chalk.cyan.bold(`
╔════════════════════════════════════════════╗
║                                            ║
║              TIENDA BOT ACTIVO             ║
║                                            ║
╚════════════════════════════════════════════╝
`));
    console.log(chalk.green.bold("     WhatsApp conectado y escuchando mensajes\n"));
  },

  info(msg) {
    console.log(chalk.blueBright(`[ INFO ] ${msg}`));
  },

  ok(msg) {
    console.log(chalk.greenBright(`[ OK ] ${msg}`));
  },

  warn(msg) {
    console.log(chalk.yellowBright(`[ WARN ] ${msg}`));
  },

  error(msg) {
    console.log(chalk.redBright(`[ ERROR ] ${msg}`));
  },

  plugin(msg) {
    console.log(chalk.magentaBright(`[ PLUGIN ] ${msg}`));
  },

  // 🔥 MENSAJE BONITO
  msg(sender, text) {
    console.log(chalk.gray("╔════════════════ MENSAJE ════════════════╗"));
    console.log(chalk.cyan(`║ De: ${sender}`));
    console.log(chalk.white(`║ Texto: ${text}`));
    console.log(chalk.gray("╚═════════════════════════════════════════╝"));
  },

  cmd(command) {
    console.log(chalk.greenBright(`[ CMD ] ${command}`));
  }
};

export default logger;
