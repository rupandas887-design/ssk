
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
        setValidationError('Action Required: Identity Number and Primary Mobile are both mandatory.');
        return;
    }
    if (!/^\d{12}$/.test(formData.aadhaar)) {
      setValidationError('Validation Error: Identification Number must be exactly 12 numeric digits.');
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
            setValidationError('Identification Conflict: This identity record already exists in the registry.');
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
          setValidationError('Action Required: All profile identity fields are mandatory.');
          return;
      }
      
      if (!/^\d{10}$/.test(formData.emergencyContact)) {
          setValidationError('Validation Error: Emergency Connection must be 10 digits.');
          return;
      }

      if (formData.mobile === formData.emergencyContact) {
          setValidationError('Security Conflict: Primary Mobile and Emergency Connection cannot be identical.');
          return;
      }

      if (!/^\d{6}$/.test(formData.pincode)) {
          setValidationError('Validation Error: Postal Pincode must be exactly 6 digits.');
          return;
      }

      if (!formData.aadhaarFront || !formData.aadhaarBack) {
          setValidationError('Critical Requirement: Both Front and Back Identity Scans are mandatory.');
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
          setValidationError('Action Required: Vocational and Support Requirement fields are mandatory.');
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

          addNotification("Success: Identity record synchronized.", 'success');
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
    <DashboardLayout title="Identity Enrollment Hub">
      <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-12 pb-20">
          
          <div className="bg-[#0a0c14] border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-6">
                  <div className="p-4 bg-orange-600/10 rounded-2xl text-orange-500 border border-orange-500/20 shadow-inner">
                      <Fingerprint size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 leading-none mb-2">Authenticated Operator</p>
                      <h4 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight font-cinzel">{user?.name}</h4>
                  </div>
              </div>
              <div className="text-center sm:text-right px-6 py-3 bg-black/60 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">Assigned Organization</p>
                  <p className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em]">{user?.organisationName}</p>
              </div>
          </div>

          <div className="relative pt-6 px-4">
              <div className="flex justify-between items-center mb-10 relative z-10">
                  {[1, 2, 3].map(s => (
                      <div key={s} className="flex flex-col items-center gap-3">
                          <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${step >= s ? 'bg-orange-600 border-orange-400 shadow-[0_0_30px_rgba(234,88,12,0.4)]' : 'bg-[#0a0c14] border-gray-800 opacity-40'}`}>
                              <span className="text-sm font-black text-white">{s}</span>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${step >= s ? 'text-orange-500' : 'text-gray-700'}`}>
                            {s === 1 ? 'Validation' : s === 2 ? 'Profile' : 'Review'}
                          </span>
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
                                    <h3 className="text-xl font-cinzel text-white uppercase tracking-wider">Tier 1 Verification</h3>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-2">Registry Clearance</p>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <Input label="IDENTIFICATION NUMBER (12 DIGITS) *" name="aadhaar" value={formData.aadhaar} onChange={handleChange} maxLength={12} placeholder="Enter 12-digit UID" required />
                                <Input label="PRIMARY CONTACT MOBILE *" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} maxLength={10} placeholder="Enter 10-digit number" required />
                                {validationError && (
                                    <div className="flex items-start gap-4 p-5 bg-red-600/10 border border-red-500/20 rounded-2xl animate-in shake duration-500">
                                        <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider leading-relaxed">{validationError}</p>
                                    </div>
                                )}
                            </div>
                            <div className="pt-6">
                                <Button onClick={handleStep1Next} disabled={isValidating} className="w-full py-5 text-[11px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 bg-orange-600 hover:bg-orange-500 transition-all rounded-2xl shadow-xl shadow-orange-950/20">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <Input label="LEGAL FIRST NAME *" name="name" value={formData.name} onChange={handleChange} placeholder="First and Middle" required />
                        <Input label="LEGAL SURNAME *" name="surname" value={formData.surname} onChange={handleChange} placeholder="Family Name" required />
                        <Input label="FATHER / GUARDIAN NAME *" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
                        <Input label="DATE OF BIRTH *" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                        <Select label="BIOLOGICAL GENDER *" name="gender" value={formData.gender} onChange={handleChange}>
                            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                        <Input label="EMERGENCY CONNECTION *" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} maxLength={10} required />
                        <Input label="POSTAL PINCODE *" name="pincode" value={formData.pincode} onChange={handleChange} maxLength={6} required />
                        <div className="md:col-span-2">
                            <Input label="RESIDENTIAL REGISTRY ADDRESS *" name="address" value={formData.address} onChange={handleChange} placeholder="Complete physical node address" required />
                        </div>
                        
                        <div className="md:col-span-2 pt-10 grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-white/5">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">IDENTITY SCAN: FRONT SIDE *</label>
                                <div className="relative group border-2 border-gray-800 border-dashed rounded-[2rem] bg-black/60 aspect-video flex flex-col items-center justify-center overflow-hidden transition-all hover:border-orange-500/30">
                                    {frontPreview ? (
                                        <>
                                            <img src={frontPreview} className="w-full h-full object-cover" />
                                            <button onClick={() => handleRemoveImage('front')} className="absolute top-4 right-4 p-2 bg-red-600/90 text-white rounded-xl hover:bg-red-600 transition-colors shadow-2xl"><XCircle size={20} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => frontInputRef.current?.click()} className="flex flex-col items-center gap-4 text-gray-700 group-hover:text-orange-500 transition-all duration-500">
                                            <ImageIcon size={48} strokeWidth={1} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">SELECT FRONT SCAN</span>
                                        </button>
                                    )}
                                    <input ref={frontInputRef} type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'front')} accept="image/*" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">IDENTITY SCAN: BACK SIDE *</label>
                                <div className="relative group border-2 border-gray-800 border-dashed rounded-[2rem] bg-black/60 aspect-video flex flex-col items-center justify-center overflow-hidden transition-all hover:border-orange-500/30">
                                    {backPreview ? (
                                        <>
                                            <img src={backPreview} className="w-full h-full object-cover" />
                                            <button onClick={() => handleRemoveImage('back')} className="absolute top-4 right-4 p-2 bg-red-600/90 text-white rounded-xl hover:bg-red-600 transition-colors shadow-2xl"><XCircle size={20} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => backInputRef.current?.click()} className="flex flex-col items-center gap-4 text-gray-700 group-hover:text-orange-500 transition-all duration-500">
                                            <ImageIcon size={48} strokeWidth={1} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">SELECT BACK SCAN</span>
                                        </button>
                                    )}
                                    <input ref={backInputRef} type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'back')} accept="image/*" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {validationError && (
                        <div className="mt-10 flex items-center gap-4 p-5 bg-red-600/10 border border-red-500/20 rounded-2xl">
                            <ShieldAlert size={24} className="text-red-500 shrink-0" />
                            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">{validationError}</p>
                        </div>
                    )}

                    <div className="mt-16 flex flex-col sm:flex-row justify-between gap-6">
                        <Button variant="secondary" onClick={() => { setStep(1); window.scrollTo(0, 0); }} className="w-full sm:w-auto py-4 px-10 text-[11px] uppercase font-black tracking-[0.2em] border-white/10">Back to Validation</Button>
                        <Button onClick={handleStep2Next} className="w-full sm:w-auto py-4 px-12 text-[11px] uppercase font-black tracking-[0.3em] shadow-lg shadow-orange-950/20">Proceed to Final Review</Button>
                    </div>
                </Card>
            )}
            
            {step === 3 && (
                <Card title="Operational Confirmation" className="bg-[#0a0c14] border-white/10 rounded-[2.5rem] p-8 md:p-14 shadow-2xl">
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <Select label="PRIMARY VOCATION *" name="occupation" value={formData.occupation} onChange={handleChange}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="SUPPORT REQUIREMENT *" name="supportNeed" value={formData.supportNeed} onChange={handleChange}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                        <div className="p-8 bg-orange-600/5 border border-orange-500/10 rounded-[2rem] flex flex-col md:flex-row items-start gap-8">
                            <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 shrink-0">
                                <ShieldCheck size={36} strokeWidth={1.5} />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-base font-bold text-white uppercase tracking-tight">Operator Certification</h4>
                                <p className="text-[11px] text-gray-500 leading-relaxed uppercase tracking-[0.2em] font-bold">
                                    I, {user?.name}, certify that the provided identification UID (ID: {formData.aadhaar}) has been physically verified against original documentation and is authentic for entry into the global SSK registry.
                                </p>
                            </div>
                        </div>
                    </div>
                    {validationError && (
                        <div className="mt-10 flex items-center gap-4 p-5 bg-red-600/10 border border-red-500/20 rounded-2xl">
                            <ShieldAlert size={24} className="text-red-500 shrink-0" />
                            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">{validationError}</p>
                        </div>
                    )}
                    <div className="mt-16 flex flex-col sm:flex-row justify-between gap-6">
                        <Button variant="secondary" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="w-full sm:w-auto py-4 px-10 text-[11px] uppercase font-black tracking-[0.2em] border-white/10">Modify Profile</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto py-5 px-16 text-[12px] font-black uppercase tracking-[0.4em] bg-orange-600 hover:bg-orange-500 rounded-2xl shadow-2xl shadow-orange-950/40">
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
