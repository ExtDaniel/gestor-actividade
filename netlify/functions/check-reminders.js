exports.handler = async (event, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  console.log("Variables cargadas:", { 
    url: !!SUPABASE_URL, 
    key: !!SUPABASE_KEY, 
    resend: !!RESEND_API_KEY 
  });

  if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_API_KEY) {
    console.error("Faltan variables de entorno en Netlify.");
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan variables de entorno." }) };
  }

  try {
    const hoy = new Date().toISOString().split('T')[0];
    console.log("Buscando actividades para el día:", hoy);

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
    console.log("Actividades encontradas en Supabase:", JSON.stringify(actividades));

    if (!Array.isArray(actividades) || actividades.length === 0) {
      console.log("No se encontraron actividades pendientes para la fecha actual.");
      return { statusCode: 200, body: JSON.stringify({ message: "No hay actividades para hoy." }) };
    }

    for (const item of actividades) {
      const correo = item.personas?.email;
      const nombre = item.personas?.nombre || "Usuario";
      const titulo = item.titulo || "Tarea pendiente";

      console.log(`Intentando enviar correo a: ${correo}`);

      if (correo) {
        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: correo,
            subject: `Recordatorio: ${titulo}`,
            html: `<p>Hola <strong>${nombre}</strong>,</p><p>Tienes una actividad programada para hoy: <strong>${titulo}</strong>.</p>`
          })
        });

        const resendData = await resendResp.json();
        console.log("Respuesta de la API de Resend:", JSON.stringify(resendData));
      }
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Proceso completado." }) };

  } catch (error) {
    console.error("Error en ejecución:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
