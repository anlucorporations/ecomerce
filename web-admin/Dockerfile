FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
# NEXT_PUBLIC_* se sustituyen en build (no en runtime): valores por defecto = entorno GCP (mcc-ecommerce)
# Sobrescribibles via --build-arg (p.ej. para entornos locales)
ARG NEXT_PUBLIC_RPC_URL=https://mcc-foundry-anvil-1095249147821.europe-west1.run.app
ARG NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
ARG NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=$NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS \
    NEXT_PUBLIC_EURO_TOKEN_ADDRESS=$NEXT_PUBLIC_EURO_TOKEN_ADDRESS \
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY=$NEXT_PUBLIC_STRIPE_PUBLIC_KEY
RUN npx next build --no-lint

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 8080
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["npm", "start"]
