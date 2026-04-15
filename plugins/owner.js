export default {
  name: "owner",
  command: ["owner", "owners"],

  async run({ sock, from, config }) {
    const text = config.owners
      .map(o => `• ${o.name} - ${o.number} (${o.role})`)
      .join("\n");

    await sock.sendMessage(from, {
      text: `👑 Owners autorizados:\n\n${text}`
    });
  }
};
