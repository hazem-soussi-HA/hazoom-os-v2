FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8888
HEALTHCHECK --interval=30s --timeout=3s CMD node health.js
CMD ["node", "server.js"]
