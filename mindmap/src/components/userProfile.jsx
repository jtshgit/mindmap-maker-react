import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Settings, ExternalLink } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const ACCOUNT_APP_URL = process.env.REACT_APP_ACCOUNT_URL;

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openProf, setOpenProf] = useState(false);
    const dropdownRef = useRef(null);

    // 1. Fetch user status on mount
    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/me`, { withCredentials: true })
            .then((res) => {
                setUser(res.data);
            })
            .catch(() => {
                setUser({ success: false });
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // 2. Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenProf(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Helper for user initials fallback
    const getInitials = (firstName, lastName) => {
        const f = firstName?.[0] || '';
        const l = lastName?.[0] || '';
        return (f + l).toUpperCase() || 'U';
    };

    // 3. Loading Skeleton (Fluent style)
    if (loading) {
        return (
            <div className="flex items-center animate-pulse">
                <div className="w-7 h-7 bg-[#E1DFDD] dark:bg-[#3B3A39] rounded-full border border-[#8A8886]/30" />
            </div>
        );
    }

    // 4. Unauthenticated State (Microsoft Fluent Secondary Button)
    if (!user?.success || !user.user) {
        const currentUrl = encodeURIComponent(window.location.href);
        const loginUrl = `${ACCOUNT_APP_URL}/a/login?re=${currentUrl}`;

        return (
            <a
                href={loginUrl}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded bg-white dark:bg-[#201F1E] text-[#252423] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130] border border-[#8A8886] dark:border-[#3B3A39] transition-colors"
            >
                <User className="w-3.5 h-3.5 text-[#0078D4]" />
                <span>Sign in</span>
            </a>
        );
    }

    const { firstName, lastName, email, profile_p } = user.user;

    // 5. Authenticated State (Fluent Profile & Dropdown Popover)
    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpenProf((prev) => !prev)}
                className="flex items-center p-0.5 rounded-full border border-transparent hover:border-[#0078D4] focus:border-[#0078D4] focus:outline-none transition-all"
                aria-expanded={openProf}
                aria-haspopup="true"
            >
                <div className="w-7 h-7 rounded-full bg-[#0078D4] flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                    {profile_p ? (
                        <img
                            src={profile_p}
                            alt={`${firstName}'s profile`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-[11px] font-semibold text-white tracking-tight">
                            {getInitials(firstName, lastName)}
                        </span>
                    )}
                </div>
            </button>

            {openProf && (
                <div className="absolute right-0 mt-1.5 z-50 w-64 origin-top-right rounded-md bg-white dark:bg-[#201F1E] border border-[#E1DFDD] dark:border-[#3B3A39] shadow-lg py-1 text-xs transition-all animate-in fade-in duration-100">
                    {/* User Info Header */}
                    <div className="px-3.5 py-3 flex items-center gap-3 border-b border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#292827]/50">
                        <div className="w-9 h-9 rounded-full bg-[#0078D4] shrink-0 flex items-center justify-center text-xs font-semibold text-white overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                            {profile_p ? (
                                <img src={profile_p} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                getInitials(firstName, lastName)
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xs font-semibold text-[#252423] dark:text-white truncate">
                                {firstName} {lastName}
                            </h2>
                            <p className="text-[11px] text-[#605E5C] dark:text-[#A19F9D] truncate">
                                {email}
                            </p>
                        </div>
                    </div>

                    {/* Account Menu Options */}
                    <div className="p-1">
                        <a
                            href={`${ACCOUNT_APP_URL}/u`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpenProf(false)}
                            className="w-full text-left px-2.5 py-2 rounded text-[#252423] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130] flex items-center justify-between transition-colors group"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <Settings className="w-4 h-4 text-[#0078D4] shrink-0" />
                                <span className="truncate font-normal">Account Settings</span>
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#8A8886] dark:text-[#A19F9D] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}