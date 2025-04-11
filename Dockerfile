# Use an official Bun runtime as a parent image
FROM oven/bun:1-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and bun.lockb (if it exists)
COPY package.json bun.lockb* ./

# Install project dependencies using bun
RUN bun install --frozen-lockfile

# Copy the rest of the application code into the container
COPY . .

# Build the application (if necessary, e.g., for Next.js) using bun
RUN bun run build

# Set environment variables
ENV NODE_ENV=production
ENV OLLAMA_HOST=http://192.168.1.100:11434

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application using bun
CMD ["bun", "run", "start"] 