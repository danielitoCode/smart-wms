package persistence

import (
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/admindata"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/ports"
)

// NewAdminResourceRepository wraps admindata.Store as the AdminResourceRepository port.
// Seeds and organism I/O stay inside admindata — never in httpapi controllers.
func NewAdminResourceRepository(core *corestore.Store) ports.AdminResourceRepository {
	return admindata.New(core)
}
