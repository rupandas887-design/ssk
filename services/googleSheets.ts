/**
 * GOOGLE SHEETS SYNCHRONIZATION SERVICE
 * This service pushes real-time data to a Google Apps Script Web App bridge.
 * 
 * REQUIRED GOOGLE SHEET COLUMN HEADERS:
 * 
 * Tab: "Member Databases"
 * aadhaar, mobile, name, surname, father_name, dob, gender, marital_status, qualification, emergency_contact, pincode, address, aadhaar_front_url, occupation, support_need, volunteer_id, organisation_id, volunteer_name, organisation_name, submission_date, status
 * 
 * Tab: "Volunteer Databases"
 * name, email, mobile, organisation_name, status, authorized_date
 * 
 * Tab: "Organisation Databases"
 * name, secretary_name, mobile, email, status, registration_date
 */

// Your live Google Apps Script Web App URL
const WEB_APP_URL: string = "https://script.google.com/macros/s/AKfycbwoJO7hX4I_qOSqZhHtYzmEwC7wnIoVk59-QOXQ6GrGyhRHXq7JW3nPICd-RLJI26VgkA/exec";

export enum SheetType {
  MEMBERS = 'Member Databases',
  VOLUNTEERS = 'Volunteer Databases',
  ORGANISATIONS = 'Organisation Databases'
}

/**
 * Synchronizes data to Google Sheets.
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

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    
    console.debug(`[Sheets Sync] Payload dispatched to Google Network for ${type}.`);
    return response;
  } catch (error) {
    console.error('[Sheets Sync Error] Communication failure:', error);
  }
};