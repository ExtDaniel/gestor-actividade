const nodemailer = require("nodemailer");

exports.handler = async (event, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;

  if (!SUPABASE_URL || !SUPABASE_KEY || !GMAIL_USER || !GMAIL_PASS) {
    console.error("Faltan variables de entorno en Netlify.");
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan variables de entorno." }) };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  try {
    const hoy = new Date().toISOString().split("T")[0];

    const respuesta = await fetch(
      `${SUPABASE_URL}/rest/v1/actividades?select=*,personas(*)&fecha_inicio=gte.${hoy}T00:00:00&fecha_inicio=lte.${hoy}T23:59:59&estado=eq.pendiente`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const actividades = await respuesta.json();

    if (!Array.isArray(actividades) || actividades.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: "No hay actividades para hoy." }) };
    }

    for (const item of actividades) {
      const correo = item.personas?.email;
      const nombre = item.personas?.nombre || "Usuario";
      const titulo = item.titulo || "Tarea pendiente";

      if (correo) {
        await transporter.sendMail({
          from: `"Planificador Cloud" <${GMAIL_USER}>`,
          to: correo,
          subject: `Recordatorio: ${titulo}`,
          html: `<p>Hola <strong>${nombre}</strong>,</p><p>Tienes una actividad programada para hoy: <strong>${titulo}</strong>.</p>`
        });
      }
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Correos enviados exitosamente." }) };

  } catch (error) {
    console.error("Error al enviar el correo:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
