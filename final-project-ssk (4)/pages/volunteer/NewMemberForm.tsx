import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { Gender, Occupation, SupportNeed, MaritalStatus, Qualification, Role } from '../../types';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import CulturalLoader from '../../components/ui/CulturalLoader';
import { 
  ShieldAlert, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  Check, 
  Loader2, 
  AlertCircle,
  User,
  Phone,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileCheck
} from 'lucide-react';

const initialFormData = {
  aadhaar: '',
  mobile: '',
  name: '',
  surname: '',
  fatherName: '',
  dob: '',
  gender: '' as unknown as Gender,
  maritalStatus: '' as unknown as MaritalStatus,
  qualification: '' as unknown as Qualification,
  emergencyContact: '',
  pincode: '',
  address: '',
  aadhaarPhoto: null as File | null,
  occupation: '' as unknown as Occupation,
  supportNeed: '' as unknown as SupportNeed,
};

type AadhaarCheckStatus = 'idle' | 'checking' | 'verified' | 'duplicate' | 'error';

// Standard 12-digit numeric Aadhaar verification
export const validateAadhaarFormat = (aadhaar: string): boolean => {
  const clean = (aadhaar || '').replace(/\D/g, '');
  return clean.length === 12;
};

const NewMemberForm: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Aadhaar duplicate checking state
  const [aadhaarStatus, setAadhaarStatus] = useState<AadhaarCheckStatus>('idle');
  const [aadhaarError, setAadhaarError] = useState('');
  const lastCheckedAadhaarRef = useRef<string>('');

  // Diagnostic: Check if volunteer is unlinked
  const isUnlinkedVolunteer = Boolean(user && user.role === Role.Volunteer && !user.organisationId);

  // Core verification function that queries Supabase for entered 12-digit Aadhaar
  const checkAadhaar = useCallback(async (aadhaarNumber: string): Promise<boolean> => {
    const normalized = (aadhaarNumber || '').replace(/\D/g, '').slice(0, 12);

    if (normalized.length !== 12) {
      setAadhaarStatus('idle');
      setAadhaarError('');
      lastCheckedAadhaarRef.current = '';
      return false;
    }

    setAadhaarStatus('checking');
    setAadhaarError('');

    try {
      // Direct query on members table using maybeSingle()
      const { data, error } = await supabase
        .from('members')
        .select('id, name, surname')
        .eq('aadhaar', normalized)
        .maybeSingle();

      if (error) {
        console.error('Aadhaar Supabase check failed:', error);
        lastCheckedAadhaarRef.current = '';
        setAadhaarStatus('error');
        setAadhaarError('Unable to verify identification with database. Click Retry.');
        return false;
      }

      lastCheckedAadhaarRef.current = normalized;

      if (data) {
        setAadhaarStatus('duplicate');
        setAadhaarError('Aadhaar number already registered.');
        return false;
      }

      setAadhaarStatus('verified');
      setAadhaarError('');
      return true;
    } catch (err: any) {
      console.error('Aadhaar verification error:', err);
      lastCheckedAadhaarRef.current = '';
      setAadhaarStatus('error');
      setAadhaarError('Network connection issue. Click Retry.');
      return false;
    }
  }, []);

  // Auto-verify if 12 digits are present and haven't been checked yet
  useEffect(() => {
    const clean = (formData.aadhaar || '').replace(/\D/g, '').slice(0, 12);
    if (clean.length === 12 && lastCheckedAadhaarRef.current !== clean && aadhaarStatus !== 'checking') {
      checkAadhaar(clean);
    }
  }, [formData.aadhaar, checkAadhaar, aadhaarStatus]);

  const handleAadhaarPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const normalized = pasted.replace(/\D/g, '').slice(0, 12);
    setFormData(prev => ({ ...prev, aadhaar: normalized }));
    setValidationError('');

    if (normalized.length === 12) {
      if (lastCheckedAadhaarRef.current !== normalized) {
        checkAadhaar(normalized);
      }
    } else {
      setAadhaarStatus('idle');
      setAadhaarError('');
      lastCheckedAadhaarRef.current = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'aadhaar') {
      const normalizedAadhaar = value.replace(/\D/g, '').slice(0, 12);
      setFormData(prev => ({ ...prev, [name]: normalizedAadhaar }));
      setValidationError('');

      if (normalizedAadhaar.length === 12) {
        if (normalizedAadhaar !== lastCheckedAadhaarRef.current) {
          checkAadhaar(normalizedAadhaar);
        }
      } else {
        setAadhaarStatus('idle');
        setAadhaarError('');
        lastCheckedAadhaarRef.current = '';
      }
      return;
    }

    if (name === 'mobile' || name === 'emergencyContact') {
      const numericVal = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericVal }));
      setValidationError('');
      return;
    }

    if (name === 'pincode') {
      const numericVal = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, [name]: numericVal }));
      setValidationError('');
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError('');
  };

  const formatInput = (str: string) => {
    return (str || '').trim().toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const renderAadhaarStatusIcon = () => {
    if (aadhaarStatus === 'checking') {
      return (
        <span className="flex items-center gap-1.5 text-saffron-600 text-xs font-semibold select-none">
          <Loader2 size={16} className="animate-spin" />
          <span className="hidden sm:inline">Checking...</span>
        </span>
      );
    }
    if (aadhaarStatus === 'verified') {
      return (
        <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold select-none">
          <CheckCircle2 size={16} />
          <span className="hidden sm:inline">Available</span>
        </span>
      );
    }
    if (aadhaarStatus === 'duplicate') {
      return (
        <span className="flex items-center gap-1 text-rose-600 text-xs font-semibold select-none">
          <AlertCircle size={16} />
          <span className="hidden sm:inline">Registered</span>
        </span>
      );
    }
    if (aadhaarStatus === 'error') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rawVal = (formData.aadhaar || '').replace(/\D/g, '').slice(0, 12);
            if (rawVal.length === 12) {
              lastCheckedAadhaarRef.current = '';
              checkAadhaar(rawVal);
            }
          }}
          className="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-xs font-semibold select-none hover:underline cursor-pointer"
          title="Retry Verification"
        >
          <RefreshCw size={14} />
          <span>Retry</span>
        </button>
      );
    }
    return null;
  };

  const handleStep1Next = async () => {
    setValidationError('');
    setAadhaarError('');

    if (isUnlinkedVolunteer) {
      setValidationError('Organization Linkage Fault: Cannot proceed without active affiliation.');
      return;
    }

    const cleanAadhaar = (formData.aadhaar || '').replace(/\D/g, '').slice(0, 12);
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      setValidationError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    const cleanMobile = (formData.mobile || '').replace(/\D/g, '').slice(0, 10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      setValidationError('Please enter a valid 10-digit Mobile number.');
      return;
    }

    if (aadhaarStatus === 'duplicate') {
      setValidationError('This Aadhaar number is already registered.');
      return;
    }

    setIsValidating(true);
    try {
      // If not yet verified for this exact 12-digit value, run verification
      let isVerified = aadhaarStatus === 'verified' && lastCheckedAadhaarRef.current === cleanAadhaar;
      if (!isVerified) {
        isVerified = await checkAadhaar(cleanAadhaar);
      }

      if (!isVerified) {
        if (aadhaarError) {
          setValidationError(aadhaarError);
        } else if (lastCheckedAadhaarRef.current === cleanAadhaar) {
          setValidationError('This Aadhaar number is already registered.');
        } else {
          setValidationError('Unable to verify identification with database. Click Retry.');
        }
        return;
      }

      setStep(2);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error("Validation error:", err);
      setValidationError(err.message || 'System error validating identification.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleStep2Next = () => {
    setValidationError('');
    if (!formData.name || !formData.surname || !formData.fatherName || !formData.dob || !formData.gender || !formData.maritalStatus || !formData.qualification || !formData.emergencyContact || !formData.pincode || !formData.address) {
      setValidationError('All fields including Gender, Marital Status, and Qualification are mandatory.');
      return;
    }
    
    if (!/^\d{10}$/.test(formData.emergencyContact)) {
      setValidationError('Emergency Contact must be exactly 10 digits.');
      return;
    }

    if (formData.mobile === formData.emergencyContact) {
      setValidationError('Conflict: Primary Mobile and Emergency Contact cannot be identical.');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      setValidationError('Pincode must be exactly 6 digits.');
      return;
    }

    setStep(3);
    window.scrollTo(0, 0);
  };

  const uploadFile = async (file: File) => {
    const fileName = `aadhaar_${uuidv4()}.jpg`;
    const { data, error } = await supabase.storage.from('member-images').upload(fileName, file);
    if (error) throw new Error(`Storage Error: ${error.message}`);
    return supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUnlinkedVolunteer || !user?.id) {
      addNotification("Registry Error: Organization Linkage Missing. Please contact Admin.", "error");
      return;
    }

    if (!formData.occupation || !formData.supportNeed) {
      setValidationError('Occupation and Support Need selections are mandatory.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const photoUrl = formData.aadhaarPhoto ? await uploadFile(formData.aadhaarPhoto) : '';

      const memberPayload = {
        aadhaar: (formData.aadhaar || '').trim(),
        mobile: (formData.mobile || '').trim(),
        name: formatInput(formData.name),
        surname: formatInput(formData.surname),
        father_name: formatInput(formData.fatherName),
        dob: formData.dob,
        gender: formData.gender,
        marital_status: formData.maritalStatus,
        qualification: formData.qualification,
        emergency_contact: (formData.emergencyContact || '').trim(),
        pincode: (formData.pincode || '').trim(),
        address: (formData.address || '').trim(),
        aadhaar_front_url: photoUrl,
        aadhaar_back_url: photoUrl, 
        occupation: formData.occupation,
        support_need: formData.supportNeed,
        volunteer_id: user?.id || '',
        organisation_id: user?.organisationId || null,
        submission_date: new Date().toISOString(),
        status: 'Pending'
      };

      const { error: dbError } = await supabase.from('members').insert(memberPayload);
      
      if (dbError) {
        if (dbError.code === '23505') {
          const msg = 'This Aadhaar number is already registered.';
          setAadhaarStatus('duplicate');
          setAadhaarError(msg);
          setValidationError(msg);
          throw new Error(msg);
        }
        if (dbError.code === '23503') {
          const msg = `Critical Linkage: Organization ID (${user?.organisationId}) is unlinked in master registry.`;
          setValidationError(msg);
          throw new Error(msg);
        }
        throw new Error(`Database Synchronization Error: ${dbError.message}`);
      }

      syncToSheets(SheetType.MEMBERS, {
        ...memberPayload,
        volunteer_name: user?.name || 'Field Volunteer',
        organisation_name: user?.organisationName || 'Community Node',
        submission_date: new Date().toLocaleDateString()
      }).catch(err => console.error("Sheet Sync Failed:", err));

      addNotification("Member record successfully synchronized to registry.", 'success');
      setFormData(initialFormData);
      setAadhaarStatus('idle');
      setAadhaarError('');
      setStep(1);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error("Submission Fault:", err);
      addNotification(err.message || "Registry synchronization error.", 'error');
      setValidationError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Member Enrollment" hideHeader={true}>
      {isSubmitting && (
        <CulturalLoader message="Verifying & finalizing member enrollment in SSK live registry..." overlay={true} compact={false} />
      )}
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-4 sm:pt-6">
        
        {/* Step Progress Indicators */}
        <div className="flex items-center justify-between max-w-xl mx-auto px-4 mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
              step >= 1 ? 'bg-gradient-to-r from-saffron-500 to-saffron-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
            }`}>
              1
            </div>
            <span className={`text-xs font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'} hidden sm:inline`}>
              Clearance
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 sm:mx-4 ${step >= 2 ? 'bg-saffron-500' : 'bg-slate-200'}`}></div>

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
              step >= 2 ? 'bg-gradient-to-r from-saffron-500 to-saffron-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
            }`}>
              2
            </div>
            <span className={`text-xs font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'} hidden sm:inline`}>
              Profile
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 sm:mx-4 ${step >= 3 ? 'bg-saffron-500' : 'bg-slate-200'}`}></div>

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
              step >= 3 ? 'bg-gradient-to-r from-saffron-500 to-saffron-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <span className={`text-xs font-semibold ${step >= 3 ? 'text-slate-900' : 'text-slate-400'} hidden sm:inline`}>
              Needs
            </span>
          </div>
        </div>

        {/* Diagnostic Link Banner */}
        {isUnlinkedVolunteer && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5 text-rose-800">
            <ShieldAlert size={20} className="shrink-0 mt-0.5 text-rose-600" />
            <div className="text-xs">
              <p className="font-bold">Affiliation Warning: Unlinked Organization</p>
              <p className="text-rose-600 mt-0.5 leading-relaxed">
                Your profile is not linked to an active organization node. Please contact the Master Admin to link your account before enrolling members.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: Clearance */}
        {step === 1 && (
          <Card 
            title="SSK Community Registry" 
            className="border-slate-200/90 shadow-card p-6 sm:p-8"
          >
            <div className="space-y-5">
              <div>
                <Input 
                  label="Identification Number (Aadhaar 12 Digits) *" 
                  name="aadhaar" 
                  value={formData.aadhaar} 
                  onChange={handleChange} 
                  onPaste={handleAadhaarPaste}
                  placeholder="Enter 12-digit Aadhaar" 
                  required 
                  icon={<CreditCard size={16} />}
                  rightElement={renderAadhaarStatusIcon()}
                  isError={aadhaarStatus === 'duplicate' || aadhaarStatus === 'error'}
                  isSuccess={aadhaarStatus === 'verified'}
                />
                {aadhaarStatus === 'verified' && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1.5">
                    <CheckCircle2 size={13} />
                    <span>Identification available for registration.</span>
                  </p>
                )}
                {aadhaarError && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                    <AlertCircle size={13} />
                    <span>{aadhaarError}</span>
                  </p>
                )}
              </div>

              <Input 
                label="Primary Mobile Number (10 Digits) *" 
                name="mobile" 
                type="tel" 
                value={formData.mobile} 
                onChange={handleChange} 
                maxLength={10} 
                placeholder="10-digit mobile number" 
                icon={<Phone size={16} />}
                required 
              />

              {validationError && !aadhaarError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-semibold leading-relaxed">{validationError}</p>
                </div>
              )}

              <div className="pt-4">
                <Button 
                  onClick={handleStep1Next} 
                  disabled={
                    isValidating || 
                    aadhaarStatus === 'checking' || 
                    aadhaarStatus === 'duplicate' || 
                    aadhaarStatus === 'error' || 
                    (formData.aadhaar.length === 12 && aadhaarStatus !== 'verified') ||
                    !formData.aadhaar || 
                    formData.aadhaar.length !== 12 || 
                    !formData.mobile || 
                    formData.mobile.length !== 10 || 
                    isUnlinkedVolunteer
                  } 
                  className="w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isValidating ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                  <span>{isValidating ? 'Checking Registry...' : 'Verify & Continue'}</span>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 2: Citizen Identity File */}
        {step === 2 && (
          <Card 
            title="Citizen Identity File" 
            subtitle="Record comprehensive demographics for community census and service mapping"
            className="border-slate-200/90 shadow-card p-6 sm:p-8"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="Full Name *" name="name" value={formData.name} onChange={handleChange} placeholder="First Name" required />
                <Input label="Gharano (Surname) *" name="surname" value={formData.surname} onChange={handleChange} placeholder="Gharano / Surname" required />
                <Input label="Spouse *" name="fatherName" value={formData.fatherName} onChange={handleChange} description="Maintained separately from primary identity" required />
                <Input label="Date of Birth *" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                
                <Select label="Biological Gender *" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">Select Gender</option>
                  {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                </Select>

                <Select label="Marital Status *" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                  <option value="">Select Marital Status</option>
                  {Object.values(MaritalStatus).map(m => <option key={m} value={m}>{m}</option>)}
                </Select>

                <Select label="Educational Qualification *" name="qualification" value={formData.qualification} onChange={handleChange}>
                  <option value="">Select Qualification</option>
                  {Object.values(Qualification).map(q => <option key={q} value={q}>{q}</option>)}
                </Select>

                <Input label="Emergency Contact (10 Digits) *" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} maxLength={10} placeholder="Alternate contact" required />
                <Input label="Area Pincode (6 Digits) *" name="pincode" value={formData.pincode} onChange={handleChange} maxLength={6} placeholder="Ex: 560001" required />
                
                <div className="md:col-span-2">
                  <Input label="Full Residential Address *" name="address" value={formData.address} onChange={handleChange} placeholder="Door No, Street, Locality, City" required />
                </div>
              </div>

              {validationError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-semibold leading-relaxed">{validationError}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={() => { setStep(1); window.scrollTo(0, 0); }} className="w-full sm:w-auto text-xs font-semibold gap-1.5">
                  <ArrowLeft size={14} /> Back
                </Button>
                <Button onClick={handleStep2Next} className="w-full sm:w-auto text-xs font-bold gap-1.5">
                  <span>Continue to Assessment</span> <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 3: Needs Assessment & Confirmation */}
        {step === 3 && (
          <Card 
            title="Needs &amp; Certification" 
            subtitle="Tag community support requirements and certify identity accuracy"
            className="border-slate-200/90 shadow-card p-6 sm:p-8"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Select label="What is their primary occupation? *" name="occupation" value={formData.occupation} onChange={handleChange}>
                  <option value="">Select Occupation</option>
                  {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                </Select>

                <Select label="What support do they need from Samaj? *" name="supportNeed" value={formData.supportNeed} onChange={handleChange}>
                  <option value="">Select Support Need</option>
                  {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>

              {/* Volunteer Attestation Card */}
              <div className="p-5 bg-gradient-to-br from-saffron-50/60 to-saffron-50/30 border border-saffron-100/80 rounded-2xl flex items-start gap-4">
                <div className="p-2.5 bg-white border border-saffron-100 rounded-xl text-saffron-600 shadow-sm shrink-0 mt-0.5">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Volunteer Attestation</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    I attest that I have verified the identity of this citizen. This record will be submitted to the SSK Samaj live registry ledger under node <span className="font-semibold text-saffron-900">{user?.organisationName || 'Community'}</span>.
                  </p>
                </div>
              </div>

              {validationError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 font-semibold leading-relaxed">{validationError}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="w-full sm:w-auto text-xs font-semibold gap-1.5">
                  <ArrowLeft size={14} /> Back to Profile
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto py-3 px-8 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <FileCheck size={16} />}
                  <span>{isSubmitting ? 'Synchronizing Record...' : 'Finalize Registration'}</span>
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NewMemberForm;
