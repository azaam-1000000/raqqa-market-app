
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { supabase } from '../services/supabase';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import { getErrorMessage } from '../utils/errors';
import { useNavigate } from 'react-router-dom';
import { PrivacySetting } from '../types';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg> );
const CameraIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg> );

const PrivacyFieldRow: React.FC<{
    label: string;
    children: React.ReactNode;
    privacy: PrivacySetting;
    onPrivacyChange: (value: PrivacySetting) => void;
}> = ({ label, children, privacy, onPrivacyChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{label}</label>
        <div className="flex gap-2">
            <div className="flex-1">{children}</div>
            <Select 
                value={privacy} 
                onChange={e => onPrivacyChange(e.target.value as PrivacySetting)} 
                className="w-32 !py-0 !px-2 !text-xs"
            >
                <option value="public">العامة</option>
                <option value="followers">المتابعون فقط</option>
                <option value="private">أنا فقط</option>
            </Select>
        </div>
    </div>
);

const EditProfileScreen: React.FC = () => {
    const { user, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();
    
    // Media state
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [coverUploading, setCoverUploading] = useState(false);
    const [coverError, setCoverError] = useState<string | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    // Form fields state
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [gender, setGender] = useState(profile?.gender || '');
    const [placeOfOrigin, setPlaceOfOrigin] = useState(profile?.place_of_origin || '');
    const [educationLevel, setEducationLevel] = useState(profile?.education_level || '');
    const [website, setWebsite] = useState(profile?.website || '');
    const [contactInfo, setContactInfo] = useState(profile?.contact_info || '');

    // Privacy state
    const [genderPrivacy, setGenderPrivacy] = useState<PrivacySetting>(profile?.gender_privacy || 'public');
    const [placeOfOriginPrivacy, setPlaceOfOriginPrivacy] = useState<PrivacySetting>(profile?.place_of_origin_privacy || 'public');
    const [educationLevelPrivacy, setEducationLevelPrivacy] = useState<PrivacySetting>(profile?.education_level_privacy || 'public');
    const [websitePrivacy, setWebsitePrivacy] = useState<PrivacySetting>(profile?.website_privacy || 'public');
    const [contactInfoPrivacy, setContactInfoPrivacy] = useState<PrivacySetting>(profile?.contact_info_privacy || 'public');
    
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setBio(profile.bio || '');
            if (profile.cover_photo_url) {
                const { data } = supabase.storage.from('uploads').getPublicUrl(profile.cover_photo_url);
                setCoverUrl(data.publicUrl);
            }
            // Set details
            setGender(profile.gender || '');
            setPlaceOfOrigin(profile.place_of_origin || '');
            setEducationLevel(profile.education_level || '');
            setWebsite(profile.website || '');
            setContactInfo(profile.contact_info || '');
            // Set privacy
            setGenderPrivacy(profile.gender_privacy || 'public');
            setPlaceOfOriginPrivacy(profile.place_of_origin_privacy || 'public');
            setEducationLevelPrivacy(profile.education_level_privacy || 'public');
            setWebsitePrivacy(profile.website_privacy || 'public');
            setContactInfoPrivacy(profile.contact_info_privacy || 'public');
        }
    }, [profile]);
    
    const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        const newFilePath = `${user.id}/avatars/${Date.now()}.${file.name.split('.').pop()}`;
        
        setAvatarUploading(true);
        setAvatarError(null);

        try {
            const { error: uploadError } = await supabase.storage.from('uploads').upload(newFilePath, file);
            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: newFilePath }).eq('id', user.id);
            if (updateError) {
                await supabase.storage.from('uploads').remove([newFilePath]);
                throw updateError;
            }
            
            await refreshProfile();
            
            if (profile?.avatar_url) {
                await supabase.storage.from('uploads').remove([profile.avatar_url]);
            }

        } catch (error: any) {
            setAvatarError(getErrorMessage(error));
        } finally {
            setAvatarUploading(false);
            if(avatarInputRef.current) avatarInputRef.current.value = "";
        }
    };

    const handleCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        const newFilePath = `${user.id}/covers/${Date.now()}.${file.name.split('.').pop()}`;
        
        setCoverUploading(true);
        setCoverError(null);

        try {
            const { error: uploadError } = await supabase.storage.from('uploads').upload(newFilePath, file);
            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase.from('profiles').update({ cover_photo_url: newFilePath }).eq('id', user.id);
            if (updateError) {
                await supabase.storage.from('uploads').remove([newFilePath]);
                throw updateError;
            }

            await refreshProfile();

            if (profile?.cover_photo_url) {
                 await supabase.storage.from('uploads').remove([profile.cover_photo_url]);
            }
        } catch (error) {
            setCoverError(getErrorMessage(error));
        } finally {
            setCoverUploading(false);
            if (coverInputRef.current) coverInputRef.current.value = "";
        }
    };
    
    const handleProfileUpdate = async () => {
        if (!user) return;
        setUpdateLoading(true);
        setUpdateError(null);

        try {
            const updates = {
                full_name: fullName.trim(),
                bio: bio.trim(),
                gender: gender || null,
                place_of_origin: placeOfOrigin.trim() || null,
                education_level: educationLevel.trim() || null,
                website: website.trim() || null,
                contact_info: contactInfo.trim() || null,
                gender_privacy: genderPrivacy,
                place_of_origin_privacy: placeOfOriginPrivacy,
                education_level_privacy: educationLevelPrivacy,
                website_privacy: websitePrivacy,
                contact_info_privacy: contactInfoPrivacy,
            };

            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

            if (error) throw error;
            
            await refreshProfile();
            navigate('/profile');
        } catch (error: any) {
            setUpdateError(`فشل تحديث الملف الشخصي: ${getErrorMessage(error)}`);
        } finally {
            setUpdateLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
             <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           تعديل الملف الشخصي
                        </h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-lg w-full">
                        <div className="relative mb-20">
                            <div className="relative h-48 bg-gray-200 dark:bg-zinc-800 rounded-t-lg group">
                                {coverUrl && <img src={coverUrl} alt="Cover" className="w-full h-full object-cover rounded-t-lg" />}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg">
                                    <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading} className="flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-md hover:bg-black/80">
                                        {coverUploading ? <Spinner/> : <><CameraIcon /> <span>تغيير الغلاف</span></>}
                                    </button>
                                </div>
                                <input type="file" ref={coverInputRef} onChange={handleCoverFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={coverUploading} />
                            </div>
                            {coverError && <p className="text-red-400 text-xs text-center mt-2">{coverError}</p>}
                            
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                                <div className="relative">
                                    <Avatar url={profile?.avatar_url} size={128} userId={profile?.id} className="border-4 border-white dark:border-zinc-900"/>
                                    <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="absolute bottom-1 right-1 bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-500" aria-label="تغيير الصورة الرمزية">
                                        {avatarUploading ? <Spinner/> : <EditIcon />}
                                    </button>
                                    <input type="file" ref={avatarInputRef} onChange={handleAvatarFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={avatarUploading} />
                                </div>
                            </div>
                        </div>

                         {avatarError && <p className="text-red-400 text-sm text-center -mt-16 mb-4">{avatarError}</p>}

                        <div className="space-y-6 p-6 sm:p-8">
                            <div>
                                <h3 className="text-lg font-bold text-teal-500 dark:text-teal-400 border-b border-gray-200 dark:border-zinc-800 pb-2 mb-4">المعلومات العامة</h3>
                                <div> <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">الاسم الكامل</label> <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} /> </div>
                                <div className="mt-4"> <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">نبذة تعريفية</label> <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="تحدث عن نفسك..." /> </div>
                            </div>
                            
                            <div className="space-y-4">
                               <h3 className="text-lg font-bold text-teal-500 dark:text-teal-400 border-b border-gray-200 dark:border-zinc-800 pb-2 mb-4">التفاصيل الشخصية</h3>
                               <PrivacyFieldRow label="الجنس" privacy={genderPrivacy} onPrivacyChange={setGenderPrivacy}>
                                   <Select value={gender} onChange={e => setGender(e.target.value)}>
                                       <option value="" disabled>اختر...</option>
                                       <option value="male">ذكر</option>
                                       <option value="female">أنثى</option>
                                       <option value="other">أفضل عدم القول</option>
                                   </Select>
                               </PrivacyFieldRow>
                               <PrivacyFieldRow label="مكان الإقامة" privacy={placeOfOriginPrivacy} onPrivacyChange={setPlaceOfOriginPrivacy}>
                                    <Input value={placeOfOrigin} onChange={e => setPlaceOfOrigin(e.target.value)} placeholder="مثال: الرقة، سوريا"/>
                               </PrivacyFieldRow>
                               <PrivacyFieldRow label="التعليم" privacy={educationLevelPrivacy} onPrivacyChange={setEducationLevelPrivacy}>
                                    <Input value={educationLevel} onChange={e => setEducationLevel(e.target.value)} placeholder="مثال: درس في جامعة الفرات"/>
                               </PrivacyFieldRow>
                               <PrivacyFieldRow label="موقع الويب" privacy={websitePrivacy} onPrivacyChange={setWebsitePrivacy}>
                                    <Input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com"/>
                               </PrivacyFieldRow>
                               <PrivacyFieldRow label="معلومات الاتصال" privacy={contactInfoPrivacy} onPrivacyChange={setContactInfoPrivacy}>
                                    <Input value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="بريد إلكتروني أو رقم هاتف..."/>
                               </PrivacyFieldRow>
                            </div>

                            {updateError && <p className="text-red-400 text-sm text-center">{updateError}</p>}
                            <div className="flex gap-4 pt-2">
                                <Button onClick={handleProfileUpdate} loading={updateLoading}>حفظ التغييرات</Button>
                            </div>
                        </div>
                    </div>
                </div>
             </main>
        </div>
    );
};

export default EditProfileScreen;
