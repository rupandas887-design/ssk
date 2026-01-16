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
  passwordResetPending?: boolean;
  profile_photo_url?: string;
}

export interface Organisation {
  id: string;
  name: string;
  secretary_name: string;
  mobile: string;
  status: 'Active' | 'Deactivated';
  profile_photo_url?: string;
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

export enum MaritalStatus {
  Single = 'Single',
  Married = 'Married',
  Divorced = 'Divorced',
  Widowed = 'Widowed',
}

export enum Qualification {
  Illiterate = 'No Formal Education',
  Primary = 'Primary School',
  Secondary = 'High School (10th)',
  SeniorSecondary = 'Senior Secondary (12th)',
  Diploma = 'Diploma',
  Graduate = 'Graduate',
  PostGraduate = 'Post Graduate',
  Professional = 'Professional Degree',
  Other = 'Other',
}

export enum Occupation {
  Employee = 'Employee / Job',
  BusinessOwner = 'Business Owner',
  Student = 'Student',
  Retired = 'Retired',
  Engineer = 'Engineer',
  Doctor = 'Doctor',
  Lawyer = 'Lawyer',
  GovtService = 'IAS / KAS / Govt Clerk',
  SocialWorker = 'Social Worker',
  CA = 'Chartered Accountant',
  Housewife = 'Housewife',
  Other = 'Others',
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
  marital_status: MaritalStatus;
  qualification: Qualification;
  emergency_contact: string;
  pincode: string;
  address: string;
  aadhaar_front_url: string;
  aadhaar_back_url: string;
  occupation: Occupation;
  support_need: SupportNeed;
  volunteer_id: string;
  organisation_id: string;
  submission_date: string;
  status: MemberStatus;
}