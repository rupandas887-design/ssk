
/**
 * GOOGLE SHEETS SYNCHRONIZATION SERVICE
 * This service pushes real-time data to a Google Apps Script Web App bridge.
 */

// Replace this URL with your deployed Google Apps Script Web App URL
const WEB_APP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

export enum SheetType {
  MEMBERS = 'Member Databases',
  VOLUNTEERS = 'Volunteer Databases',
  ORGANISATIONS = 'Organisation Databases'
}

export const syncToSheets = async (type: SheetType, data: any) => {
  // If no URL is provided, we log to console (Dev Mode)
  if (WEB_APP_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
    console.debug(`[Sheets Sync Simulation] Type: ${type}`, data);
    return;
  }

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors', // CORS handling for GAS
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheetName: type,
        data: data,
        timestamp: new Date().toISOString()
      }),
    });
    return response;
  } catch (error) {
    console.error('Sheets Sync Error:', error);
  }
};
