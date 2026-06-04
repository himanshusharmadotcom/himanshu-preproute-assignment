import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  FileEdit,
  ClipboardList,
  FileText,
  Users,
  Building2,
  User,
  Archive,
  HelpCircle,
  Trophy,
  MessageSquare,
  Bell,
  Settings,
} from 'lucide-react';

const navItems = [
  { icon: TrendingUp,    path: '/dashboard',      label: 'Dashboard' },
  { icon: FileEdit,      path: '/test-creation/new', label: 'Test Creation' },
  { icon: ClipboardList, path: '/test-tracking',  label: 'Test Tracking' },
  { icon: FileText,      path: '/documents',      label: 'Documents' },
  { icon: Users,         path: '/students',       label: 'Students' },
  { icon: Building2,     path: '/institution',    label: 'Institution' },
  { icon: User,          path: '/profile',        label: 'Profile' },
  { icon: Archive,       path: '/archive',        label: 'Archive' },
  { icon: HelpCircle,    path: '/help',           label: 'Help' },
  { icon: Trophy,        path: '/achievements',   label: 'Achievements' },
  { icon: MessageSquare, path: '/messages',       label: 'Messages' },
  { icon: Bell,          path: '/notifications',  label: 'Notifications' },
  { icon: Settings,      path: '/settings',       label: 'Settings' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-[200px] bg-white border-r border-gray-100 flex flex-col z-30 pt-[56px]">
      <nav className="flex flex-col py-3 overflow-y-auto flex-1">
        {navItems.map(({ icon: Icon, path, label }) => {
          // treat all /test-creation/* paths as active for the Test Creation item
          const active = path === '/test-creation/new'
            ? location.pathname.startsWith('/test-creation')
            : location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors text-left
                ${active
                  ? 'text-[#4361EE] bg-[#F0F3FF]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Icon
                size={17}
                className={active ? 'text-[#4361EE]' : 'text-gray-400'}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
