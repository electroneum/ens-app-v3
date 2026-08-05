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
ARG NEXT_PUBLIC_METADATA_ENDPOINT
ARG NEXT_PUBLIC_ETN_MAINNET_RPC_URL
ARG NEXT_PUBLIC_ETN_MAINNET_SUBGRAPH_URL
ARG NEXT_PUBLIC_WC_PROJECT_ID
ARG NEXT_PUBLIC_PARA_API_KEY_PROD
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_INTERCOM_ID

RUN NODE_OPTIONS=--max-old-space-size=6144 pnpm build

# Runtime stage
FROM node:20.13.1-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
