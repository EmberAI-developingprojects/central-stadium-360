FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile --prod=false
COPY shared/ ./shared/
COPY backend/ ./backend/
RUN pnpm --filter shared build || echo "shared has no build step"

FROM node:20-alpine
WORKDIR /app
RUN npm install -g tsx@4.19.2
COPY --from=builder /app /app
WORKDIR /app/backend
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
CMD ["tsx", "src/dev.ts"]

