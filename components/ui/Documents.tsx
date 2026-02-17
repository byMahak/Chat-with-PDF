import { adminDb } from '@/firebaseAdmin';
import PlaceholderDocument from '../PlaceholderDocument'
import { auth } from "@clerk/nextjs/server";
import { Document } from "./Document";

async function Documents() {
  auth.protect();

  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  const documentsSnapshot = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .get();

  return (
    <div className="flex-1 p-5 bg-gray-100 rounded-sm scrollbar-thin scrollbar-thumb-indigo-200">
      <div className="flex flex-wrap justify-center lg:justify-start gap-5 max-w-7xl mx-auto">
        {/* Map through the documents */}
        {documentsSnapshot.docs.map((doc) => {
          const { name, downloadUrl, size } = doc.data();

          return (
            <Document
              key={doc.id}
              id={doc.id}
              name={name}
              size={size}
              downloadUrl={downloadUrl}
            />
          );
        })}

        <PlaceholderDocument />
      </div>
    </div>
  );
}

export default Documents;