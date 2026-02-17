import PdfView from "@/components/ui/PdfView";
import Chat from "@/components/ui/Chat";
import { adminDb } from "@/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { doc } from "firebase/firestore";

async function ChatToFilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  if (!id) throw new Error("Missing file id");

  const ref = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(id)
    .get();

  const url = ref.data()?.downloadUrl;

return (
  <div className="grid lg:grid-cols-5 h-full overflow-hidden">
    
    {/* PDF */}
    <div className="col-span-5 lg:col-span-3 bg-gray-100 border-r-3 lg:border-gray-500 h-full overflow-hidden">
      <PdfView url={url} />
    </div>

    {/* Chat */}
    <div className="col-span-5 lg:col-span-2 h-full overflow-hidden">
      <Chat id={id} />
    </div>

  </div>
);

}
export default ChatToFilePage;