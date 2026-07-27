FROM node:20-alpine AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app/apps/web
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/apps/web
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./.next/static
COPY --from=build /app/apps/web/public ./public
EXPOSE 3100
ENV PORT=3100
CMD ["node", "server.js"]
