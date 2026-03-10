import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Trash2,
} from "lucide-react";
import {
  sendMessage,
  sendMessageStream,
  getSuggestedQuestions,
  createConversation,
} from "../lib/chat-api";

export default function Chatbot({ jobId, token, documentTitle = "Document" }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setSuggestionsLoading(true);
        const data = await getSuggestedQuestions(jobId, token);
        setSuggestions(data.suggestions);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        // Fallback suggestions
        setSuggestions([
          "What are the key obligations?",
          "What are the termination conditions?",
          "Are there payment terms?",
          "What are the main risks?",
        ]);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [jobId, token]);

  const handleSendMessage = async (messageText) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    setInput("");
    setError(null);

    try {
      setIsLoading(true);

      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const conv = await createConversation(
          jobId,
          token,
          `Chat about ${documentTitle}`,
        );
        convId = conv.conversation_id;
        setConversationId(convId);
      }

      // Add user message to UI
      const userMessage = {
        role: "user",
        content: textToSend,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Prepare chat request
      const chatRequest = {
        job_id: jobId,
        message: textToSend,
        conversation_id: convId,
      };

      // Stream response
      let fullResponse = "";
      const assistantMessageIndex = messages.length + 1;

      await sendMessageStream(
        chatRequest,
        token,
        (chunk) => {
          fullResponse += chunk;
          // Update the assistant message as it streams in
          setMessages((prev) => {
            const newMessages = [...prev];
            if (
              newMessages[assistantMessageIndex]?.role === "assistant" ||
              assistantMessageIndex >= newMessages.length
            ) {
              newMessages[assistantMessageIndex] = {
                role: "assistant",
                content: fullResponse,
              };
            }
            return newMessages;
          });
        },
        (convId) => {
          setConversationId(convId);
        },
        (err) => {
          setError(err);
          console.error("Stream error:", err);
        },
      );

      // Add assistant message if streaming completed
      if (!messages[assistantMessageIndex] || !fullResponse) {
        const assistantMessage = {
          role: "assistant",
          content: fullResponse,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              Chat with Document
            </h2>
            <p className="text-xs text-muted-foreground">{documentTitle}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="space-y-4 max-w-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Start a Conversation
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Ask questions about the document. Try one of the suggestions
                  below.
                </p>
              </div>

              {/* Suggested Questions */}
              {!suggestionsLoading && suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Suggested Questions
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(suggestion)}
                        className="w-full p-3 text-left text-sm rounded-lg bg-muted/50 hover:bg-muted text-foreground transition-colors border border-border/40 hover:border-border"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-2xl rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border/40"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-current opacity-70 space-y-2">
                      <p className="text-xs font-medium">Sources:</p>
                      {message.sources.map((source, srcIdx) => (
                        <div
                          key={srcIdx}
                          className="text-xs p-2 bg-black/20 rounded opacity-90"
                        >
                          <p className="font-medium">Page {source.page}</p>
                          <p className="line-clamp-2">{source.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Copy Button */}
                  <button
                    onClick={() =>
                      copyToClipboard(message.content, `msg-${idx}`)
                    }
                    className="mt-2 p-1 hover:bg-white/20 rounded transition-colors"
                    title="Copy message"
                  >
                    {copiedId === `msg-${idx}` ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border/40 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the document..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-muted rounded-lg border border-border/40 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
