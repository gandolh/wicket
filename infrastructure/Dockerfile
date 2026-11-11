# Wicket's API (Fastify + SQLite): the queue, the calls to Ollama Cloud, the
# records, the sign-in and /metrics.
#
# Build context is the REPO ROOT (one root lockfile covers shared, server and
# web). Multi-stage: the TypeScript compiler and the native build toolchain
# live in build stages and never reach the runtime image. The queue page is a
# static site that the deploy builds and Caddy serves; it is not in this
# image. There is no model here: every call goes to Ollama Cloud.
#
#   docker compose -f infrastructure/docker-compose.yml up wicket-api
#
# ── Why this container runs as root ─────────────────────────────────────────
#
# On the VPS this runs under a ROOTLESS Docker daemon owned by an unprivileged
# account, where the container's uid 0 maps to that account's own uid on the
# host, so "root" here is already a normal unprivileged user out there.
#
# It has to be uid 0 because /data is a BIND MOUNT of the host's data
# directory, which holds the records and the accounts. Under rootless Docker
# only container-root maps back to the owning account; a non-root in-container
# user maps to a subuid the host sees as a stranger, and the service could not
# write its own database.

# ---------------------------------------------------------------------------
# deps: full workspace install, with the toolchain native modules may need
# ---------------------------------------------------------------------------
FROM node:24-alpine AS deps
# better-sqlite3 13 ships Node-API prebuilds including linuxmusl-x64, and that
# prebuilt file is what loads: npm 11 skips its `node-gyp rebuild` install
# script (it warns that the script isn't in allowScripts). The toolchain is a
# fallback for a later npm or lockfile that does run it.
RUN apk add --no-cache python3 make g++
WORKDIR /app
# Manifests first, for layer caching: one root lockfile, one npm ci. Every
# workspace manifest is needed because `npm ci` validates the lockfile against
# every workspace the root package.json declares and bails on a missing one.
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci

# ---------------------------------------------------------------------------
# builder: compile shared and the server (tsc -b → shared/dist, server/dist)
# ---------------------------------------------------------------------------
FROM deps AS builder
COPY shared ./shared
COPY server ./server
# server/tsconfig.json references shared, so this builds both, in order.
RUN npx tsc -b server

# ---------------------------------------------------------------------------
# proddeps: runtime dependencies only, native modules built here
# ---------------------------------------------------------------------------
FROM node:24-alpine AS proddeps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/
# Scoped to the server workspace: the page's React tree is never run here.
RUN npm ci --omit=dev -w @wicket/server --include-workspace-root \
 && mkdir -p shared/node_modules server/node_modules
# Drop native build intermediates and the prebuilds for operating systems this
# image can never be. A BLACKLIST of foreign platforms on purpose:
# better-sqlite3 ships prebuilds as FILES (`prebuilds/linuxmusl-x64.node`), and
# a whitelist of names would delete all of them.
RUN cd node_modules \
 && find . -name '*.o' -delete \
 && find . -type d -name obj.target -prune -exec rm -rf {} + \
 && rm -rf better-sqlite3/deps better-sqlite3/src \
 && find . -type d -name prebuilds -exec sh -c \
      'rm -f "$1"/darwin-*.node "$1"/win32-*.node "$1"/android-*.node' _ {} \;

# ---------------------------------------------------------------------------
# prod: slim runtime: no compiler, no test code, no TypeScript
# ---------------------------------------------------------------------------
FROM node:24-alpine AS prod
LABEL org.opencontainers.image.title="wicket" \
      org.opencontainers.image.description="Wicket API: one queue for every app's LLM calls"
# wget, for the healthcheck below, ships in node:alpine's busybox.
WORKDIR /app
COPY --from=proddeps /app/node_modules ./node_modules
# Today every workspace's dependencies hoist to the root; the mkdir above makes
# these copies safe either way, should a later lockfile nest one.
COPY --from=proddeps /app/shared/node_modules ./shared/node_modules
COPY --from=proddeps /app/server/node_modules ./server/node_modules
COPY package.json ./
# node_modules/@wicket/shared is a symlink to ../shared, so shared must sit at
# /app/shared with its manifest and compiled output.
COPY shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
# The vendored ward-auth library: the server imports it by relative path
# (../vendor/ward/ward-auth.js from dist), so it sits beside dist.
COPY server/vendor ./server/vendor
# tsc compiles src/**/* including the tests and their stub runner. They import
# a runner that --omit=dev never installed, so shipping them is dead weight.
RUN find ./server/dist ./shared/dist \( -name '*.test.js' -o -name '*.test.js.map' -o -name '*.test.d.ts' \
      -o -name 'testing.js' -o -name 'testing.js.map' -o -name 'testing.d.ts' \) -delete
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8808 \
    WICKET_DB=/data/wicket.sqlite
# The records and the accounts. A BIND MOUNT on the VPS, so it survives every
# deploy. No prompt or answer is ever written here.
VOLUME /data
EXPOSE 8808
# Shell form, so it follows the runtime PORT rather than a baked constant.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/v1/health" || exit 1
CMD ["node", "server/dist/server.js"]
