import React, { useState } from 'react';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../features/auth/authSlice';
import { LogoFull } from './Logo';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5 z-40">
      {/* Logo — sits over sidebar area */}
      <div className="w-[190px] flex-shrink-0">
        <LogoFull />
      </div>

      {/* Right side user info */}
      <div className="flex items-center gap-3">
        {/* Bell */}
        <button className="relative w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
          <Bell size={15} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4361EE]" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            className="flex items-center gap-2.5 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition"
            onClick={() => setDropdownOpen((p) => !p)}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center overflow-hidden flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0) ?? 'A'}
              </span>
            </div>

            <div className="text-left leading-tight">
              <p className="text-sm font-semibold text-gray-800">{user?.name ?? 'Alex Wando'}</p>
              <p className="text-xs text-gray-400">{user?.role ?? 'Admin'}</p>
            </div>

            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
