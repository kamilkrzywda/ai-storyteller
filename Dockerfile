# Stage 1: Build the application
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package.json and bun.lockb
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN bun run build

# Stage 2: Create the final production image
FROM oven/bun:1-alpine

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV OLLAMA_HOST=http://192.168.1.100:11434

# Copy necessary files from the builder stage
# Copy node_modules, package.json, bun.lockb for runtime dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/bun.lockb* ./
# Copy the build output (assuming Next.js default .next directory)
COPY --from=builder /app/.next ./.next
# Copy public assets (if any)
COPY --from=builder /app/public ./public

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["bun", "run", "start"] 