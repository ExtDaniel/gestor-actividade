const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;

  try {
    const cleanUrl = SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

    // 1. Consultar actividades pendientes en la tabla 'actividades'
    const respuesta = await fetch(`${cleanUrl}/rest/v1/actividades?completed=eq.false&select=*`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    const actividades = await respuesta.json();

    if (!Array.isArray(actividades) || actividades.length === 0) {
      console.log("No hay actividades pendientes por notificar.");
      return { statusCode: 200, body: JSON.stringify({ message: "Sin actividades pendientes" }) };
    }

    // 2. Configurar el servicio de correo (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
      }
    });

    let enviados = 0;

    // 3. Recorrer actividades y enviar correos
    for (const actividad of actividades) {
      if (Array.isArray(actividad.people)) {
        for (const persona of actividad.people) {
          if (persona.email) {
            await transporter.sendMail({
              from: `"Sistema de Recordatorios" <${GMAIL_USER}>`,
              to: persona.email,
              subject: `Recordatorio [${actividad.priority || 'Normal'}]: ${actividad.name}`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
                  <h2 style="color: #2b6cb0; margin-top: 0;">Hola, ${persona.name || 'Usuario'}</h2>
                  <p>Tienes una actividad pendiente asignada en el sistema:</p>
                  <ul style="line-height: 1.6;">
                    <li><b>Actividad:</b> ${actividad.name}</li>
                    <li><b>Descripción:</b> ${actividad.description || 'Sin descripción'}</li>
                    <li><b>Categoría:</b> ${actividad.category || 'General'}</li>
                    <li><b>Prioridad:</b> ${actividad.priority || 'Normal'}</li>
                    <li><b>Fecha Límite:</b> ${actividad.end_date || 'Sin fecha'}</li>
                  </ul>
                </div>
              `
            });
            enviados++;
            console.log(`Correo enviado exitosamente a: ${persona.email}`);
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Proceso completado. Correos enviados: ${enviados}` })
    };

  } catch (error) {
    console.error("Error durante la ejecución:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
