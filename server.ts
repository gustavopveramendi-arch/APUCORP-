import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client on server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper para obtener preguntas de respaldo altamente realistas según el módulo
function getFallbackQuestions(videoTitle: string) {
  const titleLower = videoTitle.toLowerCase();
  
  if (titleLower.includes("intrusión") || titleLower.includes("módulo 1") || titleLower.includes("accesos")) {
    return [
      {
        id: "preg_fb_" + Date.now() + "_1",
        enunciado: "Ante una intrusión detectada en el perímetro exterior de APUCORP, ¿cuál es el primer protocolo que debe ejecutar el agente?",
        opciones: [
          "Enfrentar físicamente al intruso sin dar aviso para evitar que escape",
          "Dar voz de alerta inmediata por Canal 2, asegurar el perímetro y reportar las características del sospechoso",
          "Ignorar el suceso si el intruso no ha ingresado al edificio principal",
          "Abandonar la garita de control de accesos para resguardarse de inmediato"
        ],
        correcta: 1
      },
      {
        id: "preg_fb_" + Date.now() + "_2",
        enunciado: "¿Cuál es el procedimiento correcto de APUCORPCAPACITA si un visitante se niega a registrar su documento de identidad en el control de accesos?",
        opciones: [
          "Permitir el ingreso bajo su responsabilidad y registrarlo después",
          "Retener su documento a la fuerza y exigirle que ingrese de todos modos",
          "Denegar el ingreso de forma cordial, explicar el protocolo obligatorio de APUCORP y notificar al supervisor",
          "Llamar directamente a la policía sin ofrecer explicaciones al visitante"
        ],
        correcta: 2
      },
      {
        id: "preg_fb_" + Date.now() + "_3",
        enunciado: "En la inspección vehicular obligatoria de APUCORP, ¿qué compartimento del vehículo debe revisarse sin excepción?",
        opciones: [
          "Únicamente el asiento del conductor",
          "La guantera y los compartimentos de la consola central",
          "La maletera completa, la cabina y verificar que el conductor cuente con su credencial activa",
          "No es necesario revisar vehículos si son de uso corporativo frecuente"
        ],
        correcta: 2
      }
    ];
  } else if (titleLower.includes("incendio") || titleLower.includes("módulo 2") || titleLower.includes("refinería")) {
    return [
      {
        id: "preg_fb_" + Date.now() + "_1",
        enunciado: "¿Cuál es el extintor de seguridad contraindicado para combatir un amago de fuego clase B (líquidos inflamables o hidrocarburos) en la refinería?",
        opciones: [
          "Extintor de Polvo Químico Seco (PQS)",
          "Chorro directo de agua presurizada",
          "Extintor de Dióxido de Carbono (CO2)",
          "Espuma química especial para hidrocarburos"
        ],
        correcta: 1
      },
      {
        id: "preg_fb_" + Date.now() + "_2",
        enunciado: "Durante una evacuación por fuga de gas o humo tóxico en la planta de APUCORP, ¿en qué sentido debe dirigirse el personal?",
        opciones: [
          "Siempre en dirección a favor del viento",
          "En dirección perpendicular o en contra del viento, buscando zonas altas y despejadas",
          "Hacia el punto exacto de la fuga para intentar sofocarla",
          "Hacia los sótanos y áreas subterráneas de la refinería"
        ],
        correcta: 1
      },
      {
        id: "preg_fb_" + Date.now() + "_3",
        enunciado: "¿Quién tiene la autoridad de declarar una zona como 'Segura' y autorizar el reingreso del personal de APUCORP tras un incendio?",
        opciones: [
          "El agente de seguridad que se encuentre de guardia en ese momento",
          "El Comité de Crisis, el Jefe de Seguridad Industrial de APUCORP y las Brigadas de Emergencia",
          "Cualquier trabajador que note que el fuego ya se extinguió",
          "La tripulación de transporte de manera informal"
        ],
        correcta: 1
      }
    ];
  } else if (titleLower.includes("minería") || titleLower.includes("módulo 3") || titleLower.includes("perimetral")) {
    return [
      {
        id: "preg_fb_" + Date.now() + "_1",
        enunciado: "¿Cuál es el canal radial de emergencia exclusivo para reportar alertas críticas de seguridad en las operaciones mineras de APUCORP?",
        opciones: [
          "Frecuencia general de operaciones de transporte",
          "Canal de radio 2, exclusivo para Emergencias y Seguridad Física",
          "Llamadas telefónicas personales a compañeros",
          "Cualquier canal libre de la radio de operaciones"
        ],
        correcta: 1
      },
      {
        id: "preg_fb_" + Date.now() + "_2",
        enunciado: "¿Qué equipo de protección personal (EPP) es obligatorio para ingresar al tajo abierto o zona operativa minera de APUCORP?",
        opciones: [
          "Ropa casual de faena y calzado deportivo común",
          "Casco con barbiquejo, lentes de protección lateral, calzado con punta de acero y chaleco reflectivo Clase 3",
          "Únicamente el fotocheck corporativo visible",
          "No se requiere EPP especial si el agente va en un vehículo cerrado"
        ],
        correcta: 1
      },
      {
        id: "preg_fb_" + Date.now() + "_3",
        enunciado: "Ante un bloqueo imprevisto o intento de intrusión pacífica de comuneros en el perímetro minero, ¿cuál es el protocolo de APUCORP?",
        opciones: [
          "Usar fuerza disuasiva de inmediato para dispersar la concentración",
          "Mantener la calma, informar de inmediato al centro de control, no entrar en confrontación y registrar todos los detalles visuales",
          "Cerrar la garita e irse del puesto de guardia para evitar problemas",
          "Negociar acuerdos económicos directos con los manifestantes"
        ],
        correcta: 1
      }
    ];
  }

  // Genérico
  return [
    {
      id: "preg_fb_" + Date.now() + "_1",
      enunciado: `Con relación al tema de capacitación "${videoTitle}", ¿cuál de las siguientes opciones describe el protocolo preventivo correcto?`,
      opciones: [
        "Proceder sin consultar las directivas del manual de APUCORP",
        "Estar alerta, seguir estrictamente las guías de seguridad oficiales y reportar cualquier anomalía al supervisor",
        "Esperar a que ocurra un incidente grave antes de notificar riesgos menores",
        "Delegar la toma de decisiones críticas al personal no capacitado"
      ],
      correcta: 1
    },
    {
      id: "preg_fb_" + Date.now() + "_2",
      enunciado: `¿Cuál es el canal formal de APUCORPCAPACITA para sugerir mejoras o notificar fallas en los sistemas de seguridad presentados en "${videoTitle}"?`,
      opciones: [
        "El cuaderno de ocurrencias diario, los reportes formales al supervisor y los sistemas digitales autorizados",
        "Redes sociales de manera pública",
        "Conversaciones informales durante el horario de almuerzo",
        "No existe ningún canal formal establecido"
      ],
      correcta: 0
    },
    {
      id: "preg_fb_" + Date.now() + "_3",
      enunciado: `¿Por qué es indispensable completar las evaluaciones de capacitación sobre "${videoTitle}" para el personal de APUCORP?`,
      opciones: [
        "Únicamente para cumplir un requisito administrativo sin impacto real",
        "Para garantizar que cada agente conozca con precisión los protocolos de salvaguarda de vidas e instalaciones",
        "Para obtener permisos de salida temprana del servicio",
        "No es una actividad indispensable para la labor diaria"
      ],
      correcta: 1
    }
  ];
}

// 1. API: Generar preguntas interactivas por IA según el video/tema
app.post("/api/generate-questions", async (req, res) => {
  const { videoTitle, videoDescription } = req.body;

  if (!videoTitle) {
    return res.status(400).json({ error: "El título del video es requerido." });
  }

  if (!ai) {
    // Fallback con preguntas predeterminadas si no hay API key para evitar caídas
    console.warn("GEMINI_API_KEY no configurado. Usando banco de preguntas predeterminado.");
    return res.json({
      questions: getFallbackQuestions(videoTitle),
      info: "Preguntas generadas por el sistema (modo fallback - API Key no disponible)"
    });
  }

  try {
    const prompt = `Actúa como un Instructor Experto en Seguridad Corporativa y Salud Ocupacional para APUCORP (APUCORPCAPACITA).
Analiza el siguiente módulo de capacitación en video:
- Título del video: "${videoTitle}"
- Descripción del contenido: "${videoDescription || 'Contenido general de seguridad de APUCORP'}"

Tu tarea es generar exactamente 3 preguntas de evaluación de opción múltiple de alta calidad para evaluar la comprensión del agente tras ver este video.
Cada pregunta debe tener exactamente 4 opciones de respuesta y una sola respuesta correcta indicada por su índice (un entero de 0 a 3).
Las preguntas deben ser realistas, profesionales y enfocadas en la prevención de riesgos, protocolos de acción rápida y normativas de seguridad de APUCORP.

Debes responder estrictamente en formato JSON utilizando el esquema indicado a continuación. No incluyas comentarios, marcas markdown, bloques de código markdown ni texto adicional. Solo devuelve el arreglo JSON de preguntas.

Esquema del JSON esperado:
[
  {
    "id": "string (único, ej: preg_ai_1)",
    "enunciado": "string (pregunta clara y profesional sobre el video)",
    "opciones": [
      "string (opción 0)",
      "string (opción 1)",
      "string (opción 2)",
      "string (opción 3)"
    ],
    "correcta": number (entero del 0 al 3 que represente la opción correcta)
  }
]`;

    let response;
    let modelUsed = "gemini-3.5-flash";
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                enunciado: { type: Type.STRING },
                opciones: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correcta: { type: Type.INTEGER }
              },
              required: ["id", "enunciado", "opciones", "correcta"]
            }
          }
        }
      });
    } catch (firstError: any) {
      console.warn("Error con gemini-3.5-flash, intentando fallback con gemini-flash-latest:", firstError.message || firstError);
      modelUsed = "gemini-flash-latest";
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                enunciado: { type: Type.STRING },
                opciones: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correcta: { type: Type.INTEGER }
              },
              required: ["id", "enunciado", "opciones", "correcta"]
            }
          }
        }
      });
    }

    const text = response.text || "";
    const parsedQuestions = JSON.parse(text.trim());

    return res.json({
      questions: parsedQuestions,
      info: `Preguntas generadas con éxito por la Inteligencia Artificial (${modelUsed})`
    });

  } catch (error: any) {
    console.error("Error al generar preguntas con Gemini, activando fallback inteligente:", error);
    // En lugar de fallar con 500, devolvemos las preguntas del fallback de alta calidad
    return res.json({
      questions: getFallbackQuestions(videoTitle),
      info: `Preguntas generadas por el motor local inteligente de APUCORP (Respaldo por alta demanda en servidor de IA: ${error.message || 'Unavailable'})`
    });
  }
});

// Serve API status check
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    appName: "APUCORPCAPACITA",
    geminiConfigured: !!apiKey
  });
});

// Setup Vite Dev server or production static serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[APUCORPCAPACITA] Servidor iniciado en http://0.0.0.0:${PORT}`);
  });
}

setupVite();
