/**
 * Google Sheets API Integration Service for APUCORP CAPACITA
 */

interface SpreadsheetCreationResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a brand-new structured Google Sheet for APUCORP database
 */
export async function createApuCorpSpreadsheet(
  accessToken: string,
  title: string
): Promise<SpreadsheetCreationResponse> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  
  const payload = {
    properties: {
      title: title || `Base de Datos APUCORP CAPACITA - ${new Date().toLocaleDateString()}`
    },
    sheets: [
      {
        properties: {
          title: "Módulos",
          gridProperties: { rowCount: 100, columnCount: 10 }
        }
      },
      {
        properties: {
          title: "Agentes",
          gridProperties: { rowCount: 100, columnCount: 12 }
        }
      },
      {
        properties: {
          title: "Bitácora de Eventos",
          gridProperties: { rowCount: 200, columnCount: 5 }
        }
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "No se pudo crear la hoja de cálculo en Google Sheets.");
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl
  };
}

/**
 * Checks if a spreadsheet is accessible and has the correct tabs
 */
export async function validateSpreadsheet(accessToken: string, spreadsheetId: string): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  });

  return response.ok;
}

/**
 * Syncs courses, agents, and logs state directly to the Google Sheet
 */
export async function syncDatabaseToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  courses: any[],
  agents: any[],
  logs: string[]
): Promise<void> {
  // 1. Prepare data for "Módulos" tab
  const modulesHeader = ["ID de Módulo", "Título del Módulo", "Descripción", "Enlace o Archivo", "Preguntas Generadas"];
  const modulesRows = courses.map((c) => [
    c.id,
    c.titulo,
    c.descripcion || "Sin descripción",
    c.enlaceUrl || c.archivoNombre || "Contenido Preinstalado",
    c.preguntas && c.preguntas.length > 0 ? `Sí (${c.preguntas.length} preguntas)` : "No (Usa preguntas de respaldo)"
  ]);
  const modulesValues = [modulesHeader, ...modulesRows];

  // Fill empty rows to clear previous values (safety)
  while (modulesValues.length < 50) {
    modulesValues.push(["", "", "", "", ""]);
  }

  // 2. Prepare data for "Agentes" tab
  const agentsHeader = ["ID de Agente", "Nombre Completo", "Correo Electrónico", "DNI / Identificación", "Celular", "Sede / Unidad", "Puesto Asignado", "Último Puntaje (X/20)", "Estado de Capacitación", "Fecha de Intento"];
  const agentsRows = agents.map((a) => [
    a.id,
    a.nombre,
    a.correo,
    a.dni,
    a.celular,
    a.sede,
    a.puesto,
    a.puntaje,
    a.estado,
    a.fecha
  ]);
  const agentsValues = [agentsHeader, ...agentsRows];
  
  while (agentsValues.length < 50) {
    agentsValues.push(["", "", "", "", "", "", "", "", "", ""]);
  }

  // 3. Prepare data for "Bitácora de Eventos" tab
  const logsHeader = ["Fecha y Hora (Local / Servidor)", "Descripción del Suceso"];
  const logsRows = logs.map((l) => {
    // Extract timestamp if possible [HH:MM:SS] Text...
    const match = l.match(/^\[(.*?)\] (.*)$/);
    if (match) {
      return [match[1], match[2]];
    }
    return [new Date().toLocaleString(), l];
  });
  const logsValues = [logsHeader, ...logsRows];

  while (logsValues.length < 150) {
    logsValues.push(["", ""]);
  }

  // 4. Send bulk batchUpdate to write all sheets at once
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const payload = {
    valueInputOption: "RAW",
    data: [
      {
        range: "Módulos!A1:E50",
        values: modulesValues
      },
      {
        range: "Agentes!A1:J50",
        values: agentsValues
      },
      {
        range: "Bitácora de Eventos!A1:B150",
        values: logsValues
      }
    ]
  };

  const response = await fetch(updateUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al actualizar los datos en Google Sheets.");
  }
}
