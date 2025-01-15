import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

export default async function handler(req, res) {
    // Configurar transporte SMTP
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,  // Acceder a la variable de entorno
            pass: process.env.EMAIL_PASS   // Acceder a la variable de entorno
        }
    });

    // Opciones del correo
    const mailOptions = {
        from: process.env.EMAIL_USER,   // Usar variable de entorno
        to: req.body.to,
        subject: req.body.subject,
        text: req.body.text,
        attachments: [
            {
                filename: req.body.fileName,
                content: Buffer.from(req.body.fileContent, "base64")
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Correo enviado con éxito" });
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        res.status(500).json({ message: "Error al enviar el correo", error });
    }
}
