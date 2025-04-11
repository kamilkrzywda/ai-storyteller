import { NextResponse } from "next/server";
import { OllamaService } from "@/app/services/ollama";

const ollamaService = new OllamaService();

/**
 * Interface for the POST request body parameters
 */
interface OllamaRequest {
  /** The model name to use for generation (e.g., "llama2", "mistral"). If omitted, defaults to the OLLAMA_MODEL environment variable or 'cogito:8b'. */
  model?: string;
  /** The system prompt that sets the context or behavior for the model */
  systemPrompt?: string;
  /** The user's input prompt for the model */
  userPrompt: string;
  format?: string;
}

export async function GET() {
  try {
    const models = await ollamaService.listModels();
    return NextResponse.json(models);
  } catch (error) {
    console.error("Error listing models:", error);
    return NextResponse.json(
      { error: "Failed to list models" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { model: reqModel, systemPrompt, userPrompt, format } = await request.json() as OllamaRequest;
    
    // Determine the model to use: Request body > Environment Variable > Default
    const model = reqModel || process.env.OLLAMA_MODEL || 'cogito:8b';

    if (format) {
      // Handle structured output request
      const response = await ollamaService.generateStructuredResponse(model, userPrompt, format, systemPrompt);
      return NextResponse.json({ response });
    } else {
      // Handle regular response request
      const response = await ollamaService.generateResponse(model, userPrompt, systemPrompt);
      return NextResponse.json({ response });
    }
  } catch (error) {
    console.error("Error generating response:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
