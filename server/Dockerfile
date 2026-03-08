# 1. Use a lightweight, secure Alpine Linux base image
FROM node:18-alpine

# 2. Set the environment to production (This makes Express 3x faster!)
ENV NODE_ENV=production

# 3. Create the app directory and hand ownership to the 'node' user immediately
RUN mkdir /app && chown -R node:node /app
WORKDIR /app

# 4. Switch to the unprivileged 'node' user BEFORE copying files
USER node

# 5. Copy ONLY package files first to leverage Docker layer caching
COPY --chown=node:node package*.json ./

# 6. Use 'npm ci' for a strict, clean, and predictable production installation
RUN npm ci --only=production

# 7. Copy the rest of your backend source code
COPY --chown=node:node . .

# 8. Expose the port your Express server listens on (change if you use something other than 3000)
EXPOSE 3008

# 9. Use the direct node command to start the server, ensuring graceful shutdowns
CMD ["node", "server.js"]