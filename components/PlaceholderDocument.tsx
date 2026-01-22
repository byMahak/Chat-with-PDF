'use client';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button'
import { PlusCircleIcon } from 'lucide-react'

function PlaceholderDocument() {
    const router = useRouter();

    const handleClick = () =>{
        // Check if user is Free Tier and if they reached the file limit, push to the upgrade page 
        router.push("/dashboard/upload");
    };

  return (
    <Button onClick={handleClick} className="flex flex-col items-center w-60 h-72 rounded-xl bg-gray-200 drop-shadow-md text-gray-500">
        <PlusCircleIcon className='size-12'/>
        <p className='text-l'>Add a Document</p>
    </Button>
  );
}

export default PlaceholderDocument