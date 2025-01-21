const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const ExcelJS = require("exceljs");

const app = express();
const cors = require("cors");

// Configura las políticas de CORS
app.use(cors({
  origin: "*", // Permite este origen específico
  methods: ["GET", "POST"], // Métodos HTTP permitidos
  allowedHeaders: ["Content-Type"], // Headers permitidos
}));

app.use(express.json()); // Para procesar datos en formato JSON
const upload = multer({ dest: "uploads/" }); // Directorio temporal para archivos subidos

// Configura las credenciales de Gmail
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const TOKEN_PATH = "./token.json";
const CREDENTIALS_PATH = "./credenciales.json";

// Autenticación de Gmail
async function authenticate() {
  const { client_secret, client_id, redirect_uris } = JSON.parse(
    fs.readFileSync(CREDENTIALS_PATH)
  ).installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

// Enviar correo con el archivo adjunto
async function sendEmail(filePath, fileName) {
  const auth = await authenticate();
  const gmail = google.gmail({ version: "v1", auth });

  const attachment = fs.readFileSync(filePath).toString("base64");

  const rawMessage = [
    "From: carolainsilva1@gmail.com",
    "To: carolainsilva1@gmail.com",
    "Subject: Acuerdos Creditos Directo Capta",
    "Content-Type: multipart/mixed; boundary=boundary_string",
    "",
    "--boundary_string",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    "Estimados/as, espero que se encuentren bien, les envío los acuerdos generados en el día de hoy. ¡Saludos!, Capta.",
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

  if (response.data.id) {
    console.log("Correo enviado con éxito:", response.data);
  } else {
    console.error("Error al enviar el correo:", response);
  }
}

// Endpoint para procesar y enviar el archivo Excel
app.post("/send-email", async (req, res) => {
  const { data } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "Datos inválidos o no enviados" });
  }

  // Ruta del archivo procesado
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const processedFilePath = path.join(
    __dirname,
    "uploads",
    `acuerdos-${dia}-${mes}.xlsx`
  );

  try {
    // Crear un archivo Excel usando ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Acuerdos");

    // Agregar encabezados
    const headers = [
      "CODIGO",
      "DOCUMENTO",
      "NOMBRE",
      "ENTREGA",
      "MONTOcuota",
      "CANTIDADcuotas",
      "FECHAgestion",
      "MONTOtotal",
      "FECHApago",
      "SUCURSAL",
      "PRD",
    ];
    worksheet.addRow(headers);

    // Agregar datos enviados al Excel
    data.forEach((row) => {
      const rowData = headers.map((key) => row[key] || "");
      worksheet.addRow(rowData);
    });

    // Escribir el archivo Excel
    await workbook.xlsx.writeFile(processedFilePath);

    // Enviar el archivo Excel por correo
    await sendEmail(processedFilePath, path.basename(processedFilePath));

    res.json({
      message: "Correo enviado con éxito",
      fileName: path.basename(processedFilePath),
    });
  } catch (error) {
    console.error("Error al procesar y enviar el archivo:", error);
    res.status(500).json({ error: "Error al procesar y enviar el archivo" });
  } finally {
    // Eliminar el archivo generado
    if (fs.existsSync(processedFilePath)) {
      fs.unlinkSync(processedFilePath);
    }
  }
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log("Servidor en ejecución en el puerto 3000");
});
