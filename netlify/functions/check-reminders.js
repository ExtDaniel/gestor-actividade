exports.handler = async (event, context) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  try {
    const cleanUrl = SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    
    // Petición directa a la tabla activities sin ningún filtro
    const respuesta = await fetch(`${cleanUrl}/rest/v1/activities?select=*`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    const datos = await respuesta.json();

    console.log("=== DATOS ENCONTRADOS EN SUPABASE ===");
    console.log(JSON.stringify(datos, null, 2));

    return { statusCode: 200, body: JSON.stringify(datos) };
  } catch (error) {
    console.error("Error:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
