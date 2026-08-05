# Build stage.
# node:20 (non-slim) provides git — required by generateBuildId in
# next.config.mjs — plus the toolchain for native deps. Version tracks .nvmrc.
FROM node:20.13.1-bookworm AS build

WORKDIR /app
# pnpm pinned to package.json's packageManager version; installed via npm
# because this node version's bundled corepack ships stale npm signing keys
RUN npm install -g pnpm@10.23.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY . .

# Optional build-time overrides for values baked into the client bundle.
# Defaults live in .env.production; a build arg of the same name wins
# (process.env takes precedence over .env files in Next.js). Declared via
# ARG only — an arg that isn't passed stays absent from the build env, so it
# cannot shadow the .env.production default with an empty string.
ARG NEXT_PUBLIC_CHAIN_NAME
ARG NEXT_PUBLIC_ETN_NETWORK
ARG NEXT_PUBLIC_ETN_MAINNET_DEPLOYMENT_ADDRESSES
ARG NEXT_PUBLIC_METADATA_ENDPOINT
ARG NEXT_PUBLIC_ETN_MAINNET_RPC_URL
ARG NEXT_PUBLIC_ETN_MAINNET_SUBGRAPH_URL
ARG NEXT_PUBLIC_WC_PROJECT_ID
ARG NEXT_PUBLIC_PARA_API_KEY_PROD
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_INTERCOM_ID

# Commit SHA for generateBuildId — Coolify/CI contexts have no .git;
# builders that provide SOURCE_COMMIT get a stable, meaningful build id
ARG SOURCE_COMMIT

RUN NODE_OPTIONS=--max-old-space-size=6144 pnpm build

# Record the RPC URL that actually got baked (build arg wins over
# .env.production) so the runtime entrypoint can substitute it if overridden.
RUN echo "${NEXT_PUBLIC_ETN_MAINNET_RPC_URL:-$(grep '^NEXT_PUBLIC_ETN_MAINNET_RPC_URL=' .env.production | cut -d= -f2-)}" \
      > .next/standalone/.baked-rpc-url

# Runtime stage
FROM node:20.13.1-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --chmod=755 docker-entrypoint.sh /app/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
