import { useAgent } from "../hooks/useAgent";
import { CreateFormat } from "../types/ollama";
import { SYSTEM_PROMPT } from "./const";
import { useState, KeyboardEvent, useEffect, useRef, ChangeEvent } from "react";
import ReactMarkdown from 'react-markdown';

// Interfaces
interface StoryResponse extends Record<string, unknown> {
  response: string;
  context: string;
  story: string;
}

// Add chat messages to the history state for undo/redo
interface HistoryState {
  context: string;
  story: string;
  chatMessages: ChatMessage[];
}

interface ChatMessage {
  id: number; // Added ID for key prop
  sender: 'user' | 'storyteller';
  text: string;
}

// Helper function to format chat history for the agent
const formatChatHistoryForAgent = (messages: ChatMessage[]): string => {
  return messages.map(msg => `${msg.sender === 'user' ? 'User' : 'Storyteller'}: ${msg.text}`).join('\n');
};

export function AgentInterface() {
  const {
    models,
    selectedModel,
    setSelectedModel,
    userPrompt,
    setUserPrompt,
    // response, // No longer directly used for display
    isLoading,
    error,
    generateStructuredResponse,
  } = useAgent(SYSTEM_PROMPT);

  const [storyContext, setStoryContext] = useState<string>("");
  const [story, setStory] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]); // Changed to HistoryState
  const [redoHistory, setRedoHistory] = useState<HistoryState[]>([]); // State for redo
  const chatContainerRef = useRef<HTMLDivElement>(null); // Ref for scrolling chat
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const inputRef = useRef<HTMLTextAreaElement>(null); // Ref for the input textarea
  const [importError, setImportError] = useState<string | null>(null); // State for import errors

  // Effect to scroll chat to bottom on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Effect to focus input after storyteller response
  useEffect(() => {
    // Only focus if loading just finished and the last message is from the storyteller
    if (!isLoading && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].sender === 'storyteller') {
      inputRef.current?.focus();
    }
    // Dependency array includes isLoading and chatMessages to trigger check after loading finishes
  }, [isLoading, chatMessages]);

  const handleGenerateResponse = async () => {
    if (!userPrompt.trim()) return; // Don't send empty messages

    // Clear redo history on new action
    setRedoHistory([]);

    const currentChatMessages = chatMessages; // Capture state before updates
    const currentContext = storyContext;
    const currentStory = story;

    // Save current state to history *before* adding new user message
    setHistory(prev => {
      const currentState: HistoryState = { context: currentContext, story: currentStory, chatMessages: currentChatMessages };
      const newHistory = [...prev, currentState];
      // Limit history size if needed (e.g., keep last 10 states)
      // return newHistory.slice(-10);
      return newHistory;
    });

    const newUserMessage: ChatMessage = {
        id: Date.now(), // Simple unique ID
        sender: 'user',
        text: userPrompt
    };
    const updatedChatMessages = [...currentChatMessages, newUserMessage];
    setChatMessages(updatedChatMessages); // Add user message immediately

    const complexFormat: CreateFormat<StoryResponse> = {
        type: 'object',
        title: 'Story Response Format',
        properties: {
            response: {
                type: 'string',
                minLength: 1, // Allow shorter responses now
            },
            context: {
                type: 'string',
                minLength: 0
            },
            story: {
                type: 'string',
                minLength: 0
            }
        },
        required: ['response'], // Only 'response' is absolutely required
        additionalProperties: false,
        examples: [{
            response: "Here's your story",
            context: "In a magical kingdom...",
            story: "Once upon a time..."
        }]
    };

    // Format chat history for the agent
    const chatHistoryString = formatChatHistoryForAgent(updatedChatMessages);

    // Create the full message for the agent including chat history
    const fullMessage = `Chat History:
${chatHistoryString}

---
Current Story Context:
${storyContext || '(empty)'}

---
Current Story:
${story || '(empty)'}

---
Please respond to the last User message, considering the chat history and the current context/story. Remember your core rules about asking questions/making suggestions and only updating context/story if explicitly asked.`;

    setUserPrompt(""); // Clear input immediately after sending

    const result = await generateStructuredResponse(
      complexFormat,
      fullMessage
    );

    if (result) {
      try {
        const parsedResult = JSON.parse(result);

        // Add storyteller response to chat
        const newStorytellerMessage: ChatMessage = {
            id: Date.now() + 1, // Ensure unique ID
            sender: 'storyteller',
            text: parsedResult.response
        };
        setChatMessages(prev => [...prev, newStorytellerMessage]);


        // Append context if provided and not empty
        if (parsedResult.context) {
          setStoryContext(prev => prev + (prev ? "\n\n" : "") + parsedResult.context);
        }

        // Append story if provided and not empty
        if (parsedResult.story) {
          setStory(prev => prev + (prev ? "\n\n" : "") + parsedResult.story);
        }

      } catch (e) {
        console.error("Failed to parse structured response:", e);
        // Add error message to chat?
         const errorResponseMessage: ChatMessage = {
            id: Date.now() + 1,
            sender: 'storyteller',
            text: `Error: Failed to process response. ${e instanceof Error ? e.message : String(e)}`
         };
         setChatMessages(prev => [...prev, errorResponseMessage]);
      }
    } else {
         // Handle cases where generateStructuredResponse returns null/undefined
         const failResponseMessage: ChatMessage = {
            id: Date.now() + 1,
            sender: 'storyteller',
            text: 'Error: No response received from the storyteller.'
         };
         setChatMessages(prev => [...prev, failResponseMessage]);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    const currentState: HistoryState = { context: storyContext, story: story, chatMessages: chatMessages };

    // Restore previous state
    setStoryContext(lastState.context);
    setStory(lastState.story);
    setChatMessages(lastState.chatMessages);

    // Move current state to redo history
    setRedoHistory(prev => [...prev, currentState]);

    // Remove last state from history
    setHistory(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;

    const nextState = redoHistory[redoHistory.length - 1];
    const currentState: HistoryState = { context: storyContext, story: story, chatMessages: chatMessages };

    // Restore next state
    setStoryContext(nextState.context);
    setStory(nextState.story);
    setChatMessages(nextState.chatMessages);

    // Move current state back to undo history
    setHistory(prev => [...prev, currentState]);

    // Remove last state from redo history
    setRedoHistory(prev => prev.slice(0, -1));
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history? This cannot be undone.")) {
      setChatMessages([]);
      setHistory([]); // Also clear history
      setRedoHistory([]); // Also clear redo history
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.altKey || e.metaKey) && !e.shiftKey) { // Use Alt/Option+Enter, not Shift+Enter
      e.preventDefault();
      if (!isLoading) {
        handleGenerateResponse();
      }
    }
  };

  // Updated canUndo/canRedo logic
  const canUndo = history.length > 0;
  const canRedo = redoHistory.length > 0;

  // --- Import/Export Functions --- 

  const handleExport = () => {
    setImportError(null); // Clear any previous import errors
    const dataToExport = {
      context: storyContext,
      story: story,
      // Optionally include chat history?
      // chat: chatMessages 
    };
    const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-storyteller-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setImportError(null); // Clear previous errors
    fileInputRef.current?.click(); // Trigger hidden file input
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const parsedData = JSON.parse(text);

        // Basic validation
        if (typeof parsedData.context === 'string' && typeof parsedData.story === 'string') {
          // Ask user if they want to clear chat?
          // For now, just replace context/story
          if (window.confirm("Importing will replace the current context and story. Clear chat history as well?")) {
               setChatMessages([]);
               setHistory([]);
               setRedoHistory([]);
          }
          setStoryContext(parsedData.context);
          setStory(parsedData.story);
          setImportError(null); // Clear error on success
        } else {
          throw new Error('Invalid file format: Missing or incorrect type for context/story keys.');
        }
      } catch (error) {
        console.error("Import failed:", error);
        setImportError(error instanceof Error ? error.message : 'Failed to import file.');
      }
    };
    reader.onerror = () => {
        console.error("File reading error");
        setImportError('Error reading the selected file.');
    }
    reader.readAsText(file);

    // Clear the input value to allow importing the same file again
    event.target.value = '';
  };

  // --- End Import/Export Functions ---

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-900 flex flex-col h-screen">
      <h1 className="text-3xl font-bold mb-4 text-gray-200 text-center md:text-left">AI Storyteller Chat</h1>

      <div className="flex flex-1 gap-4 md:gap-8 overflow-hidden flex-col md:flex-row">

        {/* Left side (or main area on smaller screens) - Chat Interface */}
        <div className="w-full md:w-2/3 flex flex-col space-y-4">
          {/* Model Selection */}
          <div className="flex-shrink-0 hidden">
            <label className="block text-sm font-medium mb-1 text-gray-200">Select Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 border rounded bg-gray-800 text-gray-200 border-gray-700"
            >
              {models.map((model: string) => (
                <option key={model} value={model} className="bg-gray-800">
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Chat History Area */}
          <div
             ref={chatContainerRef}
             className="flex-1 overflow-y-auto p-4 bg-black rounded border border-gray-700 space-y-4"
             style={{ maxHeight: 'calc(100vh - 300px)' }} // Adjust height dynamically
           >
             {chatMessages.map((msg) => (
               <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div
                   className={`p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg break-words ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                   {msg.sender === 'storyteller' ? (
                     <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&>p]:my-1">
                       <ReactMarkdown>{msg.text}</ReactMarkdown>
                     </div>
                   ) : (
                     msg.text // Render user text directly
                   )}
                 </div>
               </div>
             ))}
             {isLoading && (
                 <div className="flex justify-start">
                    <div className="p-3 rounded-lg bg-gray-700 text-gray-400 italic animate-pulse">
                        Storyteller is typing...
                    </div>
                 </div>
             )}
          </div>

          {/* Error Message Area */}
          {error && !isLoading && ( // Only show general error if not loading and not handled above
              <div className="flex-shrink-0 text-red-400 p-2 border border-red-500 rounded bg-gray-800">
                  Agent Error: {error}
              </div>
          )}

          {/* Import Error Message Area */}
          {importError && (
              <div className="flex-shrink-0 text-yellow-400 p-2 border border-yellow-500 rounded bg-gray-800">
                  Import Error: {importError}
              </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 space-y-2">
            <textarea
              ref={inputRef}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-2 border rounded h-24 bg-gray-800 text-gray-200 border-gray-700 placeholder-gray-400"
              placeholder="Enter your message (Option+Enter to send)"
              disabled={isLoading}
            />
            <div className="flex gap-2 md:gap-4">
              <button
                onClick={handleGenerateResponse}
                disabled={isLoading || !userPrompt.trim()}
                className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Generating..." : "Send"}
              </button>
              <button
                onClick={handleUndo}
                disabled={isLoading || !canUndo}
                className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z equivalent)"
              >
                Undo
              </button>
              <button
                onClick={handleRedo}
                disabled={isLoading || !canRedo}
                className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y equivalent)"
              >
                Redo
              </button>
              <button
                onClick={handleClearChat}
                disabled={isLoading || chatMessages.length === 0}
                className="px-3 py-2 bg-red-800 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear Chat History (cannot be undone)"
              >
                Clear
              </button>
            </div>
          </div>
        </div>


        {/* Right side - Story Context and Story */}
        <div className="w-full md:w-1/3 flex flex-col space-y-4 overflow-hidden">
           {/* Import/Export Buttons */} 
           <div className="flex-shrink-0 flex gap-4">
              <button 
                 onClick={handleExport}
                 className="flex-1 bg-green-700 text-white p-2 rounded hover:bg-green-600"
               >
                 Export Data
               </button>
               <button 
                 onClick={handleImportClick}
                 className="flex-1 bg-yellow-600 text-white p-2 rounded hover:bg-yellow-500"
               >
                 Import Data
               </button>
               {/* Hidden file input */}
               <input 
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileImport}
                 accept=".json"
                 style={{ display: 'none' }}
               />
           </div>

           {/* Context Display */}
           <div className="flex-1 flex flex-col overflow-hidden">
               <h2 className="text-xl font-semibold mb-2 text-gray-200 flex-shrink-0">Story Context</h2>
               <div className="flex-1 p-4 bg-black rounded whitespace-pre-wrap text-white border border-gray-700 overflow-y-auto">
                 <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&>p]:my-1">
                     <ReactMarkdown>{storyContext || '*Context is currently empty*'}</ReactMarkdown>
                 </div>
               </div>
           </div>
           {/* Story Display */} 
           <div className="flex-1 flex flex-col overflow-hidden">
               <h2 className="text-xl font-semibold mb-2 text-gray-200 flex-shrink-0">Story</h2>
               <div className="flex-1 p-4 bg-black rounded whitespace-pre-wrap text-white border border-gray-700 overflow-y-auto">
                  <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&>p]:my-1">
                     <ReactMarkdown>{story || '*Story is currently empty*'}</ReactMarkdown>
                  </div>
               </div>
           </div>
        </div>

      </div>
    </main>
  );
} 