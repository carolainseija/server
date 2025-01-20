const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const ExcelJS = require("exceljs");

const app = express();
const upload = multer(); // No necesitas un directorio para subir archivos

// Configurar las credenciales de Gmail desde variables de entorno
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

// Autenticación de Gmail
async function authenticate() {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN } = process.env;

  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  return oAuth2Client;
}

// Enviar correo con el archivo adjunto
async function sendEmail(buffer, fileName) {
  const auth = await authenticate();
  const gmail = google.gmail({ version: "v1", auth });

  const attachment = buffer.toString("base64");

  const rawMessage = [
    "From: carolainsilva1@gmail.com",
    "To: carolainsilva1@gmail.com",
    "Subject: Acuerdos Capta",
    "Content-Type: multipart/mixed; boundary=boundary_string",
    "",
    "--boundary_string",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    "Estimados/as, espero que se encuentren bien. Les envío los acuerdos generados en el día de hoy. ¡Saludos!, Capta.",
    "",
    "--boundary_string",
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${fileName}"`,
    `Content-Disposition: attachment; filename="${fileName}"`,
    "Content-Transfer-Encoding: base64",
    "",
    attachment,
    "",
    "--boundary_string--",
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  console.log("Correo enviado con éxito:", response.data);
}

// Endpoint para procesar y enviar el archivo Excel
app.post("/send-email", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Crear un archivo Excel usando ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Acuerdos");

    // Estilizar encabezados
    const headers = [
      "CODIGO", "DOCUMENTO", "NOMBRE", "ENTREGA",
      "MONTOcuota", "CANTIDADcuotas", "FECHAgestion",
      "MONTOtotal", "FECHApago", "SUCURSAL", "PRD"
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0000FF" } }; // Fondo azul
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Simulación de datos procesados
    const newData = [
      {
        CODIGO: "123",
        DOCUMENTO: "45678901",
        NOMBRE: "Juan Pérez",
        ENTREGA: "Sí",
        MONTOcuota: "5000",
        CANTIDADcuotas: "12",
        FECHAgestion: "2025-01-20",
        MONTOtotal: "60000",
        FECHApago: "2025-02-20",
        SUCURSAL: "Montevideo",
        PRD: "Personal",
      },
    ];

    // Agregar datos a la hoja
    newData.forEach(data => worksheet.addRow(Object.values(data)));

    // Escribir el archivo Excel a un buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Enviar el archivo Excel por correo
    const fileName = `acuerdos-${new Date().toISOString().slice(0, 10)}.xlsx`;
    await sendEmail(buffer, fileName);

    res.json({ message: "Correo enviado con éxito", fileName });
  } catch (error) {
    console.error("Error al procesar y enviar el archivo:", error);
    res.status(500).json({ error: "Error al procesar y enviar el archivo" });
  }
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log("Servidor en ejecución en el puerto 3000");
});
