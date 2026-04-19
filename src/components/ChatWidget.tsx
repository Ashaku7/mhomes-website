"use client";

import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send } from "lucide-react";

interface ChatMessage {
  id: number;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
}

interface ChatWidgetProps {
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}

const ChatWidget = ({ isChatOpen, setIsChatOpen }: ChatWidgetProps) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      text: "Hello! Welcome to MHOMES Resort. I'm your virtual assistant. How can I help you plan your perfect vacation?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!chatMessagesRef.current) return;
    const scrollTimer = requestAnimationFrame(() => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop =
          chatMessagesRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(scrollTimer);
  }, [chatMessages.length, isChatLoading]);

  // Auto-focus on chat input when chat opens
  useEffect(() => {
    if (isChatOpen && chatInputRef.current) {
      const timer = setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isChatOpen]);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim()) return;

    const messageText = chatInput;
    setChatInput("");
    const userMessage: ChatMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });
      const data = await response.json();
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        text: data.response,
        sender: "bot",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, botMessage]);
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting. Please try again later.",
        sender: "bot",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput]);

  const handleChatKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  return (
    <motion.div
      className="fixed bottom-8 right-8 z-40"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring" }}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={!isChatOpen ? { y: [0, -10, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Button
          type="button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-white shadow-2xl hover:shadow-3xl transition-all"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={
              isChatOpen ? { duration: 0 } : { duration: 2, repeat: Infinity }
            }
          >
            <MessageCircle className="w-8 h-8" />
          </motion.div>
        </Button>
      </motion.div>

      {isChatOpen && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute bottom-20 right-0 w-80 h-96 bg-gradient-to-br from-white/98 to-white/95 glass-effect rounded-2xl shadow-2xl flex flex-col border-2 border-accent/20"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="sticky top-0 p-3 border-b-2 border-accent/20 bg-gradient-to-r from-accent/10 to-primary/10 rounded-t-2xl flex-shrink-0"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 bg-gradient-to-br from-accent to-accent/60 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <h3 className="luxury-heading text-sm font-bold text-primary">
                    Resort Assistant
                  </h3>
                  <div className="flex items-center gap-1">
                    <motion.div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <p className="luxury-text text-xs text-muted-foreground">
                      Online
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-accent/10 flex items-center justify-center transition-all flex-shrink-0"
              >
                <X className="w-5 h-5 text-primary" />
              </motion.button>
            </div>
          </motion.div>

          <div
            ref={chatMessagesRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 messages-container"
          >
            {chatMessages.map((message, idx) => (
              <motion.div
                key={`msg-${message.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`max-w-[80%] p-3 rounded-xl text-sm ${
                    message.sender === "user"
                      ? "bg-gradient-to-br from-accent to-accent/80 text-white shadow-lg"
                      : "bg-muted/60 text-muted-foreground border border-accent/10"
                  }`}
                >
                  <p className="luxury-text text-sm leading-relaxed">
                    {message.text}
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </motion.div>
              </motion.div>
            ))}
            {isChatLoading && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="bg-muted/60 p-3 rounded-xl border border-accent/10">
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={`dot-${i}`}
                        className="w-2 h-2 bg-accent rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <motion.div
            className="p-3 border-t-2 border-accent/20 bg-gradient-to-r from-white/50 to-white/30 rounded-b-2xl backdrop-blur-sm flex-shrink-0"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
          >
            <div className="flex gap-2">
              <Input
                ref={chatInputRef}
                type="text"
                placeholder="Ask me anything..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyPress}
                disabled={isChatLoading}
                suppressHydrationWarning
                className="flex-1 bg-white/80 border-accent/30 focus:border-accent text-sm h-10 rounded-lg luxury-text placeholder:text-muted-foreground/60"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={sendChatMessage}
                disabled={isChatLoading || !chatInput.trim()}
                className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-white flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default React.memo(ChatWidget);
