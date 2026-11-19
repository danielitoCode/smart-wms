# WMS twin (PrismaTec-Core) for Render
FROM golang:1.25-bookworm AS build
WORKDIR /src

# Private module: github.com/yecharlot/PrismaTec-Core
ARG GITHUB_TOKEN
ENV GOPRIVATE=github.com/yecharlot/*,github.com/danielitoCode/*
ENV GONOSUMDB=github.com/yecharlot/*,github.com/danielitoCode/*
RUN if [ -n "$GITHUB_TOKEN" ]; then \
      git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"; \
    fi

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/wms-twin ./cmd/wms-twin

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/wms-twin /app/wms-twin
RUN mkdir -p /data
ENV WMS_TWIN_DATA_DIR=/data
ENV WMS_TWIN_HTTP_ADDR=:10000
ENV WMS_TWIN_AIP_ADDR=:8081
ENV WMS_TWIN_HEALTH_SERVICE=sentry-wms
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-10000}/api/health" || exit 1
ENTRYPOINT ["/app/wms-twin"]
