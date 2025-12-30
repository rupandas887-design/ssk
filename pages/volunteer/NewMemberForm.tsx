
import React, { useState, useRef, useEffect } from 'react';
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
import { Camera, ShieldAlert, RefreshCw, User as UserIcon, CheckCircle2, FileText, Fingerprint, UploadCloud, ShieldCheck, Search, Info } from 'lucide-react';

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
  memberImage: null as File | null,
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
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getErrorMessage = (err: any): string => {
      if (!err) return "Unknown System Error";
      if (typeof err === 'string') return err;
      const commonProps = ['message', 'error_description', 'details', 'hint', 'msg', 'error'];
      for (const prop of commonProps) {
          if (err[prop] && typeof err[prop] === 'string') return err[prop];
      }
      return "Database security policy failure";
  };

  useEffect(() => {
    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if ((name === 'aadhaar' || name === 'mobile' || name === 'emergencyContact' || name === 'pincode') && value !== '' && !/^\d+$/.test(value)) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setFormData(prev => ({ ...prev, memberImage: file }));
        if(imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setFormData(prev => ({ ...prev, memberImage: null }));
    setImagePreview(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const openCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
    } catch (err) {
        addNotification("Camera access denied.", 'error');
    }
  };

  const closeCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "aadhaar_capture.jpg", { type: "image/jpeg" });
                    setFormData(prev => ({ ...prev, memberImage: file }));
                    if(imagePreview) URL.revokeObjectURL(imagePreview);
                    setImagePreview(URL.createObjectURL(file));
                    closeCamera();
                }
            }, 'image/jpeg');
        }
    }
  };

  const handleStep1Next = async () => {
    setValidationError('');
    if (!formData.aadhaar || !formData.mobile) {
        setValidationError('Aadhaar and Mobile Number are both mandatory.');
        return;
    }
    if (!/^\d{12}$/.test(formData.aadhaar)) {
      setValidationError('Aadhaar ID must be exactly 12 numeric digits.');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
        setValidationError('Mobile Number must be exactly 10 numeric digits.');
        return;
    }

    setIsValidating(true);
    try {
        const { data, error } = await supabase.from('members').select('id').eq('aadhaar', formData.aadhaar).maybeSingle();
        if (error) throw error;
        if (data) {
            setValidationError('Identification Conflict: This Aadhaar ID is already registered.');
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
      if (!formData.name || !formData.surname || !formData.fatherName || !formData.dob || !formData.emergencyContact || !formData.pincode || !formData.address) {
          setValidationError('Action Required: All profile fields must be completed.');
          return;
      }
      if (!/^\d{10}$/.test(formData.emergencyContact)) {
          setValidationError('Validation Error: Emergency contact must be a valid 10-digit number.');
          return;
      }
      if (!/^\d{6}$/.test(formData.pincode)) {
          setValidationError('Validation Error: Pincode must be exactly 6 numeric digits.');
          return;
      }
      if (!formData.memberImage) {
          setValidationError('Critical Requirement: Aadhaar Card document scan is missing.');
          return;
      }
      setStep(3);
      window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user?.organisationId) return;

      setIsSubmitting(true);
      try {
          let imageUrl = '';
          if (formData.memberImage) {
              const fileName = `aadhaar_${uuidv4()}.jpg`;
              const { data: uploadData, error: uploadError } = await supabase.storage.from('member-images').upload(fileName, formData.memberImage);
              if(uploadError) throw uploadError;
              imageUrl = supabase.storage.from('member-images').getPublicUrl(uploadData.path).data.publicUrl;
          }

          const { error } = await supabase.from('members').insert({
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
              member_image_url: imageUrl,
              occupation: formData.occupation,
              support_need: formData.supportNeed,
              volunteer_id: user.id,
              organisation_id: user.organisationId,
              status: 'Pending'
          });

          if (error) throw error;
          addNotification("Success: Member identity synchronized with global registry.", 'success');
          setFormData(initialFormData);
          setImagePreview(null);
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
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-24">
          
          {/* Operator Context Banner */}
          <div className="bg-orange-600/10 border border-orange-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_50px_rgba(234,88,12,0.05)]">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-orange-600/20 rounded-2xl text-orange-500 shadow-inner">
                      <Fingerprint size={28} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60 leading-none mb-2">Active Field Agent</p>
                      <h4 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight font-cinzel">{user?.name}</h4>
                  </div>
              </div>
              <div className="text-center sm:text-right bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Sector Authority</p>
                  <p className="text-xs font-black text-orange-500 uppercase tracking-wider">{user?.organisationName}</p>
              </div>
          </div>

          {/* High-Visibility Progress Bar */}
          <div className="relative pt-6 px-4">
              <div className="flex justify-between items-center mb-8 relative z-10">
                  {[1, 2, 3].map(s => (
                      <div key={s} className="flex flex-col items-center gap-3">
                          <div className={`h-12 w-12 md:h-16 md:w-16 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${step >= s ? 'bg-orange-600 border-orange-400 shadow-[0_0_30px_rgba(234,88,12,0.4)] scale-110' : 'bg-gray-900 border-gray-800 scale-90 opacity-40'}`}>
                              <span className="text-sm md:text-xl font-black text-white">{s}</span>
                          </div>
                          <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] ${step >= s ? 'text-orange-500' : 'text-gray-500'}`}>
                             {s === 1 ? 'Validation' : s === 2 ? 'Profile' : 'Review'}
                          </span>
                      </div>
                  ))}
              </div>
              <div className="absolute top-[2.4rem] md:top-[3.4rem] left-0 w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 transition-all duration-1000 ease-in-out" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
              </div>
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {step === 1 && (
                <div className="max-w-2xl mx-auto py-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-400 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        
                        <Card className="relative bg-black border-orange-500/40 border-2 shadow-[0_30px_60px_-15px_rgba(234,88,12,0.3)] rounded-[3rem] overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <ShieldCheck size={180} />
                            </div>
                            
                            <div className="p-4 md:p-10">
                                <div className="flex items-center gap-5 mb-12">
                                    <div className="p-5 bg-orange-500/20 rounded-3xl text-orange-500 shadow-xl">
                                        <Search size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-cinzel text-white leading-tight">Registry Validation</h3>
                                        <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-[0.4em] mt-2">Identification Verification Protocol</p>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <Input 
                                        label="AADHAAR ID (12 DIGITS) *" 
                                        name="aadhaar" 
                                        value={formData.aadhaar} 
                                        onChange={handleChange} 
                                        maxLength={12} 
                                        placeholder="Enter 12-digit Aadhaar ID"
                                        description="Unique Biometric Identifier Found on the Member's Aadhaar Card"
                                        className="text-xl md:text-3xl font-mono tracking-[0.5em] py-6" 
                                        required
                                    />

                                    <Input 
                                        label="MOBILE NUMBER (10 DIGITS) *" 
                                        name="mobile" 
                                        type="tel" 
                                        value={formData.mobile} 
                                        onChange={handleChange} 
                                        maxLength={10} 
                                        placeholder="Enter 10-digit mobile number"
                                        description="Primary Communication Node for OTP and Status Alerts"
                                        className="text-xl md:text-2xl font-mono tracking-[0.25em] py-6"
                                        required
                                    />

                                    {validationError && (
                                        <div className="flex items-center gap-4 p-6 bg-red-600/10 border-2 border-red-500/30 rounded-3xl animate-in shake duration-300">
                                            <ShieldAlert size={32} className="text-red-500 shrink-0" />
                                            <p className="text-xs md:text-sm text-red-400 font-black uppercase tracking-widest leading-relaxed">
                                                {validationError}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-16">
                                    <Button 
                                        onClick={handleStep1Next} 
                                        disabled={isValidating} 
                                        className="w-full py-8 text-sm md:text-base font-black uppercase tracking-[0.5em] flex items-center justify-center gap-4 shadow-[0_25px_50px_-10px_rgba(234,88,12,0.5)] hover:shadow-orange-500/60 transition-all active:scale-95 bg-orange-600 hover:bg-orange-500 rounded-2xl"
                                    >
                                        {isValidating ? <RefreshCw className="animate-spin" size={24} /> : (
                                            <>
                                                <ShieldCheck size={24} />
                                                Validate & Authorize
                                            </>
                                        )}
                                    </Button>
                                    <div className="flex items-center justify-center gap-2 mt-8 opacity-40">
                                        <Info size={12} className="text-gray-400" />
                                        <p className="text-[9px] text-gray-400 text-center font-black uppercase tracking-widest">
                                            Operator ID: {user?.id.slice(0, 8)} | System Ver: 2.5
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
            
            {step === 2 && (
                <Card title="Member Profile Enrollment" className="bg-[#050505] border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                        <UserIcon size={200} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        <Input label="GIVEN NAME (AS PER AADHAAR) *" name="name" value={formData.name} onChange={handleChange} placeholder="First and Middle Names" required />
                        <Input label="SURNAME / FAMILY NAME *" name="surname" value={formData.surname} onChange={handleChange} placeholder="Member's Surname" required />
                        <Input label="FATHER / GUARDIAN FULL NAME *" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Guardian's Full Name" required />
                        <Input label="DATE OF BIRTH (DD/MM/YYYY) *" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                        
                        <Select label="BIOLOGICAL GENDER *" name="gender" value={formData.gender} onChange={handleChange} description="Gender Category for Demographic Analytics">
                            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                        
                        <Input label="EMERGENCY CONTACT (10 DIGITS) *" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} maxLength={10} placeholder="Emergency Phone Number" description="Secondary Point of Contact" required />
                        <Input label="POSTAL PINCODE (6 DIGITS) *" name="pincode" value={formData.pincode} onChange={handleChange} maxLength={6} placeholder="Enter 6-digit Pincode" description="Required for Regional Categorization" required />
                        
                        <div className="md:col-span-2">
                            <Input label="FULL RESIDENTIAL ADDRESS *" name="address" value={formData.address} onChange={handleChange} placeholder="Complete Address (House No, Street, Area, City)" description="Must Match Permanent Residence Records" required />
                        </div>
                        
                        <div className="md:col-span-2 pt-6">
                            <label className="block text-[12px] font-black uppercase tracking-[0.3em] text-white mb-6 flex items-center gap-2">
                                <FileText size={16} className="text-orange-500" />
                                AADHAAR CARD DOCUMENT SCAN *
                            </label>
                            
                            <div className="mt-1 flex flex-col items-center justify-center p-8 md:p-16 border-4 border-gray-800 border-dashed rounded-[3rem] bg-black/60 hover:border-orange-500/40 transition-all group shadow-inner">
                                {imagePreview ? (
                                    <div className="text-center">
                                        <div className="relative inline-block">
                                            <div className="absolute -inset-2 bg-green-500/20 rounded-[2.5rem] blur opacity-50"></div>
                                            <img src={imagePreview} className="relative mx-auto h-56 md:h-72 rounded-[2rem] shadow-2xl border-4 border-white/10" />
                                            <button 
                                                onClick={handleRemoveImage}
                                                className="absolute -top-4 -right-4 h-12 w-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-red-500 transition-all border-4 border-black"
                                                title="Remove Image"
                                            >
                                                <XCircle size={24} />
                                            </button>
                                        </div>
                                        <p className="mt-8 text-sm font-black text-green-500 uppercase tracking-[0.4em] flex items-center justify-center gap-2">
                                            <CheckCircle2 size={18} />
                                            Document Scan Locked
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-8 w-full">
                                        <div className="p-8 bg-gray-900 rounded-[2.5rem] text-gray-700 group-hover:text-orange-500 transition-colors shadow-xl">
                                            <FileText size={64} />
                                        </div>
                                        <div className="text-center max-w-sm">
                                            <p className="text-lg font-bold text-gray-200 mb-2">Capture or Upload Aadhaar Scan</p>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed mb-8">Image must be sharp and all alphanumeric text must be readable.</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 px-8 py-5 text-[10px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5">
                                                <UploadCloud size={18} /> Select File
                                            </Button>
                                            <span className="text-gray-700 self-center font-black hidden sm:block">OR</span>
                                            <Button onClick={openCamera} className="flex items-center justify-center gap-3 px-10 py-5 text-[10px] font-black uppercase tracking-widest bg-orange-600/20 text-orange-500 border-2 border-orange-500/20 hover:bg-orange-600/30">
                                                <Camera size={18} /> Open Scanner
                                            </Button>
                                            <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {validationError && (
                        <div className="mt-10 flex items-center gap-4 p-6 bg-red-600/10 border-2 border-red-500/20 rounded-[2rem]">
                            <ShieldAlert size={28} className="text-red-500 shrink-0" />
                            <p className="text-xs md:text-sm text-red-400 font-black uppercase tracking-widest">{validationError}</p>
                        </div>
                    )}

                    <div className="mt-16 flex flex-col sm:flex-row justify-between gap-6">
                        <Button variant="secondary" onClick={() => { setStep(1); window.scrollTo(0, 0); }} className="w-full sm:w-auto order-2 sm:order-1 py-5 px-12 border-white/10 hover:bg-white/5">Return to Validation</Button>
                        <Button onClick={handleStep2Next} className="w-full sm:w-auto order-1 sm:order-2 py-5 px-16 text-[11px] font-black uppercase tracking-[0.4em] shadow-xl">Proceed to Final Review</Button>
                    </div>
                </Card>
            )}
            
            {step === 3 && (
                <Card title="Final Deployment Authorization" className="bg-[#050505] border-white/10 rounded-[3rem] p-8 md:p-12">
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <Select label="CURRENT PRIMARY OCCUPATION *" name="occupation" value={formData.occupation} onChange={handleChange} description="Determines Economic Demographics of the Sector">
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="PRIMARY SUPPORT REQUIREMENT *" name="supportNeed" value={formData.supportNeed} onChange={handleChange} description="Categorizes the Immediate Assistance Required">
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>

                        <div className="p-8 md:p-12 bg-orange-600/5 border-2 border-orange-500/20 rounded-[3rem] flex flex-col md:flex-row items-center gap-8 shadow-[0_0_80px_rgba(234,88,12,0.03)]">
                            <div className="p-6 bg-orange-500/20 rounded-3xl text-orange-500 shadow-inner shrink-0">
                                <ShieldCheck size={48} />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-xl font-bold text-white uppercase tracking-tight">Operator Attestation</h4>
                                <p className="text-[11px] md:text-xs text-gray-300 leading-relaxed uppercase tracking-[0.15em] font-bold">
                                    I, {user?.name}, certify that the biometric ID (Aadhaar: {formData.aadhaar}) has been verified against the physical document. I confirm that all entered profile data is accurate and the member image is a true representation of the original document.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-16 flex flex-col sm:flex-row justify-between gap-6">
                        <Button variant="secondary" onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="w-full sm:w-auto order-2 sm:order-1 py-5 px-12 border-white/10 hover:bg-white/5">Modify Profile</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto order-1 sm:order-2 py-6 px-16 text-[12px] font-black uppercase tracking-[0.5em] shadow-[0_30px_60px_-15px_rgba(234,88,12,0.4)] bg-orange-600 hover:bg-orange-500 rounded-2xl">
                            {isSubmitting ? 'Syncing Global Registry...' : 'Authorize Enrollment'}
                        </Button>
                    </div>
                </Card>
            )}
          </div>
      </div>
      
      {isCameraOpen && (
          <div className="fixed inset-0 bg-black/98 flex items-center justify-center z-[100] p-4 md:p-8 backdrop-blur-3xl animate-in zoom-in duration-300">
              <div className="w-full max-w-4xl relative">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                        <h4 className="text-2xl md:text-3xl font-cinzel text-white leading-none">Document Scanner</h4>
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mt-3">Live Visual Acquisition Node</p>
                      </div>
                      <button onClick={closeCamera} className="p-4 bg-white/5 text-gray-500 hover:text-white rounded-full transition-all border border-white/5">&times;</button>
                  </div>
                  
                  <div className="relative rounded-[3rem] overflow-hidden border-4 border-orange-500/30 shadow-[0_0_100px_rgba(234,88,12,0.15)] bg-black aspect-video flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale brightness-125 contrast-125"></video>
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="w-full h-1 bg-orange-500 shadow-[0_0_20px_#ea580c] animate-bounce opacity-30 mt-[50%]"></div>
                    </div>
                  </div>

                  <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
                      <Button onClick={handleCapture} className="w-full sm:w-auto px-16 py-6 text-sm font-black uppercase tracking-[0.4em] shadow-3xl bg-orange-600 hover:bg-orange-500">Acquire Image</Button>
                      <Button variant="secondary" onClick={closeCamera} className="w-full sm:w-auto px-12 py-6 text-sm font-black uppercase tracking-[0.4em] border-white/10 hover:bg-white/5">Abort Scan</Button>
                  </div>
              </div>
          </div>
      )}
    </DashboardLayout>
  );
};

const XCircle = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);

export default NewMemberForm;
