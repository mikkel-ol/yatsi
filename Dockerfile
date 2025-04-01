FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm deploy --filter='@mikkel-ol/yatsi-server' --prod /prod/yatsi-server

FROM base AS server
COPY --from=build /prod/yatsi-server /prod/yatsi-server
WORKDIR /prod/yatsi-server
ENTRYPOINT [ "node", "dist" ]
