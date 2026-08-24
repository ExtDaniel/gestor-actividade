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
    // Elimina barras al final o sufijos /rest/v1 duplicados en la variable de entorno
    const cleanUrl = SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    const endpoint = `${cleanUrl}/rest/v1/activities?select=*&completed=eq.false`;

    const respuesta = await fetch(endpoint, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    const actividades = await respuesta.json();

    if (!Array.isArray(actividades) || actividades.length === 0) {
      console.log("No se encontraron actividades pendientes.");
      return { statusCode: 200, body: JSON.stringify({ message: "Sin actividades pendientes." }) };
    }

    for (const item of actividades) {
      const listaPersonas = item.people || [];
      const titulo = item.title || item.titulo || "Tarea pendiente";

      for (const persona of listaPersonas) {
        const correo = persona.email || persona.correo;
        const nombre = persona.name || persona.nombre || "Usuario";

        if (correo) {
          console.log(`Enviando correo a: ${correo}`);
          await transporter.sendMail({
            from: `"Planificador Cloud" <${GMAIL_USER}>`,
            to: correo,
            subject: `Recordatorio: ${titulo}`,
            html: `<p>Hola <strong>${nombre}</strong>,</p><p>Tienes la siguiente actividad pendiente: <strong>${titulo}</strong>.</p>`
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
