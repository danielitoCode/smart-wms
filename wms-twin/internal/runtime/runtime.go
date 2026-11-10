package runtime

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/yecharlot/PrismaTec-Core/api/aip"
	"github.com/yecharlot/PrismaTec-Core/core"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/httpapi"
)

type Config struct {
	DataDir       string
	NodeName      string
	NetworkAddr   string
	TransportKind string
	HTTPAddr      string
	AIPAddr       string
	APIToken      string
}

func ConfigFromEnv() Config {
	home, _ := os.UserHomeDir()
	dataDir := os.Getenv("WMS_TWIN_DATA_DIR")
	if dataDir == "" {
		dataDir = filepath.Join(home, ".local", "share", "smart-wms-twin")
	}
	nodeName := strings.TrimSpace(os.Getenv("WMS_TWIN_NODE_NAME"))
	if nodeName == "" {
		nodeName = "smart-wms-twin"
	}
	httpAddr := strings.TrimSpace(os.Getenv("WMS_TWIN_HTTP_ADDR"))
	if httpAddr == "" {
		httpAddr = ":5001"
	}
	aipAddr := strings.TrimSpace(os.Getenv("WMS_TWIN_AIP_ADDR"))
	if aipAddr == "" {
		aipAddr = ":8081"
	}
	return Config{
		DataDir: dataDir, NodeName: nodeName,
		NetworkAddr: strings.TrimSpace(os.Getenv("PRISMATEC_NETWORK_ADDR")),
		TransportKind: strings.TrimSpace(os.Getenv("PRISMATEC_TRANSPORT")),
		HTTPAddr: httpAddr, AIPAddr: aipAddr,
		APIToken: os.Getenv("WMS_TWIN_API_TOKEN"),
	}
}

type Runtime struct {
	node       *core.Node
	cancel     context.CancelFunc
	handler    http.Handler
	aipHandler http.Handler
}

func New(cfg Config) (*Runtime, error) {
	if cfg.DataDir == "" {
		return nil, fmt.Errorf("WMS_TWIN_DATA_DIR or a non-empty data directory is required")
	}
	if cfg.NodeName == "" {
		return nil, fmt.Errorf("node name is required")
	}
	if err := os.MkdirAll(cfg.DataDir, 0700); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}

	node, err := core.NewNode(core.Config{
		DataDir: cfg.DataDir, Name: cfg.NodeName,
		NetworkAddr: cfg.NetworkAddr, TransportKind: cfg.TransportKind,
	})
	if err != nil {
		return nil, fmt.Errorf("create PrismaTec node: %w", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	if err := node.Start(ctx); err != nil {
		cancel()
		return nil, fmt.Errorf("start PrismaTec node: %w", err)
	}

	store := corestore.New(node.Organisms())
	apiServer := httpapi.New(node, store, cfg.APIToken)
	aipServer := &aip.Server{Node: node, Addr: cfg.AIPAddr}

	return &Runtime{
		node: node, cancel: cancel,
		handler: apiServer.Handler(), aipHandler: aipServer.Handler(),
	}, nil
}

func (r *Runtime) Handler() http.Handler    { return r.handler }
func (r *Runtime) AIPHandler() http.Handler { return r.aipHandler }
func (r *Runtime) Node() *core.Node         { return r.node }

func (r *Runtime) Close() {
	if r.cancel != nil {
		r.cancel()
	}
	if r.node != nil {
		_ = r.node.Stop()
	}
}
