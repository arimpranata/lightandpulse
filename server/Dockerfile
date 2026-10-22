# BALI LENS API. Build from the repository root (the API shares app/src/domain):
#   docker build -f server/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /src/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY app/src /src/app/src
COPY server/ ./
RUN npm run typecheck && npm run build

FROM node:22-alpine
WORKDIR /srv
ENV NODE_ENV=production PORT=3000
COPY --from=build /src/server/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/server.js"]
