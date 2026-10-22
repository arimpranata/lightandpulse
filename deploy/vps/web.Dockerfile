# BALI LENS web app (Expo web export) served by Caddy, which also proxies /api
# to the API container and obtains HTTPS certificates automatically.
FROM node:22-alpine AS build
WORKDIR /src/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
RUN npx expo export -p web --output-dir /web

FROM caddy:2.10-alpine
COPY deploy/vps/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /web /srv/web
