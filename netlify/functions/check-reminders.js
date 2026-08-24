const nodemailer = require("nodemailer");

exports.handler = async (event, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;

  if (!SUPABASE_URL || !SUPABASE_KEY || !GMAIL_USER || !GMAIL_PASS) {
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

    // Consulta filtrando por completed=false y el rango del día actual
    const respuesta = await fetch(
      `${SUPABASE_URL}/rest/v1/actividades?select=*&fecha_inicio=gte.${hoy}T00:00:00&fecha_inicio=lte.${hoy}T23:59:59&completed=eq.false`,
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
      const listaPersonas = item.people || [];
      const titulo = item.title || item.titulo || "Tarea pendiente";

      for (const persona of listaPersonas) {
        // Extrae el correo (acepta 'email' o 'correo') y el nombre
        const correo = persona.email || persona.correo;
        const nombre = persona.name || persona.nombre || "Usuario";

        if (correo) {
          console.log(`Enviando recordatorio a ${correo}...`);
          await transporter.sendMail({
            from: `"Planificador Cloud" <${GMAIL_USER}>`,
            to: correo,
            subject: `Recordatorio: ${titulo}`,
            html: `<p>Hola <strong>${nombre}</strong>,</p><p>Tienes una actividad programada para hoy: <strong>${titulo}</strong>.</p>`
          });
        }
      }
    }

    console.log("Proceso finalizado con éxito.");
    return { statusCode: 200, body: JSON.stringify({ message: "Correos enviados exitosamente." }) };

  } catch (error) {
    console.error("Error en la función:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
