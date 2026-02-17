FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY node/package.json ./node/

# Copy workspace package files if they exist
RUN mkdir -p ./workers ./apps
COPY workers/package.json ./workers/ || true
COPY apps/*/package.json ./apps/ || true

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]
