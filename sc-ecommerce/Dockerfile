FROM ghcr.io/foundry-rs/foundry:latest

USER root
WORKDIR /app
COPY . .
RUN chmod +x /app/entrypoint.sh

EXPOSE 8545 8080

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
