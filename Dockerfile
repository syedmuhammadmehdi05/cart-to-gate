FROM node:18-alpine

WORKDIR /app

# Copy backend package files first (for better caching)
COPY backend/package*.json backend/
RUN cd backend && npm install

# Copy everything else (including frontend and backend source)
COPY . .

# Expose the port your backend uses
EXPOSE 5000

# Start the backend server
CMD ["node", "backend/server.js"]