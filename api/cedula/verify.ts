
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, mensaje: "Method not allowed" });

  try {
    const { cedula } = req.body;
    // URL base proporcionada por el usuario
    let VERIFY_URL = "https://app.gfv.com.py/OUVBUUVMeVYvSlNtVDVKejRkeTVMaU96NzBzQzBVc3RzUGU3a2FXQnlhTkZHYnUybjdMU0RicHRyNEJvQVpERHpieHlTNExXVTRWSFhlUG9RS2kxL1E9PTo6D6FEUqP-ZlJSl-qgC012mg/";
    const SESSION_COOKIE = process.env.GFV_COOKIE || "";

    if (!cedula) return res.status(400).json({ ok: false, mensaje: "Cédula requerida" });

    const cleanCI = String(cedula).replace(/\D/g, "");

    // Generar URL final con la CI al final después del "/"
    let finalUrl = VERIFY_URL.trim();
    if (!finalUrl.endsWith('/')) finalUrl += '/';
    finalUrl += cleanCI;

    const headers: Record<string, string> = {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Referer": "https://app.gfv.com.py/",
    };

    if (SESSION_COOKIE) {
      headers["Cookie"] = SESSION_COOKIE.includes("PHPSESSID") ? SESSION_COOKIE : `PHPSESSID=${SESSION_COOKIE}`;
    }

    const response = await fetch(finalUrl, { 
        method: "GET", 
        headers,
        redirect: 'manual' 
    });

    if (response.status === 302) {
        return res.status(401).json({ ok: false, mensaje: "SESIÓN EXPIRADA. Actualiza el PHPSESSID en Vercel." });
    }

    const rawHtml = await response.text();
    
    // Limpieza de comentarios HTML para evitar errores de parseo
    const sanitizedHtml = rawHtml.replace(/<!--[\s\S]*?-->/g, "");

    /**
     * Motor de extracción V14: Localiza etiquetas y extrae valores de inputs asociados
     */
    const extractField = (label: string) => {
        const lowerLabel = label.toLowerCase();
        const labelPos = sanitizedHtml.toLowerCase().indexOf(lowerLabel);
        if (labelPos === -1) return "";

        const chunk = sanitizedHtml.substring(labelPos, labelPos + 800);
        
        // Definir límites para no saltar a otros campos
        const stopLabels = ["nombres", "apellidos", "fecha de nacimiento", "sexo", "nacionalidad", "estado civil", "calle 1"];
        const otherLabels = stopLabels.filter(l => l !== lowerLabel);
        const boundaryRegex = new RegExp(`(?:${otherLabels.join("|")})`, "i");
        
        const boundaryMatch = chunk.substring(label.length).search(boundaryRegex);
        const searchZone = boundaryMatch !== -1 ? chunk.substring(0, boundaryMatch + label.length) : chunk;

        const valueRegex = /value\s*=\s*["']([^"']*)["']/gi;
        let matches;
        const results: string[] = [];

        while ((matches = valueRegex.exec(searchZone)) !== null) {
            const val = matches[1].trim();
            if (val && !results.includes(val) && val !== "-->") results.push(val);
        }

        return results.join(" ").trim();
    };

    const nombres = extractField("Nombres");
    const apellidos = extractField("Apellidos");
    const fechaNac = extractField("Fecha de Nacimiento");

    if (nombres || apellidos) {
        return res.status(200).json({
            ok: true,
            result: {
                nombres: nombres.toUpperCase(),
                apellidos: apellidos.toUpperCase(),
                cedula: cleanCI,
                fecha_nacimiento: fechaNac || "NO ENCONTRADO",
                estado: "ACTIVO"
            }
        });
    }

    return res.status(404).json({ 
        ok: false, 
        mensaje: "No se localizaron datos. Verifica la sesión o la cédula.",
        debug: sanitizedHtml.substring(0, 100)
    });

  } catch (e: any) {
    return res.status(500).json({ ok: false, mensaje: "Error crítico: " + e.message });
  }
}
