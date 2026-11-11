package runtime

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/identity"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/httpapi"
	wmsreplication "github.com/danielitoCode/smart-wms/wms-twin/internal/replication"
	"github.com/yecharlot/PrismaTec-Core/api/aip"
	"github.com/yecharlot/PrismaTec-Core/core"
	"github.com/yecharlot/PrismaTec-Core/network"
)

type Config struct {
	DataDir, NodeName, NetworkAddr, TransportKind string
	Peers                                         map[string]string
	HTTPAddr, AIPAddr, APIToken                   string
	JWTSecret, BootstrapUsersFile                 string
	MaxLoginAttempts                              int
	LoginLockout                                  time.Duration
	RequirePacking                                bool
}

func ConfigFromEnv() Config {
	home, _ := os.UserHomeDir()
	dataDir := os.Getenv("WMS_TWIN_DATA_DIR")
	if dataDir == "" {
		dataDir = filepath.Join(home, ".local", "share", "smart-wms-twin")
	}
	name := strings.TrimSpace(os.Getenv("WMS_TWIN_NODE_NAME"))
	if name == "" {
		name = "smart-wms-twin"
	}
	httpAddr := strings.TrimSpace(os.Getenv("WMS_TWIN_HTTP_ADDR"))
	if httpAddr == "" {
		httpAddr = ":5001"
	}
	aipAddr := strings.TrimSpace(os.Getenv("WMS_TWIN_AIP_ADDR"))
	if aipAddr == "" {
		aipAddr = ":8081"
	}
	lockoutMinutes := envPositiveInt("WMS_TWIN_LOGIN_LOCKOUT_MINUTES", 15)
	requirePacking := strings.ToLower(strings.TrimSpace(os.Getenv("WMS_TWIN_REQUIRE_PACKING"))) != "false"
	return Config{
		DataDir: dataDir, NodeName: name,
		NetworkAddr:   strings.TrimSpace(os.Getenv("PRISMATEC_NETWORK_ADDR")),
		TransportKind: strings.TrimSpace(os.Getenv("PRISMATEC_TRANSPORT")),
		Peers:         network.ParsePeersEnv(os.Getenv("PRISMATEC_PEERS")),
		HTTPAddr:      httpAddr, AIPAddr: aipAddr, APIToken: os.Getenv("WMS_TWIN_API_TOKEN"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		BootstrapUsersFile: strings.TrimSpace(os.Getenv("WMS_TWIN_BOOTSTRAP_USERS_FILE")),
		MaxLoginAttempts:   envPositiveInt("WMS_TWIN_MAX_LOGIN_ATTEMPTS", 5),
		LoginLockout:       time.Duration(lockoutMinutes) * time.Minute,
		RequirePacking:     requirePacking,
	}
}

func envPositiveInt(key string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key)))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

type Runtime struct {
	node                *core.Node
	cancel              context.CancelFunc
	handler, aipHandler http.Handler
}

func New(cfg Config) (*Runtime, error) {
	if cfg.DataDir == "" {
		return nil, fmt.Errorf("WMS_TWIN_DATA_DIR or a non-empty data directory is required")
	}
	if cfg.NodeName == "" {
		return nil, fmt.Errorf("node name is required")
	}
	if len(cfg.Peers) > 0 && cfg.NetworkAddr == "" {
		return nil, fmt.Errorf("PRISMATEC_NETWORK_ADDR is required when PRISMATEC_PEERS is configured")
	}
	if err := os.MkdirAll(cfg.DataDir, 0700); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}
	node, err := core.NewNode(core.Config{DataDir: cfg.DataDir, Name: cfg.NodeName, NetworkAddr: cfg.NetworkAddr, TransportKind: cfg.TransportKind, Peers: cfg.Peers})
	if err != nil {
		return nil, fmt.Errorf("create PrismaTec node: %w", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	if err := node.Start(ctx); err != nil {
		cancel()
		return nil, fmt.Errorf("start PrismaTec node: %w", err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	if len(cfg.Peers) > 0 {
		rep, err := wmsreplication.New(node, node.Transport(), cfg.Peers)
		if err != nil {
			cancel()
			_ = node.Stop()
			return nil, fmt.Errorf("initialize authenticated WMS replication: %w", err)
		}
		store.SetReplicator(rep)
	}
	users := identity.New(store)
	if cfg.BootstrapUsersFile != "" {
		info, err := os.Stat(cfg.BootstrapUsersFile)
		if err != nil {
			cancel()
			_ = node.Stop()
			return nil, fmt.Errorf("stat identity export: %w", err)
		}
		if err := identity.ValidateExportFileMode(uint32(info.Mode().Perm())); err != nil {
			cancel()
			_ = node.Stop()
			return nil, err
		}
		data, err := os.ReadFile(cfg.BootstrapUsersFile)
		if err != nil {
			cancel()
			_ = node.Stop()
			return nil, fmt.Errorf("read identity export: %w", err)
		}
		if err := users.ImportJSON(data); err != nil {
			cancel()
			_ = node.Stop()
			return nil, fmt.Errorf("bootstrap Core identities: %w", err)
		}
	}
	// Laboratorio: si no hay usuarios, siembra operator/admin para demos del equipo.
	// No sustituye un import real de producción; solo evita login vacío en local.
	if list, err := users.List(); err == nil && len(list) == 0 {
		if _, err := users.CreateWithPassword(identity.User{
			Username: "operator", FullName: "Demo Operator", Role: "ADMIN", IsActive: true,
		}, "Operator123"); err != nil {
			cancel()
			_ = node.Stop()
			return nil, fmt.Errorf("seed demo operator: %w", err)
		}
		if _, err := users.CreateWithPassword(identity.User{
			Username: "admin", FullName: "Demo Admin", Role: "ADMIN", IsActive: true,
		}, "Admin1234"); err != nil {
			cancel()
			_ = node.Stop()
			return nil, fmt.Errorf("seed demo admin: %w", err)
		}
	}
	jwtSecret := strings.TrimSpace(cfg.JWTSecret)
	if len(jwtSecret) < 32 {
		// Solo laboratorio: secret determinista documentado (NO usar en producción).
		jwtSecret = "wms-twin-lab-jwt-secret-min-32-bytes!!"
	}
	apiServer := httpapi.NewWithIdentity(node, store, cfg.APIToken, users, []byte(jwtSecret), cfg.MaxLoginAttempts, cfg.LoginLockout, cfg.RequirePacking)
	apiServer.StartBackground(ctx)
	aipServer := &aip.Server{Node: node, Addr: cfg.AIPAddr}
	return &Runtime{node: node, cancel: cancel, handler: apiServer.Handler(), aipHandler: aipServer.Handler()}, nil
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
