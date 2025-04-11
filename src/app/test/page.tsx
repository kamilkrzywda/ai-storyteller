"use client";

import { useAI } from "../hooks/useAI";

export default function Test() {
  const {
    models,
    selectedModel,
    setSelectedModel,
    systemPrompt,
    setSystemPrompt,
    userPrompt,
    setUserPrompt,
    response,
    isLoading,
    error,
    generateResponse,
  } = useAI();

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Ollama Chat Interface - Test Page</h1>

      <div className="space-y-6">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {models.map((model: string) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium mb-2">
            System Prompt (Optional)
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full p-2 border rounded h-24"
            placeholder="Enter system prompt (optional)"
          />
        </div>

        {/* User Prompt */}
        <div>
          <label className="block text-sm font-medium mb-2">Your Prompt</label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="w-full p-2 border rounded h-24"
            placeholder="Enter your prompt here"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={generateResponse}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? "Generating..." : "Generate Response"}
        </button>

        {/* Error Message */}
        {error && (
          <div className="text-red-500 p-2 border border-red-500 rounded">
            {error}
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Response:</h2>
            <div className="p-4 bg-gray-100 rounded whitespace-pre-wrap text-gray-900">
              {response}
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 