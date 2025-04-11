# AI Storyteller

This is an interactive storytelling application powered by an AI agent. The AI guides a narrative collaboratively with you through conversation.

## How it Works

The core of the application is an AI Storyteller Agent designed to:

1.  **Engage in Conversation:** The AI responds directly to your messages, interprets them in the context of the ongoing story, asks clarifying questions, and suggests potential plot points or character actions for the next step in the narrative.
2.  **Maintain Consistency:** It keeps track of the story details and context established so far.
3.  **Generate Structured Output:** The AI provides its responses in a JSON format with three fields:
    *   `response`: Contains the AI's direct conversational reply, including questions and suggestions for you. This field is *always* present.
    *   `context`: Stores key background information, character details, locations, or rules relevant to the story.
    *   `story`: Contains the actual narrative prose (dialogue, action, description).

## Important Interaction Rules: Context and Story Fields

The AI manages the `context` and `story` fields based on very specific rules:

*   **Explicit Instructions Required:** The AI will **ONLY** add information to the `context` or `story` fields if you **explicitly** ask it to.
    *   **For Context:** Use phrases like:
        *   "Add [information] to the context."
        *   "Update the context with [details]."
        *   "Remember that [fact] is true."
        *   "Make a note of [item] in the context."
    *   **For Story:** Use phrases like:
        *   "Continue the story."
        *   "Write the next part."
        *   "Describe what happens next."
        *   "Add this scene to the story."
*   **General Discussion is Not Enough:** Simply talking about events, characters, or details in the conversation **does not** automatically update the `context` or `story`. You must follow up with an explicit command if you want the information recorded.
*   **Appending Only:** When you instruct the AI to update `context` or `story`, it will *append* the new information. It will not replace or modify existing content in those fields unless specifically instructed in a way that implies modification (which is generally discouraged by the base prompt).
*   **Independence:** Updating the `context` does not automatically update the `story`, and vice-versa, unless you explicitly ask for both.

By default, the AI will only use the `response` field for conversation. Stick to the explicit commands when you want to formally add to the story's background (context) or narrative (story).

## Getting Started (Development)

This is a [Next.js](https://nextjs.org) project.

1.  **Install dependencies:**
    ```bash
    bun install
    ```
2.  **Run the development server:**
    ```bash
    bun dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Building and Running with Docker

A `Dockerfile` is provided to build and run the application in a container:

### Building Locally

1.  **Build the image:**
    ```bash
    docker build -t storyteller-app .
    ```
2.  **Run the container (remember to set `OLLAMA_HOST` and optionally `OLLAMA_MODEL`):**
    ```bash
    docker run -d -p 3000:3000 \
      -e OLLAMA_HOST=<your_ollama_url> \
      -e OLLAMA_MODEL=<model_name> `# Optional, defaults to cogito:8b` \
      --name storyteller-instance storyteller-app
    ```

### Using the Pre-built Image

Alternatively, you can use the pre-built image available on GitHub Container Registry:

Pull the image:
```bash
docker pull ghcr.io/kamilkrzywda/ai-storyteller:latest
```

Run the container (remember to set `OLLAMA_HOST` and optionally `OLLAMA_MODEL`):
```bash
docker run -d -p 3000:3000 \
  -e OLLAMA_HOST=<your_ollama_url> \
  -e OLLAMA_MODEL=<model_name> `# Optional, defaults to cogito:8b` \
  --name storyteller-instance ghcr.io/kamilkrzywda/ai-storyteller:latest
```

### Important: Environment Variables

#### `OLLAMA_HOST` (Required)

The application needs to connect to an Ollama instance to function. You **must** set the `OLLAMA_HOST` environment variable when running the container. This variable should contain the URL of your Ollama server.

**Example:** `http://localhost:11434`

#### `OLLAMA_MODEL` (Optional)

This variable specifies which Ollama model the AI agent should use.

*   **Default:** `cogito:8b`
*   You can override this by setting the environment variable when running the container.

**Example:** To use `llama3:latest` instead of the default:

```bash
# Using locally built image
docker run -d -p 3000:3000 \
  -e OLLAMA_HOST=http://localhost:11434 \
  -e OLLAMA_MODEL=llama3:latest \
  --name storyteller-instance storyteller-app

# Using pre-built image
docker run -d -p 3000:3000 \
  -e OLLAMA_HOST=http://localhost:11434 \
  -e OLLAMA_MODEL=llama3:latest \
  --name storyteller-instance ghcr.io/kamilkrzywda/ai-storyteller:latest
```

The application will be accessible at [http://localhost:3000](http://localhost:3000) (or your server's IP address if not running locally).
