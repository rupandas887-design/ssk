
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
import { UploadCloud, Camera } from 'lucide-react';

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
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        console.error("Error accessing camera:", err);
        addNotification("Could not access camera. Please check browser permissions.", 'error');
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
                    const file = new File([blob], "member-capture.jpg", { type: "image/jpeg" });
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
      setAadhaarError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    const { data, error } = await supabase
      .from('members')
      .select('id')
      .eq('aadhaar', formData.aadhaar)
      .maybeSingle();

    if (error) {
        setAadhaarError('Error validating Aadhaar. Please try again.');
        console.error(error);
        return;
    }
    if (data) {
      setAadhaarError('This Aadhaar number is already registered.');
    } else {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !user.organisationId) {
          addNotification("Error: You must be logged in and associated with an organisation to submit.", 'error');
          return;
      }
      setIsSubmitting(true);
      
      let imageUrl = '';
      if (formData.memberImage) {
          const fileExt = formData.memberImage.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('member-images')
            .upload(fileName, formData.memberImage);

          if(uploadError) {
              addNotification(`Error uploading image: ${uploadError.message}`, 'error');
              setIsSubmitting(false);
              return;
          }
          const { data: publicUrlData } = supabase.storage.from('member-images').getPublicUrl(uploadData.path);
          imageUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('members').insert({
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
      });

      if (insertError) {
          addNotification(`Failed to submit form: ${insertError.message}`, 'error');
      } else {
          addNotification("Membership form submitted successfully!", 'success');
          setFormData(initialFormData);
          handleRemoveImage();
          setStep(1);
      }
      setIsSubmitting(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="font-cinzel text-xl text-orange-500 mb-4">Step 1: Validation</h3>
            <div className="space-y-4">
              <Input 
                label="Aadhaar Number" 
                name="aadhaar" 
                value={formData.aadhaar} 
                onChange={handleChange} 
                placeholder="Enter 12-digit Aadhaar" 
              />
               {aadhaarError && <p className="text-red-500 text-sm mt-1">{aadhaarError}</p>}
              <Input label="Mobile Number" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Enter 10-digit mobile" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleStep1Next}>Next</Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h3 className="font-cinzel text-xl text-orange-500 mb-4">Step 2: Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Surname" name="surname" value={formData.surname} onChange={handleChange} />
              <Input label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} />
              <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} />
              <Select label="Gender" name="gender" value={formData.gender} onChange={handleChange}>
                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
              <Input label="Emergency Contact" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} />
              <Input label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
               <div className="md:col-span-2">
                <Input label="Full Address" name="address" value={formData.address} onChange={handleChange} placeholder="House No, Street, Landmark, City, State" />
               </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Upload Member Image</label>
                <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                    {imagePreview ? (
                        <div className="text-center">
                            <img src={imagePreview} alt="Member Image Preview" className="mx-auto h-40 rounded-md shadow-lg" />
                            <Button variant="secondary" size="sm" onClick={handleRemoveImage} className="mt-4">Remove Image</Button>
                        </div>
                    ) : (
                        <div className="space-y-4 text-center">
                            <div className="flex gap-4 justify-center">
                                <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                                    <UploadCloud size={16} /> Upload a file
                                </Button>
                                <Button type="button" size="sm" variant="secondary" onClick={openCamera} className="flex items-center gap-2">
                                    <Camera size={16} /> Take a picture
                                </Button>
                            </div>
                            <input ref={fileInputRef} id="memberImage" name="memberImage" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                    )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        );
      case 3:
        return (
          <form onSubmit={handleSubmit}>
            <h3 className="font-cinzel text-xl text-orange-500 mb-4">Step 3: Purpose</h3>
            <div className="space-y-4">
                <Select label="What do you do?" name="occupation" value={formData.occupation} onChange={handleChange}>
                     {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
                <Select label="What support you want?" name="supportNeed" value={formData.supportNeed} onChange={handleChange}>
                    {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
            </div>
            <div className="mt-6 flex justify-between">
                <Button variant="secondary" type="button" onClick={() => setStep(2)}>Back</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Form'}</Button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="New Member Enrollment">
      <Card>
        <div className="w-full max-w-4xl mx-auto">
            <div className="mb-8">
                <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${step >= 1 ? 'text-orange-500' : 'text-gray-500'}`}>Validation</span>
                    <span className={`font-bold ${step >= 2 ? 'text-orange-500' : 'text-gray-500'}`}>Personal</span>
                    <span className={`font-bold ${step >= 3 ? 'text-orange-500' : 'text-gray-500'}`}>Purpose</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: `${((step -1) / 2) * 100}%` }}></div>
                </div>
            </div>
            {renderStep()}
        </div>
      </Card>
      
      {isCameraOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <Card title="Take Picture" className="w-full max-w-2xl">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-md bg-gray-800"></video>
                  <div className="flex justify-center space-x-4 pt-4">
                      <Button type="button" onClick={handleCapture}>Capture</Button>
                      <Button type="button" variant="secondary" onClick={closeCamera}>Cancel</Button>
                  </div>
              </Card>
          </div>
      )}
    </DashboardLayout>
  );
};

export default NewMemberForm;
