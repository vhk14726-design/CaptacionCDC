
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, mensaje: "Method not allowed" });

  try {
    const { cedula } = req.body;
    let VERIFY_URL = process.env.GFV_VERIFY_URL || "https://app.gfv.com.py/OUVBUUVMeVYvSlNtVDVKejRkeTVMaU96NzBzQzBVc3RzUGU3a2FXQnlhTkZHYnUybjdMU0RicHRyNEJvQVpERHpieHlTNExXVTRWSFhlUG9RS2kxL1E9PTo6D6FEUqP-ZlJSl-qgC012mg/";
    const SESSION_COOKIE = process.env.GFV_COOKIE || "";

    if (!cedula) return res.status(400).json({ ok: false, mensaje: "Cédula requerida" });

    const cleanCI = String(cedula).replace(/\D/g, "");

    // Construcción de la URL final pegando la cédula al final del hash
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

    const rawText = await response.text();
    const cleanT = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // Lógica de extracción (Busca patrones de nombre en el HTML devuelto por ese hash)
    let nombre = "";
    const patterns = [
        /Nombre[s]?[:\s]+(?:<\/b>|<td>|<span>)?\s*([^<|\n|\r|;]+)/i,
        /<td>\s*Nombres:\s*<\/td>\s*<td>\s*([^<]+)/i,
        /cliente[:\s]+([^<]+)/i
    ];

    for (const p of patterns) {
        const match = rawText.match(p);
        if (match && match[1]) {
            nombre = cleanT(match[1]);
            break;
        }
    }

    if (nombre) {
        return res.status(200).json({
            ok: true,
            result: {
                nombre: nombre.toUpperCase(),
                cedula: cleanCI,
                fecha_nacimiento: "SISTEMA GFV",
                estado: "ACTIVO"
            }
        });
    }

    return res.status(404).json({ 
        ok: false, 
        mensaje: "Cédula no encontrada o sin datos disponibles en GFV.",
        debug: rawText.substring(0, 300)
    });

  } catch (e: any) {
    return res.status(500).json({ ok: false, mensaje: "Error de red: " + e.message });
  }
}
