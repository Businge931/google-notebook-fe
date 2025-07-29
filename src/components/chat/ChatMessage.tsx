import React from "react";
import { Button } from "../ui/Button";
import {
  type ChatMessage as ChatMessageType,
  type Citation,
} from "../../types";
import { formatTimestamp } from "../../utils/helpers";
import { cn } from "../../utils/cn";

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onCitationClick,
}) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[80%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div className={cn("flex-shrink-0", isUser ? "ml-3" : "mr-3")}>
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              isUser ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
            )}
          >
            {isUser ? "U" : "AI"}
          </div>
        </div>

        {/* Message Content */}
        <div
          className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
        >
          <div
            className={cn(
              "rounded-lg px-4 py-2 text-sm",
              isUser ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-900"
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.citations.map((citation) => (
                  <Button
                    key={citation.id}
                    variant="citation"
                    onClick={() => onCitationClick(citation)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    Page {citation.page}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-xs text-gray-500 mt-1">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
