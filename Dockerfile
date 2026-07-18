FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:dcea25a6593307a74b09e59a47f8695c4d56943750e45add532ae0bf8b24bfd6 AS runtime

ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="Tetracromia" \
      org.opencontainers.image.description="A browser-based color discrimination lab" \
      org.opencontainers.image.source="https://github.com/Ponchia/tetracromia" \
      org.opencontainers.image.revision="${VCS_REF}"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=101:101 /app/dist/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
