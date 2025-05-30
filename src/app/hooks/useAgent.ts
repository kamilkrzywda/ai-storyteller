import { useState, useEffect, useCallback } from "react";
import { OllamaFormat } from "../types/ollama";

export function useAgent(systemPrompt: string = "") {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("cogito:8b");
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
  }, [selectedModel, userPrompt, systemPrompt]);

  const generateStructuredResponse = useCallback(async (
    format: OllamaFormat,
    prompt: string = userPrompt,
    systemPromptOverride: string = systemPrompt
  ): Promise<string | null> => {
    if (!selectedModel || !prompt) {
      setError("Please select a model and enter a prompt.");
      return null;
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
          systemPrompt: systemPromptOverride,
          userPrompt: prompt,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate structured response');
      }

      const data = await response.json();
      setResponse(data.response);
      return data.response;
    } catch (err) {
      console.error("Failed to generate structured response:", err);
      setError("Failed to generate structured response from Ollama.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, userPrompt, systemPrompt]);

  return {
    models,
    selectedModel,
    setSelectedModel,
    userPrompt,
    setUserPrompt,
    response,
    isLoading,
    error,
    generateResponse,
    generateStructuredResponse,
  };
} 