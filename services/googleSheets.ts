/**
 * GOOGLE SHEETS SYNCHRONIZATION SERVICE
 * This service pushes real-time data to a Google Apps Script Web App bridge.
 */

// Your newest live Google Apps Script Web App URL
const WEB_APP_URL: string = "https://script.google.com/macros/s/AKfycbwoJO7hX4I_qOSqZhHtYzmEwC7wnIoVk59-QOXQ6GrGyhRHXq7JW3nPICd-RLJI26VgkA/exec";

export enum SheetType {
  MEMBERS = 'Member Databases',
  VOLUNTEERS = 'Volunteer Databases',
  ORGANISATIONS = 'Organisation Databases'
}

/**
 * Synchronizes data to Google Sheets.
 * NOTE: We use 'text/plain' and 'no-cors' mode because Google Apps Script 
 * does not support CORS preflight (OPTIONS) requests required for 'application/json'.
 * Using text/plain avoids the preflight while the script parses the body manually.
 */
export const syncToSheets = async (type: SheetType, data: any) => {
  if (!WEB_APP_URL || WEB_APP_URL.includes("PASTE_YOUR_COPIED")) {
    console.debug(`[Sheets Sync Simulation] Type: ${type}`, data);
    return;
  }

  const payload = {
    sheetName: type,
    data: data,
    timestamp: new Date().toISOString()
  };

  console.debug(`[Sheets Sync] Initiating uplink for ${type}...`, payload);

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors', // Essential for Google Apps Script compatibility
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    
    /**
     * In 'no-cors' mode, the browser cannot read the response body or status code.
     * We log a dispatch message. If the data isn't appearing in the sheet:
     * 1. Check if the script is deployed as a Web App.
     * 2. Check if access is set to "Anyone".
     * 3. Check if the sheet names in your spreadsheet match the SheetType enum exactly.
     */
    console.debug(`[Sheets Sync] Payload dispatched to Google Network. Check your spreadsheet for updates.`);
    return response;
  } catch (error) {
    console.error('[Sheets Sync Error] Fatal communication failure:', error);
  }
};