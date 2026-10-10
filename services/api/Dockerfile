# syntax=docker/dockerfile:1.7
# Build from the repository root:  docker build -f services/api/Dockerfile -t poultrypilot-api .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY services/api ./services/api
RUN pnpm install --frozen-lockfile --filter @poultrypilot/api...
RUN pnpm --filter @poultrypilot/api build \
 && pnpm --filter @poultrypilot/api deploy --prod /out \
 && cp -r services/api/dist /out/dist

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:4000/api/v1/health/live || exit 1
CMD ["node", "--enable-source-maps", "dist/server.js"]
