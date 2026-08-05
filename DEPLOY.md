# Deploying (Docker / Coolify)

The app ships as a Docker image built from the `Dockerfile` at the repo root
(multi-stage: node 20.13.1 build → slim runtime running the Next.js
`standalone` server on port 3000). Coolify can build it straight from the
repo; TLS and the public hostname are handled by the Coolify proxy.

```sh
docker build -t etn-ens-app .
docker run -p 3000:3000 etn-ens-app
```

## Build-time vs run-time configuration

**Every `NEXT_PUBLIC_*` value is inlined into the client JavaScript bundle
when `next build` runs inside the image build.** Changing any of them
requires rebuilding the image and redeploying — flipping an env var on the
running container has no effect.

Production defaults are committed in `.env.production` (loaded automatically
by `next build`):

| Variable | Production value | Purpose |
| -------- | ---------------- | ------- |
| `NEXT_PUBLIC_CHAIN_NAME` | `electroneum` | selects the chain config |
| `NEXT_PUBLIC_ETN_NETWORK` | `mainnet` | mainnet vs testnet |
| `NEXT_PUBLIC_ETN_MAINNET_RPC_URL` | `https://rpc.electroneum.com` | JSON-RPC (browser-side; browsers always send a User-Agent, which this proxy requires) |
| `NEXT_PUBLIC_ETN_MAINNET_DEPLOYMENT_ADDRESSES` | (JSON) | ENS contract addresses |
| `NEXT_PUBLIC_ETN_MAINNET_SUBGRAPH_URL` | `https://subgraph.electroneum.com/subgraphs/name/etn-subgraph` | ENS subgraph |
| `NEXT_PUBLIC_METADATA_ENDPOINT` | `https://ens-metadata.electroneum.com` | avatar/header images + NFT metadata (ens-metadata-service fork) |

Optional features (WalletConnect, Para, PostHog, Intercom) stay disabled
unless their keys are supplied.

## Overriding at image build time

The Dockerfile declares a `docker build --build-arg` for each overridable
`NEXT_PUBLIC_*` value (same names as above plus `NEXT_PUBLIC_WC_PROJECT_ID`,
`NEXT_PUBLIC_PARA_API_KEY_PROD`, `NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_INTERCOM_ID`). A passed arg wins
over `.env.production`; an unpassed arg is absent from the build environment
and cannot shadow the committed default. In Coolify, mark such variables as
"Build Variable" so they reach the image build.

## Runtime RPC override (no rebuild)

As an ops escape hatch, `NEXT_PUBLIC_ETN_MAINNET_RPC_URL` can ALSO be set as
a plain runtime env var on the container: `docker-entrypoint.sh` rewrites the
baked RPC URL across the compiled bundles at startup. Restart the container
after changing it. Caveat: browsers that already cached the immutable
`/_next/static` chunks keep the old RPC until a real rebuild rotates the
chunk hashes — use it for incidents, and follow up with a rebuild.

(The companion ens-metadata-service reads its RPC from the `NODE_PROVIDER_URL`
env var at request time, so there a plain env change + restart is always
enough.)

## Notes

- `next.config.mjs#generateBuildId` runs `git rev-parse HEAD`, so the build
  context must include `.git` (Coolify's git-clone builds do). The build id
  also busts the client-side persisted react-query cache on each deploy.
- The local-dev `.env` file is untracked and excluded by `.dockerignore`;
  it never reaches the image.
- Image optimization runs without `sharp` (Next falls back to its bundled
  squoosh); install `sharp` later if avatar-heavy pages need faster
  `next/image` processing.
