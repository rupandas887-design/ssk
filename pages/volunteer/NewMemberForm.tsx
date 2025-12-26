import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { Gender, Occupation, SupportNeed, Role } from '../../types';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { UploadCloud, Camera, ShieldAlert, Copy, ExternalLink, RefreshCw, Database, AlertTriangle, Zap, CheckCircle2, Loader2, User as UserIcon } from 'lucide-react';

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
  const [aadhaarError, setAadhaarError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const [showRepairTool, setShowRepairTool] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);

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
                    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
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
    setAadhaarError('');
    if (!formData.aadhaar || !/^\d{12}$/.test(formData.aadhaar)) {
      setAadhaarError('Valid 12-digit Aadhaar required.');
      return;
    }
    setIsValidating(true);
    try {
        const { data, error } = await supabase.from('members').select('id').eq('aadhaar', formData.aadhaar).maybeSingle();
        if (error) throw error;
        if (data) setAadhaarError('Aadhaar already registered.');
        else setStep(2);
    } catch (e: any) {
        setAadhaarError(`Registry Fault: ${getErrorMessage(e)}`);
    } finally {
        setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user?.organisationId) return;
      setIsSubmitting(true);
      try {
          let imageUrl = '';
          if (formData.memberImage) {
              const fileName = `${uuidv4()}.jpg`;
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
          addNotification("Enrollment Complete.", 'success');
          setFormData(initialFormData);
          setImagePreview(null);
          setStep(1);
      } catch (err: any) {
          addNotification(`Error: ${getErrorMessage(err)}`, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <DashboardLayout title="Member Enrollment Terminal">
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-20">
          {/* Operator Identity Banner */}
          <div className="bg-orange-600/10 border border-orange-500/20 rounded-3xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-600/20 rounded-2xl text-orange-500">
                      <UserIcon size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/60 leading-none mb-1">Authenticated Operator</p>
                      <h4 className="text-xl font-bold text-white uppercase tracking-tight">{user?.name}</h4>
                  </div>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Entity sector</p>
                  <p className="text-xs font-bold text-gray-400 uppercase">{user?.organisationName}</p>
              </div>
          </div>

          <div className="relative pt-6">
              <div className="flex justify-between items-center mb-6 relative z-10 px-2">
                  {[1, 2, 3].map(s => (
                      <div key={s} className={`flex flex-col items-center gap-2 transition-all duration-500 ${step >= s ? 'scale-110' : 'opacity-40'}`}>
                          <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all ${step >= s ? 'bg-orange-500 border-orange-400' : 'bg-gray-900 border-gray-800'}`}>
                              <span className="text-sm font-black text-white">{s}</span>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="absolute top-[3.2rem] left-0 w-full h-0.5 bg-gray-900 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 transition-all duration-700 shadow-[0_0_10px_rgba(255,100,0,0.5)]" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
              </div>
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {step === 1 && (
                <div className="space-y-8">
                    <Card title="Registry Validation" className="bg-[#050505]">
                        <div className="space-y-6">
                            <Input label="AADHAAR ID" name="aadhaar" value={formData.aadhaar} onChange={handleChange} maxLength={12} className="text-lg font-mono tracking-[0.2em]" />
                            <Input label="MOBILE" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} maxLength={10} />
                            {aadhaarError && <p className="text-xs text-red-400 font-bold uppercase tracking-widest">{aadhaarError}</p>}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <Button onClick={handleStep1Next} disabled={isValidating} className="py-4 px-12 text-[10px] font-black uppercase tracking-widest">
                                {isValidating ? 'Validating...' : 'Next Step'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
            {step === 2 && (
                <Card title="Identity Profile" className="bg-[#050505]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Input label="GIVEN NAME" name="name" value={formData.name} onChange={handleChange} />
                        <Input label="SURNAME" name="surname" value={formData.surname} onChange={handleChange} />
                        <Input label="FATHER NAME" name="fatherName" value={formData.fatherName} onChange={handleChange} />
                        <Input label="DOB" name="dob" type="date" value={formData.dob} onChange={handleChange} />
                        <Select label="GENDER" name="gender" value={formData.gender} onChange={handleChange}>
                            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                        <Input label="EMERGENCY" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} />
                        <Input label="PINCODE" name="pincode" value={formData.pincode} onChange={handleChange} />
                        <div className="md:col-span-2">
                            <Input label="ADDRESS" name="address" value={formData.address} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">MEMBER PHOTO</label>
                            <div className="mt-1 flex items-center justify-center p-12 border-2 border-gray-800 border-dashed rounded-3xl bg-black/40">
                                {imagePreview ? (
                                    <div className="text-center">
                                        <img src={imagePreview} className="mx-auto h-48 rounded-2xl shadow-2xl" />
                                        <Button variant="secondary" size="sm" onClick={handleRemoveImage} className="mt-4">Remove</Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <Button size="sm" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                                        <Button size="sm" variant="secondary" onClick={openCamera}>Camera</Button>
                                        <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-between">
                        <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={() => setStep(3)}>Next Step</Button>
                    </div>
                </Card>
            )}
            {step === 3 && (
                <Card title="Finalize Enrollment" className="bg-[#050505]">
                    <div className="space-y-6">
                        <Select label="OCCUPATION" name="occupation" value={formData.occupation} onChange={handleChange}>
                            {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                        </Select>
                        <Select label="SUPPORT NEED" name="supportNeed" value={formData.supportNeed} onChange={handleChange}>
                            {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <div className="p-6 bg-orange-600/5 border border-orange-500/20 rounded-2xl">
                            <p className="text-xs text-gray-400">Confirming enrollment as <b>{user?.name}</b>. All data is verified.</p>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-between">
                        <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="py-4 px-12">
                            {isSubmitting ? 'Submitting...' : 'Commit Enrollment'}
                        </Button>
                    </div>
                </Card>
            )}
          </div>
      </div>
      
      {isCameraOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-6 backdrop-blur-md">
              <Card title="Identity Capture" className="w-full max-w-2xl bg-black">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl border border-white/10 shadow-2xl mb-8"></video>
                  <div className="flex justify-center gap-6">
                      <Button onClick={handleCapture}>Capture</Button>
                      <Button variant="secondary" onClick={closeCamera}>Cancel</Button>
                  </div>
              </Card>
          </div>
      )}
    </DashboardLayout>
  );
};

export default NewMemberForm;