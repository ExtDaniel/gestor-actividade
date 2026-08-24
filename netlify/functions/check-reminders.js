const nodemailer = require("nodemailer");

exports.handler = async (event, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  // Acepta SUPABASE_ANON_KEY o SUPABASE_KEY por si acaso
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;

  // Imprime en el log cuáles variables existen (true) y cuáles faltan (false)
  console.log("Chequeo de variables:", {
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_KEY: !!SUPABASE_KEY,
    GMAIL_USER: !!GMAIL_USER,
    GMAIL_PASS: !!GMAIL_PASS
  });

  if (!SUPABASE_URL || !SUPABASE_KEY || !GMAIL_USER || !GMAIL_PASS) {
    console.error("ERROR: Una o más variables de entorno no están disponibles.");
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
      console.log("No hay actividades pendientes para el día de hoy.");
      return { statusCode: 200, body: JSON.stringify({ message: "No hay actividades para hoy." }) };
    }

    for (const item of actividades) {
      const correo = item.personas?.email;
      const nombre = item.personas?.nombre || "Usuario";
      const titulo = item.titulo || "Tarea pendiente";

      if (correo) {
        console.log(`Enviando correo a ${correo}...`);
        await transporter.sendMail({
          from: `"Planificador Cloud" <${GMAIL_USER}>`,
          to: correo,
          subject: `Recordatorio: ${titulo}`,
          html: `<p>Hola <strong>${nombre}</strong>,</p><p>Tienes una actividad programada para hoy: <strong>${titulo}</strong>.</p>`
        });
      }
    }

    console.log("Todos los correos se enviaron exitosamente.");
    return { statusCode: 200, body: JSON.stringify({ message: "Correos enviados exitosamente." }) };

  } catch (error) {
    console.error("Error al ejecutar la función:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
