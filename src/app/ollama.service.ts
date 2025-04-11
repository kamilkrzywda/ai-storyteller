import { Message, Ollama } from "ollama";

export class OllamaService {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || "http://localhost:11434",
    });
  }

  async listModels(): Promise<string[]> {
    const models = await this.ollama.list();
    return models.models.map((model) => model.name);
  }

  async generateResponse(model: string, userPrompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.ollama.generate({
      model,
      prompt: userPrompt,
      system: systemPrompt,
    });
    return response.response;
  }

  async streamResponse(
    model: string,
    prompt: string
  ): Promise<AsyncIterableIterator<string>> {
    const messages: Message[] = [{ role: "user", content: prompt }];
    const response = await this.ollama.chat({
      model,
      messages,
      stream: true,
    });

    // Yield each message content chunk
    async function* generate() {
      for await (const part of response) {
        yield part.message.content;
      }
    }

    return generate();
  }
} 