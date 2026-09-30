import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Member, MemberStatus } from '../types';
import { supabase } from '../supabase/client';
import { useNotification } from '../context/NotificationContext';
import CulturalLoader from '../components/ui/CulturalLoader';
import { 
  Search, 
  User, 
  MapPin, 
  Skull, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  X,
  RefreshCw,
  History,
  Phone,
  Calendar,
  Fingerprint,
  ArrowRight
} from 'lucide-react';

const MemberUpdates: React.FC = () => {
  const { addNotification } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [updateType, setUpdateType] = useState<'address' | 'deceased' | null>(null);
  
  // Address Change State
  const [newAddress, setNewAddress] = useState('');
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [addressPreview, setAddressPreview] = useState<string | null>(null);
  
  // Deceased State
  const [deathProof, setDeathProof] = useState<File | null>(null);
  const [deathPreview, setDeathPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const deathInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setMember(null);
    setUpdateType(null);
    
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`aadhaar.eq.${searchQuery.trim()},mobile.eq.${searchQuery.trim()}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        addNotification("Member not found in registry.", "error");
      } else {
        setMember(data as Member);
      }
    } catch (err: any) {
      addNotification(err.message || "Search failed.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'address' | 'death') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'address') {
        setAddressProof(file);
        if (addressPreview) URL.revokeObjectURL(addressPreview);
        setAddressPreview(URL.createObjectURL(file));
      } else {
        setDeathProof(file);
        if (deathPreview) URL.revokeObjectURL(deathPreview);
        setDeathPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadFile = async (file: File, prefix: string) => {
    const fileName = `${prefix}_${uuidv4()}.jpg`;
    const { data, error } = await supabase.storage.from('member-images').upload(fileName, file);
    if (error) throw new Error(`Storage Error: ${error.message}`);
    return supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
  };

  const handleAddressUpdate = async () => {
    if (!member || !newAddress || !addressProof) {
      addNotification("Please provide new address and proof document.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const proofUrl = await uploadFile(addressProof, 'address_proof');
      
      const { error } = await supabase
        .from('members')
        .update({
          previous_address: member.address,
          address: newAddress.trim(),
          address_proof_url: proofUrl
        })
        .eq('id', member.id);

      if (error) throw error;

      addNotification("Address updated in registry.", "success");
      setMember({
        ...member,
        previous_address: member.address,
        address: newAddress.trim(),
        address_proof_url: proofUrl
      });
      setUpdateType(null);
      setNewAddress('');
      setAddressProof(null);
      setAddressPreview(null);
    } catch (err: any) {
      addNotification(err.message || "Update failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDeceased = async () => {
    if (!member || !deathProof) {
      addNotification("Death certificate or official proof required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const proofUrl = await uploadFile(deathProof, 'death_cert');
      
      const { error } = await supabase
        .from('members')
        .update({
          status: MemberStatus.Deceased,
          death_certificate_url: proofUrl
        })
        .eq('id', member.id);

      if (error) throw error;

      addNotification("Member status updated to Deceased.", "success");
      setMember({ ...member, status: MemberStatus.Deceased, death_certificate_url: proofUrl });
      setUpdateType(null);
      setDeathProof(null);
      setDeathPreview(null);
    } catch (err: any) {
      addNotification(err.message || "Update failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Member Updates Portal">
      {isSubmitting && (
        <CulturalLoader message="Applying updates to member ledger in SSK registry..." overlay={true} compact={false} />
      )}
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        
        {/* Search Section */}
        <Card 
          title="Find Citizen Record" 
          subtitle="Query the Samaj registry by 12-digit Aadhaar UID or 10-digit primary mobile number"
          className="border-slate-200/80 shadow-card p-6 sm:p-8"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input 
                  placeholder="Enter Aadhaar (12 digits) or Mobile (10 digits)..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search size={16} />}
                />
              </div>
              <Button type="submit" disabled={isSearching} className="px-6 py-2.5 text-xs font-bold gap-2">
                {isSearching ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                <span>Locate Member</span>
              </Button>
            </div>
          </form>
        </Card>

        {member && (
          <div className="space-y-6">
            {/* Member Profile Card */}
            <Card className="border-slate-200/80 shadow-card p-0 overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="h-16 w-16 rounded-2xl bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-600 shadow-sm shrink-0">
                    <User size={30} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      {member.name} {member.surname}
                    </h2>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Citizen ID: {member.aadhaar} • Mobile: {member.mobile}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        member.status === MemberStatus.Deceased 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : member.status === MemberStatus.Accepted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                  <Button 
                    variant="secondary" 
                    onClick={() => setUpdateType('address')}
                    className="flex-1 md:flex-initial text-xs font-semibold gap-1.5"
                    disabled={member.status === MemberStatus.Deceased}
                  >
                    <MapPin size={14} />
                    <span>Change Address</span>
                  </Button>
                  <Button 
                    variant="danger"
                    onClick={() => setUpdateType('deceased')}
                    className="flex-1 md:flex-initial text-xs font-bold gap-1.5"
                    disabled={member.status === MemberStatus.Deceased}
                  >
                    <Skull size={14} />
                    <span>Mark Deceased</span>
                  </Button>
                </div>
              </div>

              <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Current Residence</p>
                    <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
                      {member.address}
                    </p>
                  </div>
                  {member.previous_address && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <History size={13} className="text-slate-400" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Previous Address</p>
                      </div>
                      <p className="text-xs text-slate-500 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60 italic leading-relaxed">
                        {member.previous_address}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dossier Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Father / Husband</span>
                      <span className="text-xs font-bold text-slate-800">{member.father_name || 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Date of Birth</span>
                      <span className="text-xs font-bold text-slate-800">{member.dob || 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Gender</span>
                      <span className="text-xs font-bold text-slate-800">{member.gender || 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Pincode</span>
                      <span className="text-xs font-bold text-slate-800">{member.pincode || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Address Relocation Card */}
            {updateType === 'address' && (
              <Card 
                title="Address Relocation Request" 
                subtitle="Update member address with verified proof of relocation"
                className="border-saffron-200 shadow-card p-6 sm:p-8 relative"
              >
                <button 
                  onClick={() => setUpdateType(null)} 
                  className="absolute top-6 right-6 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="space-y-5 pt-2">
                  <Input 
                    label="New Residential Address *" 
                    value={newAddress} 
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Enter full new residential address"
                    required
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Proof of Address Document (JPG/PNG) *</label>
                    <div 
                      onClick={() => addressInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 aspect-video max-h-48 flex flex-col items-center justify-center cursor-pointer hover:border-saffron-400 hover:bg-saffron-50/20 transition-all overflow-hidden"
                    >
                      {addressPreview ? (
                        <img src={addressPreview} className="w-full h-full object-cover" alt="Proof preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Upload size={32} />
                          <span className="text-xs font-semibold text-slate-600">Click to upload address proof</span>
                          <span className="text-[10px] text-slate-400">Utility bill, Aadhaar update, or rental agreement</span>
                        </div>
                      )}
                      <input 
                        ref={addressInputRef} 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'address')} 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <Button variant="secondary" onClick={() => setUpdateType(null)} className="text-xs">
                      Cancel
                    </Button>
                    <Button onClick={handleAddressUpdate} disabled={isSubmitting} className="text-xs font-bold gap-2">
                      {isSubmitting ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                      <span>Save Address Relocation</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Deceased Status Card */}
            {updateType === 'deceased' && (
              <Card 
                title="Mark Citizen as Deceased" 
                subtitle="Permanent registry status change with mandatory proof of death certificate"
                className="border-rose-200 shadow-card p-6 sm:p-8 relative"
              >
                <button 
                  onClick={() => setUpdateType(null)} 
                  className="absolute top-6 right-6 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="space-y-5 pt-2">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-xs font-bold text-rose-900">Irreversible Action Warning</p>
                      <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                        Marking this member as deceased will permanently adjust their status in the global census ledger. An official certificate is strictly required for legal audit.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Official Death Certificate (JPG/PNG) *</label>
                    <div 
                      onClick={() => deathInputRef.current?.click()}
                      className="border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50/30 aspect-video max-h-48 flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 transition-all overflow-hidden"
                    >
                      {deathPreview ? (
                        <img src={deathPreview} className="w-full h-full object-cover" alt="Death certificate preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-rose-400">
                          <FileText size={32} />
                          <span className="text-xs font-semibold text-rose-700">Upload Death Certificate</span>
                          <span className="text-[10px] text-slate-400">Official government issued document</span>
                        </div>
                      )}
                      <input 
                        ref={deathInputRef} 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'death')} 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <Button variant="secondary" onClick={() => setUpdateType(null)} className="text-xs">
                      Cancel
                    </Button>
                    <Button onClick={handleMarkDeceased} disabled={isSubmitting} variant="danger" className="text-xs font-bold gap-2">
                      {isSubmitting ? <RefreshCw className="animate-spin" size={15} /> : <Skull size={15} />}
                      <span>Finalize Deceased Status</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {!member && !isSearching && searchQuery && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <AlertCircle size={40} className="text-slate-300" />
            <p className="text-xs font-semibold text-slate-500">No member found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MemberUpdates;
