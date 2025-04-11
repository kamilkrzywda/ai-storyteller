import { useState, useEffect, useCallback } from "react";

export function useAI() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/ollama');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const fetchedModels = await response.json();
        setModels(fetchedModels);
        if (fetchedModels.length > 0) {
          setSelectedModel(fetchedModels[0]); // Select the first model by default
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
        setError("Failed to load models from Ollama.");
      }
    }
    fetchModels();
  }, []);

  const generateResponse = useCallback(async () => {
    if (!selectedModel || !userPrompt) {
      setError("Please select a model and enter a prompt.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse("");

    try {
      const response = await fetch('/api/ollama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          systemPrompt,
          userPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();
      setResponse(data.response);
    } catch (err) {
      console.error("Failed to generate response:", err);
      setError("Failed to generate response from Ollama.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, systemPrompt, userPrompt]);

  return {
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
  };
}
