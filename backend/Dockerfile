FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/casino-server ./cmd/server

FROM alpine:3.20

WORKDIR /app

RUN adduser -D -h /app appuser

COPY --from=builder /out/casino-server ./casino-server

USER appuser

EXPOSE 8011 8012

CMD ["./casino-server"]
