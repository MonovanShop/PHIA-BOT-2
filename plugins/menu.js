import config from "../config.js";

export default {
  name: "menu",
  command: ["menu", "help"],
  owner: true, // Esto asegura que solo los owners configurados puedan ejecutarlo

  async run({ sock, from, isOwner }) {
    // Validación extra de seguridad
    if (!isOwner) return; 

    const menuBusines = `✨ *PANEL DE CONTROL GM LUXURY* 💎

Hola, Administrador. Aquí tienes las herramientas de gestión de ventas:

📝 *GESTIÓN DE VENTAS*
- *${config.prefix}registrarcompra Name | Num*: Registra una venta al contado y envía el ticket automáticamente.
- *${config.prefix}abono Name | Num*: Registra pagos parciales (modalidad 3 quincenas) y envía comprobante.
- *${config.prefix}pedido Name | Num*: Registra preventas de productos (3 semanas para liquidar tras entrega).
- *${config.prefix}mixto Name | Num*: Para clientes con adeudo previo y un nuevo pedido en proceso.

🎁 *MARKETING Y FIDELIZACIÓN*
- *${config.prefix}cupon Name | Num | Tipo*: Genera cupones de descuento al azar (más altos para pagos de contado).

⚙️ *SISTEMA*
- *${config.prefix}menu*: Muestra este panel de administración.
- *${config.prefix}owner*: Muestra la información de contacto del propietario.

*Nota:* Recuerda siempre adjuntar el PDF al usar los comandos de registro. 📄`;

    await sock.sendMessage(from, { text: menuBusines });
  }
};
