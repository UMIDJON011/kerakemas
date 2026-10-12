FROM node:20-alpine AS web
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server .
COPY --from=web /app/client/dist /app/client/dist
COPY data /app/data
ENV PORT=5000 DB_PATH=/data/cefr.db
EXPOSE 5000
CMD ["sh", "-c", "node seed.js && node index.js"]
