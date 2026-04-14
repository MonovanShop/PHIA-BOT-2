const config = require("../config");

module.exports = {
  name: "menu",
  command: ["menu", "help"],

  async run({ sock, from }) {
    await sock.sendMessage(from, {
      text:
`📋 MENU

${config.prefix}ticket - Enviar comprobante
${config.prefix}estado - Ver pedido
${config.prefix}gracias - Confirmar compra`
    });
  }
};
