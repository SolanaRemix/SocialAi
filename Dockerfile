FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY node/package.json ./node/
COPY workers/package.json ./workers/ 2>/dev/null || true
COPY apps/*/package.json ./apps/ 2>/dev/null || true

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]
