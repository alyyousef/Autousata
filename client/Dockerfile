# ==========================================
# STAGE 1: The Builder (Node.js)
# ==========================================
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies purely (Bret's good default!)
COPY package*.json ./
RUN npm ci

# Copy the rest of the React/Vite code
COPY . .

# Build the project (Vite compiles everything into a 'dist' folder)
RUN npm run build

# ==========================================
# STAGE 2: The Production Server (Nginx)
# ==========================================
# We completely throw away the heavy Node image and use a tiny Nginx web server
FROM nginx:alpine

# Copy ONLY the compiled static files from Stage 1 into Nginx's serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (standard HTTP port)
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]