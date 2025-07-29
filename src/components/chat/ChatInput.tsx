import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "../ui/Button";
import { CHAT_CONFIG, UI_MESSAGES } from "../../utils/constants";
import { cn } from "../../utils/cn";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
  placeholder = UI_MESSAGES.CHAT.PLACEHOLDER,
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
      setMessage(value);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const isDisabled = disabled || isLoading;
  const canSend = message.trim().length > 0 && !isDisabled;

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900",
              "focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              "placeholder:text-gray-400"
            )}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />

          {/* Character count */}
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-400">
              {message.length}/{CHAT_CONFIG.MAX_MESSAGE_LENGTH}
            </div>

            {isLoading && (
              <div className="text-xs text-purple-600 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-600 mr-1"></div>
                {UI_MESSAGES.CHAT.THINKING}
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!canSend}
          isLoading={isLoading}
          className="flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatInput;
