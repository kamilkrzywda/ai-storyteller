# AI Storyteller

This is an interactive storytelling application powered by an AI agent. The AI guides a narrative collaboratively with you through conversation, automatically capturing key context.

## How it Works

The core of the application is an AI Storyteller Agent designed to:

1.  **Engage in Conversation:** The AI responds directly to your messages (`response` field), interprets them in the context of the ongoing interaction, asks clarifying questions, and suggests potential developments or actions.
2.  **Automatically Capture Context:** The AI constantly analyzes your messages and extracts **all** mentioned factual details, descriptions, character notes, locations, decisions, intentions, etc., adding them to a running context list (`context` field).
3.  **Generate Structured Output:** The AI provides its responses in a JSON format with two main fields:
    *   `response`: Contains the AI's direct conversational reply, including questions and suggestions for you. This field is *always* present.
    *   `context`: Contains **new** context items identified in your latest message, provided as a newline-separated string. The application splits this string and adds each line as a separate item to the context list displayed in the UI.

## Context Management

The Context panel displays a list of all information the agent has captured from your messages.

*   **Automatic Updates:** The agent is strictly instructed to capture **ALL new information** provided in your latest message. Every detail, fact, decision, or description you state WILL be extracted and added as one or more new items to the context list on the agent's next turn.
*   **Append-Only (Agent Side):** The agent only provides *new* information in the `context` field. It checks the existing context (provided in its input) and avoids repeating items.
*   **Explicit Keywords:** While not strictly required anymore, using phrases like "remember that...", "save that...", "add that...", or "make a note of..." will strongly signal to the agent that the following information should definitely be added to the context.
*   **User Deletion:** You can manually remove any item from the context list by clicking the trash icon next to it. This action is recorded in the undo history.
*   **Import/Export:** You can export the current context list to a JSON file and import a previously saved list, replacing the current one.

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
