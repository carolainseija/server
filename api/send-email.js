import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req, res) {
    // Habilitar CORS para todas las solicitudes
    res.setHeader('Access-Control-Allow-Origin', '*'); // Cambia '*' por un dominio específico si deseas restringir el acceso.
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar solicitudes OPTIONS para CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verificar que la solicitud sea POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,  // Acceder a la variable de entorno
            pass: process.env.EMAIL_PASS   // Acceder a la variable de entorno
        }
    });

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
