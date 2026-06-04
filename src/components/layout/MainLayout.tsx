import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => (
  <div className="min-h-screen bg-white">
    <Header />
    <Sidebar />
    <main className="ml-[200px] pt-14 min-h-screen">{children}</main>
  </div>
);
