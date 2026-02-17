"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2Icon } from "lucide-react";
import { useCollection } from "react-firebase-hooks/firestore";
import { useUser } from "@clerk/nextjs";
import { collection, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase";
import { askQuestion } from "@/actions/askQuestion";
import { ChatMessage } from "../ui/ChatMessage";

export type Message = {
  id?: string;
  role: "human" | "ai" | "placeholder";
  message: string;
  createdAt: Date;
};

function Chat({ id }: { id: string }) {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const [snapshot, loading, error] = useCollection(
    user &&
      query(
        collection(db, "users", user?.id, "files", id, "chat"),
        orderBy("createdAt", "asc")
      )
  );

  useEffect(() => {
    bottomOfChatRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Sync Firebase snapshot with local state
  useEffect(() => {
    if (!snapshot) return;

    const fetchedMessages = snapshot.docs.map((doc) => {
      const { role, message, createdAt } = doc.data();
      return {
        id: doc.id,
        role,
        message,
        createdAt: createdAt?.toDate?.() ?? new Date(),
      };
    });

    const isThinking = messages[messages.length - 1]?.message === "Thinking...";

    if (isThinking) {
      // Look for the actual AI response
      const hasAiResponse = fetchedMessages.some(
        (m) => m.role === "ai" && m.message !== "Thinking..."
      );

      // Remove the "Thinking..." state once the DB has the answer
      if (hasAiResponse) {
        setMessages(fetchedMessages);
      }
    } else {
      setMessages(fetchedMessages);
    }
  }, [snapshot]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input;
    setInput("");

    // Optimistic Update(add Human message and AI placeholder immediately)
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "human",
        message: q,
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        role: "ai",
        message: "Thinking...",
        createdAt: new Date(),
      },
    ]);

    startTransition(async () => {
      const { success } = await askQuestion(id, q);

      if (!success) {
        setMessages((prev) =>
          prev.slice(0, prev.length - 1).concat([
            {
              id: crypto.randomUUID(),
              role: "ai",
              message: "Error: Failed to get response",
              createdAt: new Date(),
            },
          ])
        );
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message Area */}
      <div className="flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-indigo-200">
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2Icon className="animate-spin h-20 w-20 text-indigo-600 mt-20" />
          </div>
        ) : (
          <div className="p-5">
            {messages.length === 0 && (
              <ChatMessage
                key={"placeholder"}
                message={{
                  role: "ai",
                  message: "Ask me anything about the document!",
                  createdAt: new Date(),
                }}
              />
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            <div ref={bottomOfChatRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        id="form"
        onSubmit={handleSubmit}
        className="flex p-5 bg-indigo-600 border-t rounded-md"
      >
        <Input
          placeholder="Ask a Question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-white"
        />

        <Button type="submit" disabled={!input || isPending} className="ml-2">
          {isPending ? (
            <Loader2Icon className="animate-spin text-white" />
          ) : (
            "Ask"
          )}
        </Button>
      </form>
    </div>
  );
}

export default Chat;