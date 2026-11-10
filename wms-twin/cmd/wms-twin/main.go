package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/runtime"
)

func main() {
	cfg := runtime.ConfigFromEnv()
	app, err := runtime.New(cfg)
	if err != nil {
		log.Fatalf("initialize WMS twin: %v", err)
	}
	defer app.Close()

	servers := []*http.Server{
		{Addr: cfg.HTTPAddr, Handler: app.Handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second},
		{Addr: cfg.AIPAddr, Handler: app.AIPHandler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second},
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	errCh := make(chan error, len(servers))
	for _, server := range servers {
		srv := server
		go func() {
			log.Printf("WMS twin endpoint listening on %s", srv.Addr)
			errCh <- srv.ListenAndServe()
		}()
	}

	select {
	case <-ctx.Done():
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("HTTP server stopped: %v", err)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	for _, server := range servers {
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("HTTP shutdown: %v", err)
		}
	}
}
