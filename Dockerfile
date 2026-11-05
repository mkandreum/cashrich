# Compila el cliente React y el servidor
FROM node:22-alpine AS builder
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm test && npm run build
RUN npm prune --omit=dev

# Imagen final, solo con lo necesario
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
# El volumen hereda este dueño la primera vez que se crea
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/server.cjs"]
