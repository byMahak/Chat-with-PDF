'use client';

import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { db } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export enum StatusText {
    UPLOADING = "Uploading file...",
    UPLOADED = "File uploaded successfully!",
    SAVING = "Saving file info to database...",
    GENERATING = "Generating AI Response, This will only take a few seconds...",
}


export type Status = typeof StatusText[keyof typeof StatusText];

function useUpload() {
    const [progress, setProgress] = useState<number | null>(null);
    const [fileId, setFileId] = useState<string | null>(null);
    const [status, setStatus] = useState<Status | null>(null);
    const { user } = useUser();
    const router = useRouter();
    
    const handleUpload = async (file: File) => {
        if (!file || !user) {
        console.error("Upload failed: File or User is missing");
        return;
    }

        const fileIdToUploadTo = uuidv4();
        setStatus(StatusText.UPLOADING);
        setProgress(0);

        // 1. Upload to Supabase
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(`${user.id}/${fileIdToUploadTo}`, file, {
                upsert: true
            });

        if (error) {
            console.error("Error uploading to Supabase:", error);
            setStatus(null);
            return;
        }

        setProgress(100);
        setStatus(StatusText.UPLOADED);

        // 2. Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from("documents")
            .getPublicUrl(`${user.id}/${fileIdToUploadTo}`);

        setStatus(StatusText.SAVING);

        // 3. Save reference to Firestore
        await setDoc(doc(db, "users", user.id, 'files', fileIdToUploadTo), {
            name: file.name,
            size: file.size,
            type: file.type,
            downloadUrl: publicUrl,
            ref: `${user.id}/${fileIdToUploadTo}`,
            createdAt: serverTimestamp(),
        });

        setStatus(StatusText.GENERATING);
        setFileId(fileIdToUploadTo);
    };

    return { progress, status, fileId, handleUpload };
}

export default useUpload;