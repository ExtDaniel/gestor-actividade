exports.handler = async (event, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  try {
    const cleanUrl = SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

    // 1. Probar la tabla en inglés 'activities'
    const resIngles = await fetch(`${cleanUrl}/rest/v1/activities?select=*`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const datosIngles = await resIngles.json();

    // 2. Probar la tabla en español 'actividades'
    const resEspanol = await fetch(`${cleanUrl}/rest/v1/actividades?select=*`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const datosEspanol = await resEspanol.json();

    console.log("=== RESULTADO 'activities' (Inglés) ===");
    console.log(JSON.stringify(datosIngles, null, 2));

    console.log("=== RESULTADO 'actividades' (Español) ===");
    console.log(JSON.stringify(datosEspanol, null, 2));

    return { 
      statusCode: 200, 
      body: JSON.stringify({ activities: datosIngles, actividades: datosEspanol }) 
    };
  } catch (error) {
    console.error("Error:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
