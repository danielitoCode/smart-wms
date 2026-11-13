package admindata

import "github.com/danielitoCode/smart-wms/wms-twin/internal/ports"

// Compile-time proof: Store is the AdminResourceRepository port.
var _ ports.AdminResourceRepository = (*Store)(nil)
