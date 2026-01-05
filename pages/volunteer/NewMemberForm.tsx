
import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { Gender, Occupation, SupportNeed } from '../../types';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import { ShieldAlert, RefreshCw, User as UserIcon, CheckCircle2, FileText, Fingerprint, UploadCloud, ShieldCheck, Search, Info, XCircle, Layout, ImageIcon } from 'lucide-react';

const initialFormData = {
  aadhaar: '',
  mobile: '',
  name: '',
  surname: '',
  fatherName: '',
  dob: '',
  gender: Gender.Male,
  emergencyContact: '',
  pincode: '',
  address: '',
  aadhaarFront: null as File | null,
  aadhaarBack: null as File | null,
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
  
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const getErrorMessage = (err: any): string => {
      if (!err) return "Unknown System Error";
      if (typeof err === 'string') return err;
      const commonProps = ['message', 'error_description', 'details', 'hint', 'msg', 'error'];
      for (const prop of commonProps) {
          if (err[prop] && typeof err[prop] === 'string') return err[prop];
      }
      return "Database security policy failure";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if ((name === 'aadhaar' || name === 'mobile' || name === 'emergencyContact' || name === 'pincode') && value !== '' && !/^\d+$/.test(value)) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (side === 'front') {
            setFormData(prev => ({ ...prev, aadhaarFront: file }));
            if(frontPreview) URL.revokeObjectURL(frontPreview);
            setFrontPreview(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, aadhaarBack: file }));
            if(backPreview) URL.revokeObjectURL(backPreview);
            setBackPreview(URL.createObjectURL(file));
        }
    }
  };
  
  const handleRemoveImage = (side: 'front' | 'back') => {
    if (side === 'front') {
        if (frontPreview) URL.revokeObjectURL(frontPreview);
        setFormData(prev => ({ ...prev, aadhaarFront: null }));
        setFrontPreview(null);
        if(frontInputRef.current) frontInputRef.current.value = '';
    } else {
        if (backPreview) URL.revokeObjectURL(backPreview);
        setFormData(prev => ({ ...prev, aadhaarBack: null }));
        setBackPreview(null);
        if(backInputRef.current) backInputRef.current.value = '';
    }
  };

  const handleStep1Next = async () => {
    setValidationError('');
    if (!formData.aadhaar || !formData.mobile) {
        setValidationError('Action Required: Aadhaar ID and Mobile Number are both mandatory.');
        return;
    }
    if (!/^\d{12}$/.test(formData.aadhaar)) {
      setValidationError('Validation Error: Aadhaar ID must be exactly 12 numeric digits.');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
        setValidationError('Validation Error: Primary Mobile Number must be exactly 10 numeric digits.');
        return;
    }

    setIsValidating(true);
    try {
        const { data, error } = await supabase.from('members').select('id').eq('aadhaar', formData.aadhaar).maybeSingle();
        if (error) throw error;
        if (data) {
            setValidationError('Identification Conflict: This Aadhaar ID is already registered in the registry.');
        } else {
            setStep(2);
            window.scrollTo(0, 0);
        }
    } catch (e: any) {
        setValidationError(`Registry Fault: ${getErrorMessage(e)}`);
    } finally {
        setIsValidating(false);
    }
  };

  const handleStep2Next = () => {
      setValidationError('');
      if (!formData.name || !formData.surname || !formData.fatherName || !formData.dob || !formData.gender || !formData.emergencyContact || !formData.pincode || !formData.address) {
          setValidationError('Action Required: All profile fields are mandatory.');
          return;
      }
      
      if (!/^\d{10}$/.test(formData.emergencyContact)) {
          setValidationError('Validation Error: Emergency contact must be 10 digits.');
          return;
      }

      if (formData.mobile === formData.emergencyContact) {
          setValidationError('Security Conflict: Primary and Emergency contact numbers cannot be identical.');
          return;
      }

      if (!/^\d{6}$/.test(formData.pincode)) {
          setValidationError('Validation Error: Pincode must be 6 numeric digits.');
          return;
      }

      if (!formData.aadhaarFront || !formData.aadhaarBack) {
          setValidationError('Critical Requirement: Both Front and Back Aadhaar Card scans are mandatory.');
          return;
      }

      setStep(3);
      window.scrollTo(0, 0);
  };

  const uploadFile = async (file: File, prefix: string) => {
      const fileName = `${prefix}_${uuidv4()}.jpg`;
      const { data, error } = await supabase.storage.from('member-images').upload(fileName, file);
      if (error) throw error;
      return supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user?.organisationId) return;
      
      if (!formData.occupation || !formData.supportNeed) {
          setValidationError('Action Required: Occupation and Support Need categories are mandatory.');
          return;
      }

      setIsSubmitting(true);
      try {
          const [frontUrl, backUrl] = await Promise.all([
              uploadFile(formData.aadhaarFront!, 'front'),
              uploadFile(formData.aadhaarBack!, 'back')
          ]);

          const memberPayload = {
              aadhaar: formData.aadhaar,
              mobile: formData.mobile,
              name: formData.name,
              surname: formData.surname,
              father_name: formData.fatherName,
              dob: formData.dob,
              gender: formData.gender,
              emergency_contact: formData.emergencyContact,
              pincode: formData.pincode,
              address: formData.address,
              aadhaar_front_url: frontUrl,
              aadhaar_back_url: backUrl,
              occupation: formData.occupation,
              support_need: formData.supportNeed,
              volunteer_id: user.id,
              organisation_id: user.organisationId,
              status: 'Pending'
          };

          const { error } = await supabase.from('members').insert(memberPayload);
          if (error) throw error;

          await syncToSheets(SheetType.MEMBERS, {
            ...memberPayload,
            volunteer_name: user.name,
            organisation_name: user.organisationName,
            submission_date: new Date().toLocaleDateString()
          });

          addNotification("Success: Member identity synchronized.", 'success');
          setFormData(initialFormData);
          setFrontPreview(null);
          setBackPreview(null);
          setStep(1);
          window.scrollTo(0, 0);
      } catch (err: any) {
          addNotification(`Registry Fault: ${getErrorMessage(err)}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <DashboardLayout title="Identity Enrollment Terminal">
      <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20">
          
          <div className="bg-orange-600/5 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-600/10 rounded-xl text-orange-500">
                      <Fingerprint size={24} />
                  </div>
                  <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 leading-none mb-1">Operator Profile</p>
                      <h4 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">{user?.name}</h4>
                  </div>
              </div>
              <div className="text-center sm:text-right bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Sector Unit</p>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{user?.organisationName}</p>
              </div>
          </div>

          <div className="relative pt-4 px-2">
              <div className="flex justify-between items-center mb-6 relative z-10">
                  {[1, 2, 3].map(s => (
                      <div key={s} className="flex flex-col items-center gap-2">
                          <div className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-500 ${step >= s ? 'bg-orange-600 border-orange-400 shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'bg-gray-950 border-gray-800 opacity-40'}`}>
                              <span className="text-xs font-black text-white">{s}</span>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="absolute top-[2.2rem] left-0 w-full h-0.5 bg-gray-900 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 transition-all duration-700" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
              </div>
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {step === 1 && (
                <div className="max-w-xl mx-auto py-4">
                    <div className="relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl blur-[2px] opacity-10"></div>
                        <Card className="relative bg-black border-white/10 border p-0 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-6 md:p-8 space-y-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-cinzel text-white uppercase tracking-wider">Registry Validation</h3>
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Tier 1 Verification</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <Input label="AADHAAR ID (12 DIGITS) *" name="aadhaar" value={formData.aadhaar} onChange={handleChange} maxLength={12} placeholder="12-digit Aadhaar" required />
                                    <Input label="MOBILE NUMBER (10 DIGITS) *" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} maxLength={10} placeholder="10-digit mobile" required />
                                    {validationError && (
                                        <div className="flex items-start gap-3 p-4 bg-red-600/10 border border-red-500/20 rounded-xl animate-in shake duration-300">
                                            <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-red-400 font-bold uppercase tracking-wider leading-relaxed">{validationError}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4">
                                    <Button onClick={handleStep1Next} disabled={isValidating} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 transition-all rounded-xl">
                                        {isValidating ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                                        {isValidating ? 'VALIDATING...' : 'Authorize Enrollment'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
            
            {step === 2 && (
                <Card title="Member Profile Enrollment" className="bg-[#050505] border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Input label="GIVEN NAME *" name="name" value={formData.name} onChange={handleChange} placeholder="First and Middle" required />
                        <Input label="SURNAME *" name="surname" value={formData.surname} onChange={handleChange} placeholder="Family Name" required />
                        <Input label="FATHER / GUARDIAN NAME *" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
                        <Input label="DATE OF BIRTH *" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                        <Select label="BIOLOGICAL GENDER *" name="gender" value={formData.gender} onChange={handleChange}>
                            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                        <Input label="EMERGENCY CONTACT *" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} maxLength={10} required />
                        <Input label="POSTAL PINCODE *" name="pincode" value={formData.pincode} onChange={handleChange} maxLength={6} required />
                        <div className="md:col-span-2">
                            <Input label="FULL RESIDENTIAL ADDRESS *" name="address" value={formData.address} onChange={handleChange} required />
                        </div>
                        
                        {/* Aadhaar Multi-Slot Upload */}
                        <div className="md:col-span-2 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white">AADHAAR FRONT SIDE *</label>
                                <div className="relative group border-2 border-gray-900 border-dashed rounded-2xl bg-black/60 aspect-video flex flex-col items-center justify-center overflow-hidden transition-all hover:border-orange-500/20">
                                    {frontPreview ? (
                                        <>
                                            <img src={frontPreview} className="w-full h-full object-cover" />
                                            <button onClick={() => handleRemoveImage('front')} className="absolute top-2 right-2 p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600"><XCircle size={16} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => frontInputRef.current?.click()} className="flex flex-col items-center gap-4 text-gray-700 group-hover:text-orange-500 transition-colors">
                                            <ImageIcon size={32} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Select Front View</span>
                                        </button>
                                    )}
                                    <input ref={frontInputRef} type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'front')} accept="image/*" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white">AADHAAR BACK SIDE *</label>
                                <div className="relative group border-2 border-gray-900 border-dashed rounded-2xl bg-black/60 aspect-video flex flex-col items-center justify-center overflow-hidden transition-all hover:border-orange-500/20">
                                    {backPreview ? (
                                        <>
                                            <img src={backPreview} className="w-full h-full object-cover" />
                                            <button onClick={() => handleRemoveImage('back')} className="absolute top-2 right-2 p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600"><XCircle size={16} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => backInputRef.current?.click()} className="flex flex-col items-center gap-4 text-gray-700 group-hover:text-orange-500 transition-colors">
                                            <ImageIcon size={32} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Select Back View</span>
                                        </button>
                                    )}
                                    <input ref={backInputRef} type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'back')} accept="image/*" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {validationError && (
                        <div className="mt-8 flex items-center gap-3 p-4 bg-red-600/10 border border-red-500/20 rounded-xl">
                            <ShieldAlert size={20} className="text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-400 font-bold uppercase tracking-widest">{validationError}</p>
                        </div>
                    )}

                    <div className="mt-12 flex flex-col sm:flex-row justify-between gap-4">
                        <Button variant="secondary" onClick={() => { setStep(1); window.scrollTo(0, 0); }} className="w-full sm:w-auto py-3 px-8 text-[10px] uppercase font-black">Back</Button>
                        <Button onClick={handleStep2Next} className="w-full sm:w-auto py-3 px-10 text-[10px] uppercase font-black">Continue</Button>
                    </div>
                </Card>
            )}
            
            {step === 3 && (
                <Card title="Review Enrollment" className="bg-[#050505] border-white/10 rounded-2xl p-6 md:p-10">
                    <div className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Select label="PRIMARY OCCUPATION *" name="occupation" value={formData.occupation} onChange={handleChange}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="SUPPORT NEED *" name="supportNeed" value={formData.supportNeed} onChange={handleChange}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                        <div className="p-6 bg-orange-600/5 border border-orange-500/10 rounded-2xl flex flex-col md:flex-row items-start gap-6">
                            <ShieldCheck size={28} className="text-orange-500 shrink-0" />
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Operator Certification</h4>
                                <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider font-bold">
                                    I, {user?.name}, certify that the biometric ID (Aadhaar: {formData.aadhaar}) has been physically verified.
                                </p>
                            </div>
                        </div>
                    </div>
                    {validationError && (
                        <div className="mt-8 flex items-center gap-3 p-4 bg-red-600/10 border border-red-500/20 rounded-xl">
                            <ShieldAlert size={20} className="text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-400 font-bold uppercase tracking-widest">{validationError}</p>
                        </div>
                    )}
                    <div className="mt-12 flex flex-col sm:flex-row justify-between gap-4">
                        <Button variant="secondary" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="w-full sm:w-auto py-3 px-8 text-[10px] uppercase font-black">Edit Details</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto py-4 px-12 text-[10px] font-black uppercase tracking-[0.3em] bg-orange-600 hover:bg-orange-500 rounded-xl shadow-xl">
                            {isSubmitting ? 'Syncing...' : 'Finalize Enrollment'}
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
