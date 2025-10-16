import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';

const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-cyan-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-yellow-400"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;


const AdminDashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userCount, setUserCount] = useState(0);
    const [pendingReportsCount, setPendingReportsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.email !== 'azaamazeez8877@gmail.com') {
            navigate('/home', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [usersRes, reportsRes] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, created_at', { count: 'exact' })
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('reports')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'PENDING')
                ]);

                if (usersRes.error) throw usersRes.error;
                if (reportsRes.error) throw reportsRes.error;
                
                setProfiles(usersRes.data as Profile[] || []);
                setUserCount(usersRes.count || 0);
                setPendingReportsCount(reportsRes.count || 0);

            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const renderUserList = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (profiles.length === 0) {
            return <p className="text-center text-slate-400 py-10">لا يوجد مستخدمون مسجلون بعد.</p>;
        }
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700">
                {profiles.map(profile => (
                    <Link 
                        key={profile.id}
                        to={`/admin/user/${profile.id}`}
                        className="flex items-center gap-4 p-3 hover:bg-slate-700/50 transition-colors"
                    >
                        <Avatar url={profile.avatar_url} size={40} />
                        <div className="flex-1">
                            <p className="font-bold text-white">{profile.full_name}</p>
                            <p className="text-xs text-slate-400">
                                انضم في: {new Date(profile.created_at).toLocaleDateString('ar-EG')}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16">
                        <h1 className="text-xl font-bold">لوحة التحكم للمسؤول</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-4">
                            <UsersIcon />
                            <div>
                                <p className="text-slate-400">إجمالي المستخدمين</p>
                                <p className="text-3xl font-bold text-cyan-400">{userCount}</p>
                            </div>
                        </div>
                         <Link to="/admin/reports" className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-4 hover:border-yellow-400 transition-colors">
                            <FlagIcon />
                            <div>
                                <p className="text-slate-400">البلاغات المعلقة</p>
                                <p className="text-3xl font-bold text-yellow-400">{pendingReportsCount}</p>
                            </div>
                        </Link>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">قائمة المستخدمين</h2>
                    {renderUserList()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboardScreen;