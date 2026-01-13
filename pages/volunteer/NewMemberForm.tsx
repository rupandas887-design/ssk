import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { Gender, Occupation, SupportNeed, MaritalStatus, Qualification } from '../../types';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import { ShieldAlert, RefreshCw, Fingerprint, ShieldCheck, Search, XCircle, ImageIcon, Image as ImageIcon2, Info } from 'lucide-react';

const initialFormData = {
  aadhaar: '',
  mobile: '',
  name: '',
  surname: '',
  fatherName: '',
  dob: '',
  gender: Gender.Male,
  maritalStatus: MaritalStatus.Single,
  qualification: Qualification.Secondary,
  emergencyContact: '',
  pincode: '',
  address: '',
  aadhaarPhoto: null as File | null,
  occupation: Occupation.Job,
  supportNeed: SupportNeed.Education,
};

const NewMemberForm: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Diagnostic: Check if organization link is broken (ID exists but Name doesn't return from join)
  const isLinkBroken = user?.organisationId && !user?.organisationName;

  const formatInput = (text: string) => {
    return text.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if ((name === 'aadhaar' || name === 'mobile' || name === 'emergencyContact' || name === 'pincode') && value !== '' && !/^\d+$/.test(value)) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, aadhaarPhoto: file }));
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
    }
  };
  
  const handleRemoveImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFormData(prev => ({ ...prev, aadhaarPhoto: null }));
    setPreview(null);
  };

  const handleStep1Next = async () => {
    setValidationError('');
    
    // Safety check for organization linkage
    if (!user?.organisationId || isLinkBroken) {
      setValidationError(`Linkage Fault: Your account is linked to an ID (${user?.organisationId?.slice(0,8)}) that does not exist in the master registry or has been purged.`);
      return;
    }

    if (!formData.aadhaar || !formData.mobile) {
      setValidationError('Action Required: Identity Number and Primary Mobile are mandatory.');
      return;
    }
    if (!/^\d{12}$/.test(formData.aadhaar)) {
      setValidationError('UID must be exactly 12 numeric digits.');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
      setValidationError('Mobile must be exactly 10 numeric digits.');
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.from('members').select('id').eq('aadhaar', formData.aadhaar).maybeSingle();
      
      if (error) {
        setValidationError(`Uplink Error: ${error.message}`);
        return;
      }

      if (data) {
        setValidationError('Identification Conflict: This record already exists in the Global Registry.');
      } else {
        setStep(2);
        window.scrollTo(0, 0);
      }
    } catch (e: any) {
      setValidationError(`System Fault: ${e.message || 'Access Denied'}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleStep2Next = () => {
    setValidationError('');
    if (!formData.name || !formData.surname || !formData.fatherName || !formData.dob || !formData.gender || !formData.emergencyContact || !formData.pincode || !formData.address) {
      setValidationError('Action Required: All text fields are mandatory.');
      return;
    }
    
    if (!/^\d{10}$/.test(formData.emergencyContact)) {
      setValidationError('Emergency Contact must be 10 digits.');
      return;
    }

    if (formData.mobile === formData.emergencyContact) {
      setValidationError('Conflict: Mobile and Emergency Contact cannot be identical.');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      setValidationError('Pincode must be exactly 6 digits.');
      return;
    }

    if (!formData.aadhaarPhoto) {
      setValidationError('Identity Scan is mandatory.');
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
    
    if (!user?.organisationId || isLinkBroken || !user?.id) {
      addNotification("Registry Fault: Organization Linkage Missing or Invalid. Please contact Admin.", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const photoUrl = await uploadFile(formData.aadhaarPhoto!);

      const memberPayload = {
        aadhaar: formData.aadhaar,
        mobile: formData.mobile,
        name: formatInput(formData.name),
        surname: formatInput(formData.surname),
        father_name: formatInput(formData.fatherName),
        dob: formData.dob,
        gender: formData.gender,
        marital_status: formData.maritalStatus,
        qualification: formData.qualification,
        emergency_contact: formData.emergencyContact,
        pincode: formData.pincode,
        address: formData.address.trim(),
        aadhaar_front_url: photoUrl,
        aadhaar_back_url: photoUrl, 
        occupation: formData.occupation,
        support_need: formData.supportNeed,
        volunteer_id: user.id,
        organisation_id: user.organisationId,
        submission_date: new Date().toISOString(),
        status: 'Pending'
      };

      const { error: dbError } = await supabase.from('members').insert(memberPayload);
      
      if (dbError) {
        if (dbError.code === '23503') {
          const msg = `Critical Linkage Fault: Organization ID (${user.organisationId}) is invalid or has been purged from the master registry. Please contact support.`;
          setValidationError(msg);
          throw new Error(msg);
        }
        throw new Error(`Database Synchronization Error: ${dbError.message}`);
      }

      syncToSheets(SheetType.MEMBERS, {
        ...memberPayload,
        volunteer_name: user.name,
        organisation_name: user.organisationName,
        submission_date: new Date().toLocaleDateString()
      }).catch(err => console.error("Sheet Sync Failed:", err));

      addNotification("Identity record synchronized successfully.", 'success');
      setFormData(initialFormData);
      setPreview(null);
      setStep(1);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error("Submission Fault:", err);
      addNotification(err.message || "Registry Fault: Synchronization Interrupted.", 'error');
      setValidationError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Identity Enrollment Hub">
      <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-12 pb-20">
        <div className="bg-[#0a0c14] border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-orange-600/10 rounded-2xl text-orange-500 border border-orange-500/20 shadow-inner">
              <Fingerprint size={32} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Authenticated Operator</p>
              <h4 className="text-lg md:text-xl font-bold text-white uppercase font-cinzel">{user?.name}</h4>
            </div>
          </div>
          <div className="text-center sm:text-right px-6 py-3 bg-black/60 rounded-2xl border border-white/5 flex flex-col gap-1 items-center sm:items-end">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">Organization Node</p>
            <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isLinkBroken ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
              {user?.organisationName || 'LINKAGE FAULT'}
            </p>
            <div className="flex items-center gap-1.5 opacity-40">
              <Info size={10} className="text-gray-500" />
              <span className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter">ID: {user?.organisationId?.slice(0, 8) || 'NONE'}...</span>
            </div>
          </div>
        </div>

        {(isLinkBroken || !user?.organisationId) && (
          <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-3xl flex items-start gap-4 text-red-400">
            <ShieldAlert size={24} className="shrink-0 mt-1" />
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest">Critical System Error: Broken Registry Link</p>
              <p className="text-[10px] text-gray-400 leading-relaxed font-bold uppercase tracking-wider">
                The organization ID associated with your profile ({user?.organisationId}) does not exist in the master registry. <br />
                Enrollment is locked. Please contact the Master Admin to re-link your account.
              </p>
            </div>
          </div>
        )}

        <div className="relative pt-6 px-4">
          <div className="flex justify-between items-center mb-10 relative z-10">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex flex-col items-center gap-3">
                <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${step >= s ? 'bg-orange-600 border-orange-400' : 'bg-[#0a0c14] border-gray-800 opacity-40'}`}>
                  <span className="text-sm font-black text-white">{s}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute top-[2.75rem] left-0 w-full h-0.5 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-orange-600 transition-all duration-1000" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
          </div>
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {step === 1 && (
            <div className="max-w-xl mx-auto py-4">
              <Card className="relative bg-[#0a0c14] border-white/10 border p-0 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                <div className="p-8 md:p-12 space-y-10">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-cinzel text-white uppercase tracking-wider">Validation Step</h3>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-2">Registry Clearance</p>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <Input label="IDENTIFICATION (12 DIGITS) *" name="aadhaar" value={formData.aadhaar} onChange={handleChange} maxLength={12} placeholder="Aadhaar Number" required />
                    <Input label="MOBILE NUMBER *" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} maxLength={10} placeholder="Primary Mobile" required />
                    {validationError && (
                      <div className="p-5 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                        <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider leading-relaxed">{validationError}</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-6">
                    <Button onClick={handleStep1Next} disabled={isValidating || !user?.organisationId || isLinkBroken} className="w-full py-5 text-[11px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4">
                      {isValidating ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                      {isValidating ? 'VALIDATING...' : 'AUTHORIZE ACCESS'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {step === 2 && (
            <Card title="Citizen Identity File" className="bg-[#0a0c14] border-white/10 rounded-[2.5rem] p-8 md:p-14 shadow-2xl relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <Input label="GIVEN NAME *" name="name" value={formData.name} onChange={handleChange} placeholder="First Name" required />
                <Input label="SURNAME *" name="surname" value={formData.surname} onChange={handleChange} placeholder="Last Name" required />
                <Input label="FATHER / GUARDIAN NAME *" name="fatherName" value={formData.fatherName} onChange={handleChange} description="Maintained separately from primary identity name." required />
                <Input label="DATE OF BIRTH *" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                <Select label="BIOLOGICAL GENDER *" name="gender" value={formData.gender} onChange={handleChange}>
                  {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                </Select>
                <Select label="MARITAL STATUS *" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                  {Object.values(MaritalStatus).map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Select label="QUALIFICATION *" name="qualification" value={formData.qualification} onChange={handleChange}>
                  {Object.values(Qualification).map(q => <option key={q} value={q}>{q}</option>)}
                </Select>
                <Input label="EMERGENCY CONTACT *" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} maxLength={10} required />
                <Input label="PINCODE *" name="pincode" value={formData.pincode} onChange={handleChange} maxLength={6} required />
                <div className="md:col-span-2">
                  <Input label="FULL ADDRESS *" name="address" value={formData.address} onChange={handleChange} placeholder="Residential address" required />
                </div>
              </div>

              <div className="pt-10 border-t border-white/5">
                <div className="flex items-center gap-3 mb-8">
                  <ImageIcon2 className="text-orange-500" size={20} />
                  <h3 className="font-cinzel text-xl text-white uppercase tracking-widest">Aadhaar Card Upload</h3>
                </div>
                
                <div className="max-w-lg mx-auto">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">AADHAAR PHOTO (SINGLE SIDE) *</label>
                    <div className="relative border-2 border-gray-800 border-dashed rounded-[2.5rem] bg-black/60 aspect-video flex flex-col items-center justify-center overflow-hidden group/upload hover:border-orange-500/50 transition-all duration-500">
                      {preview ? (
                        <>
                          <img src={preview} className="w-full h-full object-cover" />
                          <button onClick={handleRemoveImage} className="absolute top-6 right-6 p-3 bg-red-600 text-white rounded-2xl shadow-xl hover:bg-red-700 transition-all scale-90 hover:scale-100"><XCircle size={24} /></button>
                        </>
                      ) : (
                        <button onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-4 text-gray-700 group-hover/upload:text-orange-500/70 transition-colors">
                          <ImageIcon size={64} strokeWidth={1} />
                          <span className="text-[11px] font-black uppercase tracking-[0.4em]">UPLOAD CARD PHOTO</span>
                        </button>
                      )}
                      <input ref={inputRef} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                    </div>
                  </div>
                </div>
              </div>
              
              {validationError && (
                <div className="mt-12 flex items-center gap-4 p-5 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-start">
                  <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 font-bold uppercase tracking-widest leading-relaxed">{validationError}</p>
                </div>
              )}

              <div className="mt-16 flex flex-col sm:flex-row justify-between gap-6">
                <Button variant="secondary" onClick={() => { setStep(1); window.scrollTo(0, 0); }} className="w-full sm:w-auto py-4 px-10">Back</Button>
                <Button onClick={handleStep2Next} className="w-full sm:w-auto py-4 px-12">Review Registry</Button>
              </div>
            </Card>
          )}
          
          {step === 3 && (
            <Card title="Review Node" className="bg-[#0a0c14] border-white/10 rounded-[2.5rem] p-8 md:p-14 shadow-2xl">
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Select label="What do you do? *" name="occupation" value={formData.occupation} onChange={handleChange}>
                    {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                  <Select label="What do you want? *" name="supportNeed" value={formData.supportNeed} onChange={handleChange}>
                    {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div className="p-8 bg-orange-600/5 border border-orange-500/10 rounded-[2rem] flex flex-col md:flex-row items-start gap-8">
                  <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 shrink-0">
                    <ShieldCheck size={36} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-base font-bold text-white uppercase tracking-tight">Identity Certification</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed uppercase tracking-[0.2em] font-bold">
                      I certify that I have physically verified the Given Name and Surname of this citizen against legal documentation. Single-side Aadhaar verification is sufficient for this drive.
                    </p>
                  </div>
                </div>
              </div>
              {validationError && (
                <div className="mt-10 flex items-center gap-4 p-5 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-start">
                  <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 font-bold uppercase tracking-widest leading-relaxed">{validationError}</p>
                </div>
              )}
              <div className="mt-16 flex flex-col sm:flex-row justify-between gap-6">
                <Button variant="secondary" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="w-full sm:w-auto py-4 px-10">Modify Profile</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto py-5 px-16 text-[12px] font-black uppercase tracking-[0.4em]">
                  {isSubmitting ? 'SYNCHRONIZING...' : 'FINALIZE REGISTRATION'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewMemberForm;