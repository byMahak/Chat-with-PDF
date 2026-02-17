import { SignedIn, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import React from 'react'
import { Button } from './button'
import { FilePlus2 } from 'lucide-react'

function Header() {
  return (
    <div className="flex justify-between bg-white shadow-sm p-3 border-b pl-6">
        <Link href='/dashboard' className='text-xl font-semibold'>
            Chat to <span className='text-indigo-600'>PDF</span>
        </Link>

        <SignedIn>
            <div className="flex items-center space-x-4">
                <Button asChild variant="link" className="hidden md:flex">
                    <Link href="/dashboard/upgrade">Pricing</Link>
                </Button>

                <Button asChild variant="outline">
                    <Link href="/dashboard">My Documents</Link>
                </Button>
                
                <Button asChild variant="outline" className="border-indigo-600">
                    <Link href="/dashboard/upload">
                        <FilePlus2 className='text-indigo-600'/>
                    </Link>
                </Button>

                {/* Upgrade Button */}
                <UserButton/>

            </div>
        </SignedIn>
    </div>
  )
}

export default Header