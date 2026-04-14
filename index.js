const fs = require("fs");
const readline = require("readline");

// crear carpetas si no existen
["sessions", "logs", "database"].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// errores globales
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// interfaz de terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
==============================
   BOT TIENDA WHATSAPP
==============================

1) Generar QR
2) Salir

Escribe una opción:
`);

rl.on("line", (input) => {
  const opcion = input.trim();

  if (opcion === "1") {
    console.log("\nGenerando QR...\n");
    rl.close();
    require("./main"); // inicia el bot
  } else if (opcion === "2") {
    console.log("Saliendo...");
    process.exit(0);
  } else {
    console.log("Opción no válida. Escribe 1 o 2.");
  }
});
