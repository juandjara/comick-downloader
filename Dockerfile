FROM node:20.2.0-alpine3.18 as base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM deps AS prod-deps
WORKDIR /app
RUN npm i --production

FROM base as runner
WORKDIR /app 
COPY --from=prod-deps /app/package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

ENTRYPOINT [ "node", "node_modules/.bin/remix-serve", "build/index.js"] 
