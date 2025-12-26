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
import { Camera, ShieldAlert, RefreshCw, User as UserIcon, CheckCircle2, FileText, Fingerprint, UploadCloud } from 'lucide-react';

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
    if ((name === 'aadhaar' || name === 'mobile' || name === 'emergencyContact') && value !== '' && !/^\d+$/.test(value)) return;
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
      setValidationError('Aadhaar must be exactly 12 digits.');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
        setValidationError('Mobile number must be exactly 10 digits.');
        return;
    }

    setIsValidating(true);
    try {
        const { data, error } = await supabase.from('members').select('id').eq('aadhaar', formData.aadhaar).maybeSingle();
        if (error) throw error;
        if (data) {
            setValidationError('This Aadhaar ID is already registered in our system.');
        } else {
            setStep(2);
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
          setValidationError('All profile details are mandatory.');
          return;
      }
      if (!/^\d{10}$/.test(formData.emergencyContact)) {
          setValidationError('Emergency contact must be a valid 10-digit mobile number.');
          return;
      }
      if (!formData.memberImage) {
          setValidationError('Aadhaar Card document image is mandatory.');
          return;
      }
      setStep(3);
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
          addNotification("Member enrollment completed successfully.", 'success');
          setFormData(initialFormData);
          setImagePreview(null);
          setStep(1);
      } catch (err: any) {
          addNotification(`Enrollment failed: ${getErrorMessage(err)}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <DashboardLayout title="Member Enrollment Terminal">
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-20">
          <div className="bg-orange-600/10 border border-orange-500/20 rounded-3xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-600/20 rounded-2xl text-orange-500">
                      <Fingerprint size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/60 leading-none mb-1">Active Operator</p>
                      <h4 className="text-xl font-bold text-white uppercase tracking-tight">{user?.name}</h4>
                  </div>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Sector Authority</p>
                  <p className="text-xs font-bold text-gray-400 uppercase">{user?.organisationName}</p>
              </div>
          </div>

          <div className="relative pt-6">
              <div className="flex justify-between items-center mb-6 relative z-10 px-2">
                  {[1, 2, 3].map(s => (
                      <div key={s} className={`flex flex-col items-center gap-2 transition-all duration-500 ${step >= s ? 'scale-110' : 'opacity-40'}`}>
                          <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all ${step >= s ? 'bg-orange-500 border-orange-400 shadow-[0_0_15px_rgba(255,100,0,0.4)]' : 'bg-gray-900 border-gray-800'}`}>
                              <span className="text-sm font-black text-white">{s}</span>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="absolute top-[3.2rem] left-0 w-full h-0.5 bg-gray-900 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 transition-all duration-700" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
              </div>
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {step === 1 && (
                <div className="space-y-8">
                    <Card title="Registry Validation" className="bg-[#050505]">
                        <div className="space-y-6">
                            <Input 
                                label="AADHAAR ID (12 DIGITS) *" 
                                name="aadhaar" 
                                value={formData.aadhaar} 
                                onChange={handleChange} 
                                maxLength={12} 
                                placeholder="Enter 12-digit Aadhaar"
                                className="text-lg font-mono tracking-[0.2em]" 
                                required
                            />
                            <Input 
                                label="MOBILE NUMBER (10 DIGITS) *" 
                                name="mobile" 
                                type="tel" 
                                value={formData.mobile} 
                                onChange={handleChange} 
                                maxLength={10} 
                                placeholder="Enter 10-digit mobile"
                                required
                            />
                            {validationError && (
                                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <ShieldAlert size={16} className="text-red-500" />
                                    <p className="text-xs text-red-400 font-bold uppercase tracking-widest leading-relaxed">
                                        {validationError}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <Button onClick={handleStep1Next} disabled={isValidating} className="py-4 px-12 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                {isValidating ? <RefreshCw className="animate-spin" size={14} /> : 'Validate Registry'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
            
            {step === 2 && (
                <Card title="Profile & Document Enrollment" className="bg-[#050505]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Input label="GIVEN NAME *" name="name" value={formData.name} onChange={handleChange} required />
                        <Input label="SURNAME *" name="surname" value={formData.surname} onChange={handleChange} required />
                        <Input label="FATHER / GUARDIAN NAME *" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
                        <Input label="DATE OF BIRTH *" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                        <Select label="GENDER *" name="gender" value={formData.gender} onChange={handleChange}>
                            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                        <Input label="EMERGENCY CONTACT *" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} maxLength={10} required />
                        <Input label="PINCODE *" name="pincode" value={formData.pincode} onChange={handleChange} maxLength={6} required />
                        <div className="md:col-span-2">
                            <Input label="FULL RESIDENTIAL ADDRESS *" name="address" value={formData.address} onChange={handleChange} required />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">AADHAAR CARD DOCUMENT IMAGE *</label>
                            <div className="mt-1 flex flex-col items-center justify-center p-12 border-2 border-gray-800 border-dashed rounded-[2.5rem] bg-black/40 hover:border-orange-500/40 transition-colors group">
                                {imagePreview ? (
                                    <div className="text-center">
                                        <div className="relative inline-block">
                                            <img src={imagePreview} className="mx-auto h-56 rounded-3xl shadow-2xl border-2 border-white/10" />
                                            <button 
                                                onClick={handleRemoveImage}
                                                className="absolute -top-3 -right-3 h-8 w-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                        <p className="mt-4 text-[10px] font-black text-green-500 uppercase tracking-widest">Aadhaar Image Loaded</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="p-6 bg-gray-900 rounded-3xl text-gray-700 group-hover:text-orange-500 transition-colors">
                                            <FileText size={48} />
                                        </div>
                                        <div className="flex gap-4">
                                            <Button size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                                                <UploadCloud size={14} /> Upload Scan
                                            </Button>
                                            <span className="text-gray-700 self-center font-bold">OR</span>
                                            <Button size="sm" variant="secondary" onClick={openCamera} className="flex items-center gap-2">
                                                <Camera size={14} /> Scan Card
                                            </Button>
                                            <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                                        </div>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Image must be bright and all text clearly readable.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {validationError && (
                        <div className="mt-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <ShieldAlert size={16} className="text-red-500" />
                            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">{validationError}</p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-between">
                        <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={handleStep2Next}>Continue Enrollment</Button>
                    </div>
                </Card>
            )}

            {step === 3 && (
                <Card title="Final Review" className="bg-[#050505]">
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Select label="PRIMARY OCCUPATION *" name="occupation" value={formData.occupation} onChange={handleChange}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="SUPPORT NEED CATEGORY *" name="supportNeed" value={formData.supportNeed} onChange={handleChange}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>

                        <div className="p-8 bg-orange-600/5 border border-orange-500/20 rounded-[2rem] flex items-center gap-6">
                            <CheckCircle2 size={32} className="text-orange-500 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 leading-relaxed uppercase tracking-wider font-bold">
                                    Operator Certification: I, {user?.name}, verify that the attached Aadhaar card image matches the enrollee's identification and all data points are verified.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-12 flex justify-between">
                        <Button variant="secondary" onClick={() => setStep(2)}>Review Profile</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="py-4 px-12 text-[10px] font-black uppercase tracking-widest shadow-2xl">
                            {isSubmitting ? 'Syncing Global Registry...' : 'Finalize Enrollment'}
                        </Button>
                    </div>
                </Card>
            )}
          </div>
      </div>
      
      {isCameraOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-6 backdrop-blur-md">
              <div className="w-full max-w-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xl font-cinzel text-white">Document Scanner</h4>
                      <button onClick={closeCamera} className="text-gray-500 hover:text-white text-3xl">&times;</button>
                  </div>
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-[2.5rem] border-2 border-white/10 shadow-3xl mb-8 bg-black"></video>
                  <div className="flex justify-center gap-6">
                      <Button onClick={handleCapture} className="px-12 py-4 text-[10px] font-black uppercase tracking-widest">Capture Document</Button>
                      <Button variant="secondary" onClick={closeCamera} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Abort</Button>
                  </div>
              </div>
          </div>
      )}
    </DashboardLayout>
  );
};

export default NewMemberForm;