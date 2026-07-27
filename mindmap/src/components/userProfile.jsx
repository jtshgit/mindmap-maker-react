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

    // 3. Loading Skeleton (Proportional to 40px Top Bar)
    if (loading) {
        return (
            <div className="flex items-center space-x-2 animate-pulse">
                <div className="w-7 h-7 bg-neutral-200 dark:bg-[#2d2d2d] rounded-full border border-neutral-300 dark:border-[#3c3c3c]" />
            </div>
        );
    }

    // 4. Unauthenticated State (Matches Header Action Buttons)
    if (!user?.success || !user.user) {
        const currentUrl = encodeURIComponent(window.location.href);
        const loginUrl = `${ACCOUNT_APP_URL}/a/login?re=${currentUrl}`;

        return (
            <a
                href={loginUrl}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#2b2b2b] border border-neutral-200 dark:border-[#3c3c3c] transition-colors"
            >
                <User className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>Account</span>
            </a>
        );
    }

    const { firstName, lastName, email, profile_p } = user.user;

    // 5. Authenticated State (Header-Matched Profile Avatar & Dropdown Menu)
    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpenProf((prev) => !prev)}
                className={`group flex items-center p-0.5 rounded-full transition-all focus:outline-none`}
                aria-expanded={openProf}
                aria-haspopup="true"
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0078d4] to-[#00b7c3] flex items-center justify-center border border-neutral-300 dark:border-[#3c3c3c] overflow-hidden shadow-xs shrink-0">
                    {profile_p ? (
                        <img
                            src={profile_p}
                            alt={`${firstName}'s profile`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-[11px] font-bold text-white tracking-wider">
                            {getInitials(firstName, lastName)}
                        </span>
                    )}
                </div>
            </button>

            {openProf && (
                <div className="absolute right-0 mt-1.5 z-50 w-60 origin-top-right rounded-md bg-white dark:bg-[#252526] border border-neutral-200 dark:border-[#3c3c3c] shadow-xl py-1 text-xs transition-all duration-100 ease-out">
                    {/* User Info Header */}
                    <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-neutral-200 dark:border-[#3c3c3c]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0078d4] to-[#00b7c3] shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-xs">
                            {profile_p ? (
                                <img src={profile_p} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                getInitials(firstName, lastName)
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                                {firstName} {lastName}
                            </h2>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
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
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-[#04395e] flex items-center justify-between text-neutral-800 dark:text-neutral-200 transition-colors group"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <Settings className="w-3.5 h-3.5 text-[#0078d4] shrink-0" />
                                <span className="truncate">Account Settings</span>
                            </span>
                            <ExternalLink className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}