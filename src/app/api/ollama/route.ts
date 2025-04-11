import { NextResponse } from "next/server";
import { OllamaService } from "@/app/ollama.service";

const ollamaService = new OllamaService();

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
    const { model, prompt } = await request.json();
    const response = await ollamaService.generateResponse(model, prompt);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error generating response:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
