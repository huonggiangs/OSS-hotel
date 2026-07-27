FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
RUN npm install

FROM deps AS build
COPY apps/api ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/package.json ./package.json
EXPOSE 4100
CMD ["node", "dist/index.js"]
