'use client'

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { BotIcon, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import { Message } from "./Chat";

export function ChatMessage({ message }: { message: Message }) {
  const isHuman = message.role === "human";
  const { user } = useUser();
  const isThinking = message.message === "Thinking...";

  return (
    <div className={`chat ${isHuman ? "chat-end" : "chat-start"} mb-4`}>
      {/* Avatar Section */}
      <div className="chat-image avatar">
        <div className="w-10 h-10 rounded-full overflow-hidden">
          {isHuman ? (
            user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt="Profile"
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gray-300 animate-pulse" />
            )
          ) : (
            <div className="h-10 w-10 bg-indigo-600 flex items-center justify-center rounded-xl">
              <BotIcon className="text-white h-7 w-7" />
            </div>
          )}
        </div>
      </div>

      {/* Message Bubble */}
      <div
        className={`chat-bubble prose max-w-sm md:max-w-2xl ${
          isHuman 
            ? "bg-indigo-600 text-white prose-invert" 
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {isThinking ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : (
          <Markdown>{message.message}</Markdown>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;