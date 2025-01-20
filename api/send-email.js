import { google } from "googleapis";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

// Habilitar CORS
export default async function handler(req, res) {
  // Configurar los encabezados CORS

  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5501"); // Asegúrate de permitir la URL correcta de tu frontend
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Manejo de solicitudes OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Configura las credenciales de Gmail
    const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
    const TOKEN_PATH = "./token.json";
    const CREDENTIALS_PATH = "./credenciales.json";

    // Autenticación de Gmail
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

    // Enviar correo con el archivo adjunto
    async function sendEmail(filePath, fileName) {
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
      const attachment = fs.readFileSync(filePath).toString("base64");

      const rawMessage = [
        "From: carolainsilva1@gmail.com",
        "To: carolainsilva1@gmail.com",
        "Subject: Acuerdos Capta",
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

    // Ruta temporal para guardar el archivo Excel procesado
    const fecha = new Date();
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const processedFilePath = path.join(
      __dirname,
      "uploads",
      `acuerdos-${dia}-${mes}.xlsx`
    );

    // Crear un archivo Excel usando ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Acuerdos");

    // Agregar encabezados
    const headers = [
      "CODIGO", "DOCUMENTO", "NOMBRE", "ENTREGA",
      "MONTOcuota", "CANTIDADcuotas", "FECHAgestion",
      "MONTOtotal", "FECHApago", "SUCURSAL", "PRD"
    ];
    worksheet.addRow(headers);

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

    // Agregar los datos a la hoja de Excel
    newData.forEach(data => worksheet.addRow(Object.values(data)));

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
}
