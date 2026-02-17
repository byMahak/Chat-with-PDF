'use server'

import { Message } from "@/components/ui/Chat";
import { adminDb } from "@/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { generateLangchainCompletion } from "../lib/langchain"; 
// import { connection } from 'next/server'; //Use if randomUUID errors persist

export async function askQuestion(id: string, question: string) {
  // Authenticate user
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");


  const chatRef = adminDb
  .collection("users")
  .doc(userId)
  .collection("files")
  .doc(id)
  .collection("chat");


  // Prepare and Save the User Message
  const userMessage: Message = {
    id: crypto.randomUUID(), 
    role: "human",
    message: question,
    createdAt: new Date(),
  };
  
  await chatRef.add(userMessage);

  // Generate AI Response
  const reply = await generateLangchainCompletion(id, question);
  
  const aiMessage: Message = {
    id: crypto.randomUUID(), 
    role: "ai",
    message: reply,
    createdAt: new Date(),
  };

  await chatRef.add(aiMessage);
  return { success: true, message: null };
}