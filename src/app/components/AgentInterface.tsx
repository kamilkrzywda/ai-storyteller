import { useAgent } from "../hooks/useAgent";
import { CreateFormat } from "../types/ollama";
import { SYSTEM_PROMPT } from "./const";
import { useState, KeyboardEvent, useEffect, useRef, ChangeEvent } from "react";
import ReactMarkdown from 'react-markdown';

// Interfaces
interface StoryResponse extends Record<string, unknown> {
  response: string;
  context: string; // Agent still sends a string, potentially with newlines
}

// Add chat messages to the history state for undo/redo
interface HistoryState {
  context: string[]; // Context is now an array
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

  const [storyContext, setStoryContext] = useState<string[]>([]); // Context is now an array
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]); // Changed to HistoryState
  const [redoHistory, setRedoHistory] = useState<HistoryState[]>([]); // State for redo
  const chatContainerRef = useRef<HTMLDivElement>(null); // Ref for scrolling chat
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const inputRef = useRef<HTMLTextAreaElement>(null); // Ref for the input textarea
  const [manualContextInput, setManualContextInput] = useState<string>(""); // State for manual context input
  const [importError, setImportError] = useState<string | null>(null); // State for import errors
  const [isMac, setIsMac] = useState(false); // State to track if OS is macOS

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

  // Effect to detect OS on mount
  useEffect(() => {
    // Use navigator.platform for broad compatibility
    setIsMac(/^Mac/i.test(navigator.platform));
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleGenerateResponse = async () => {
    if (!userPrompt.trim()) return; // Don't send empty messages

    // Clear redo history on new action
    setRedoHistory([]);

    const currentChatMessages = chatMessages; // Capture state before updates
    const currentContext = storyContext;

    // Save current state to history *before* adding new user message
    setHistory(prev => {
      const currentState: HistoryState = { context: currentContext, chatMessages: currentChatMessages };
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
            }
        },
        required: ['response'], // Only 'response' is absolutely required
        additionalProperties: false,
        examples: [{
            response: "Here's your story",
            context: "In a magical kingdom..."
        }]
    };

    // Format chat history for the agent
    const chatHistoryString = formatChatHistoryForAgent(updatedChatMessages);

    // Create the full message for the agent including chat history
    const fullMessage = `Chat History:
${chatHistoryString}

---
Current Story Context:
${storyContext.length > 0 ? storyContext.join('\n') : '(empty)'}

---
Please respond to the last User message, considering the chat history and the current context. Remember your core rules about asking questions/making suggestions and only updating context if explicitly asked.`;

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
          // Split context string by newline and filter empty strings
          const potentialNewItems = parsedResult.context
              .split('\n')
              .map((item: string) => item.trim())
              .filter((item: string) => item !== '');
          if (potentialNewItems.length > 0) {
              setStoryContext(prevContext => {
                  const currentContextSet = new Set(prevContext);
                  const uniqueNewItems = potentialNewItems.filter((item: string) => !currentContextSet.has(item));
                  // Only update state if there are actually new unique items
                  if (uniqueNewItems.length > 0) {
                      return [...prevContext, ...uniqueNewItems];
                  } else {
                      return prevContext; // No changes if all items were duplicates
                  }
              });
          }
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
    const currentState: HistoryState = { context: [...storyContext], chatMessages: [...chatMessages] }; // Clone arrays for safety

    // Restore previous state
    setStoryContext(lastState.context); // Restore array
    setChatMessages(lastState.chatMessages);

    // Move current state to redo history
    setRedoHistory(prev => [...prev, currentState]);

    // Remove last state from history
    setHistory(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;

    const nextState = redoHistory[redoHistory.length - 1];
    const currentState: HistoryState = { context: [...storyContext], chatMessages: [...chatMessages] }; // Clone arrays for safety

    // Restore next state
    setStoryContext(nextState.context); // Restore array
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
    // Send on Enter, allow newline with Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
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
      context: storyContext, // Export as array
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
        if (Array.isArray(parsedData.context) && parsedData.context.every((item: unknown) => typeof item === 'string')) {
          // Ask user if they want to clear chat?
          // For now, just replace context
          if (window.confirm("Importing will replace the current context list. Clear chat history as well?")) {
               setChatMessages([]);
               setHistory([]);
               setRedoHistory([]);
          }
          setStoryContext(parsedData.context as string[]); // Set the array
          setImportError(null); // Clear error on success
        } else {
          throw new Error('Invalid file format: \'context\' key must be an array of strings.');
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

  // --- Context Deletion --- 
  const handleDeleteContextItem = (indexToDelete: number) => {
      setRedoHistory([]); // Clear redo history on new action

      // Save current state to history *before* deletion
      const currentState: HistoryState = { context: [...storyContext], chatMessages: [...chatMessages] };
      setHistory(prev => [...prev, currentState]);

      // Update context by removing the item
      setStoryContext(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  // --- Manual Context Addition --- 
  const handleAddManualContext = () => {
    const newItem = manualContextInput.trim();
    if (newItem === "") return; // Don't add empty strings

    const currentContextSet = new Set(storyContext);
    if (currentContextSet.has(newItem)) {
      // Optional: Provide feedback that item already exists?
      console.log("Context item already exists:", newItem);
      setManualContextInput(""); // Clear input even if duplicate
      return;
    }

    // Clear redo history on new action
    setRedoHistory([]);

    // Save current state to history *before* adding new item
    const currentState: HistoryState = { context: [...storyContext], chatMessages: [...chatMessages] };
    setHistory(prev => [...prev, currentState]);

    // Add the new item
    setStoryContext(prev => [...prev, newItem]);

    // Clear the input field
    setManualContextInput("");
  };

  // Handle Enter key for manual context input
  const handleManualContextKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission/newline
      handleAddManualContext();
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-900 flex flex-col h-screen">
      <h1 className="text-3xl font-bold mb-4 text-gray-200 text-center">AI Storyteller Chat</h1>

      {/* Main Content Area - Adjusted to remove side panel structure */}
      <div className="flex flex-1 flex-col gap-4 md:gap-8 overflow-hidden">

        {/* Combined Interface Area */}
        <div className="w-full flex flex-col flex-1 space-y-4 overflow-hidden">
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
          <div className="flex flex-1 gap-4 md:gap-8 overflow-hidden">
              {/* Chat Column */}
              <div className="w-full md:w-2/3 flex flex-col flex-1 space-y-4">
                <div
                   ref={chatContainerRef}
                   className="flex-1 overflow-y-auto p-4 bg-black rounded border border-gray-700 space-y-4"
                   style={{ maxHeight: 'calc(100vh - 350px)' }} // Adjust height dynamically slightly more room
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
                    key={isMac ? 'mac-input' : 'other-input'} // Add key to force re-render on OS change (edge case)
                    ref={inputRef}
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full p-2 border rounded h-24 bg-gray-800 text-gray-200 border-gray-700 placeholder-gray-400"
                    placeholder="Enter your message (Enter to send)"
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

              {/* Context Display Column */} 
              <div className="w-full md:w-1/3 flex flex-col space-y-4 overflow-hidden">
                 {/* Import/Export Buttons */} 
                 <div className="flex-shrink-0 flex gap-4">
                    <button 
                       onClick={handleExport}
                       className="flex-1 bg-green-700 text-white p-2 rounded hover:bg-green-600"
                     >
                       Export Context
                     </button>
                     <button 
                       onClick={handleImportClick}
                       className="flex-1 bg-yellow-600 text-white p-2 rounded hover:bg-yellow-500"
                     >
                       Import Context
                     </button>
                     {/* Hidden file input */}
                     <input 
                        key={Date.now()} // Force re-render to clear value on import
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
                     <div className="flex-1 p-2 bg-black rounded text-white border border-gray-700 overflow-y-auto space-y-2">
                       {storyContext.length === 0 ? (
                         <p className="text-gray-400 italic px-2">*Context is currently empty*</p>
                       ) : (
                         storyContext.map((item, index) => (
                           <div key={index} className="flex items-start justify-between p-2 bg-gray-800 rounded border border-gray-700 group">
                             <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&>p]:my-1 flex-grow mr-2">
                               <ReactMarkdown>{item}</ReactMarkdown>
                             </div>
                             <button
                               onClick={() => handleDeleteContextItem(index)}
                               className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-2 p-1 rounded bg-gray-700 hover:bg-gray-600 flex-shrink-0"
                               title="Delete this context item"
                               disabled={isLoading}
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                             </button>
                           </div>
                         ))
                       )}
                     </div>
                     {/* Manual Context Input Area */} 
                     <div className="flex-shrink-0 flex gap-2 mt-2 p-2 border-t border-gray-700">
                       <input 
                         type="text"
                         value={manualContextInput}
                         onChange={(e) => setManualContextInput(e.target.value)}
                         onKeyDown={handleManualContextKeyDown}
                         className="flex-grow p-2 border rounded bg-gray-800 text-gray-200 border-gray-700 placeholder-gray-400"
                         placeholder="Add context manually..."
                       />
                       <button
                         onClick={handleAddManualContext}
                         disabled={!manualContextInput.trim()}
                         className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Add
                       </button>
                     </div>
                 </div>
              </div>
          </div>
        </div>
      </div>
    </main>
  );
} 