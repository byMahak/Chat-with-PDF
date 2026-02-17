import Header from '@/components/ui/Header';
import { ClerkLoaded } from '@clerk/nextjs'
import React from 'react'


function DashboardLayout({children}: {children: React.ReactNode}) {
  return (
    <ClerkLoaded>
        <div className="flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

    </ClerkLoaded>
  );
}

export default DashboardLayout;