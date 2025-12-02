'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  userRole: 'admin' | 'user';
}

const userMenu = [
  { name: 'Dashboard', href: '/user/dashboard', icon: '📊' },
  { name: 'Create Lead', href: '/user/create-lead', icon: '➕' },
  { name: 'My Leads', href: '/user/leads', icon: '👥' },
  { name: 'Analytics', href: '/user/analytics', icon: '📈' },
];

const adminMenu = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { name: 'User Management', href: '/admin/users', icon: '👥' },
  { name: 'All Leads', href: '/admin/leads', icon: '📋' },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const menu = userRole === 'admin' ? adminMenu : userMenu;

  return (
    <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg"></div>
              <span className="font-bold text-gray-900 dark:text-white">
                Leads Hub
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {menu.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!isCollapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}