const nodemailer = require("nodemailer");

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método no permitido" });
    }

    const { to, subject, text, fileName, fileContent } = req.body;

    if (!to || !subject || !text || !fileName || !fileContent) {
        return res.status(400).json({ message: "Faltan datos" });
    }

    try {
        // Configura el transporte (puedes usar Gmail o cualquier SMTP)
        const transporter = nodemailer.createTransport({
            service: "gmail", // Usa Gmail, o tu servicio preferido
            auth: {
                user: "TU_CORREO@gmail.com", // Cambia esto por tu correo
                pass: "TU_CONTRASEÑA" // Usa una contraseña de aplicación o token
            }
        });

        // Configura el correo
        const mailOptions = {
            from: "TU_CORREO@gmail.com",
            to,
            subject,
            text,
            attachments: [
                {
                    filename: fileName,
                    content: Buffer.from(fileContent, "base64")
                }
            ]
        };

        // Envía el correo
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Correo enviado con éxito" });
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        res.status(500).json({ message: "Error al enviar el correo", error });
    }
}
