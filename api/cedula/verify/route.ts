import { NextResponse } from "next/server";

function isCedulaValid(value: string) {
  const v = value.replace(/\D/g, "");
  return v.length >= 6;
}

export async function POST(req: Request) {
  try {
    const { cedula } = await req.json();

    if (!cedula || !isCedulaValid(String(cedula))) {
      return NextResponse.json({ ok: false, mensaje: "Cédula inválida" }, { status: 400 });
    }

    const VERIFY_URL = process.env.GFV_VERIFY_URL;
    if (!VERIFY_URL) {
      return NextResponse.json({ ok: false, mensaje: "Falta GFV_VERIFY_URL en variables de entorno" }, { status: 500 });
    }

    // Replica el "target" del sistema original
    const target = { origen: "cliente", verificar: VERIFY_URL };

    // El sistema original manda x-www-form-urlencoded (jQuery), por eso usamos URLSearchParams
    const body = new URLSearchParams();
    body.set("documento", String(cedula).trim());

    // Simula data: { origen, verificar } como en el front original
    body.set("data[origen]", target.origen);
    body.set("data[verificar]", target.verificar);

    // Timeout de 20 segundos para dar más margen al servidor externo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const r = await fetch(VERIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
        },
        body,
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await r.text();
      let result: any;

      try {
        result = JSON.parse(text);
      } catch {
        result = { raw: text, providerStatus: r.status };
      }

      return NextResponse.json({ ok: true, result, providerStatus: r.status });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ ok: false, mensaje: "El servidor de GFV tardó demasiado en responder (Timeout 20s)" }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, mensaje: e?.message ?? "Error interno" }, { status: 500 });
  }
}