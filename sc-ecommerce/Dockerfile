FROM ghcr.io/foundry-rs/foundry:latest

WORKDIR /app

COPY . .

EXPOSE 8545

ENTRYPOINT ["anvil", "--host", "0.0.0.0", "--port", "8545", "--chain-id", "31337"]
