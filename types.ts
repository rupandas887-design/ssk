
export enum Role {
  MasterAdmin = 'MasterAdmin',
  Organisation = 'Organisation',
  Volunteer = 'Volunteer',
}

export interface User {
  id: string;
  name: string;
  role: Role | string; // Keep as string fallback for historical data/filtering
  email: string;
  organisationId?: string; 
  organisationName?: string;
  mobile?: string;
  status?: 'Active' | 'Deactivated';
}

export interface Organisation {
  id: string;
  name: string;
  secretary_name: string;
  mobile: string;
  status: 'Active' | 'Deactivated';
}

export interface Volunteer extends User {
  organisationId: string;
  enrollments: number;
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum Occupation {
  Job = 'Job',
  Business = 'Business',
  Professional = 'Professional',
  Housewife = 'Housewife',
  Student = 'Student',
  Retired = 'Retired',
  Other = 'Other',
}

export enum SupportNeed {
  Education = 'Education',
  Medical = 'Medical',
  Marriage = 'Marriage',
  Housing = 'Housing',
  Job = 'Job',
  Investment = 'Investment',
  GovtAssistance = 'Govt Assistance',
  Other = 'Other',
}

export enum MemberStatus {
    Pending = 'Pending',
    Accepted = 'Accepted'
}

export interface Member {
  id: string;
  aadhaar: string;
  mobile: string;
  name: string;
  surname: string;
  father_name: string;
  dob: string;
  gender: Gender;
  emergency_contact: string;
  pincode: string;
  address: string;
  member_image_url: string;
  occupation: Occupation;
  support_need: SupportNeed;
  volunteer_id: string;
  organisation_id: string;
  submission_date: string;
  status: MemberStatus;
}
