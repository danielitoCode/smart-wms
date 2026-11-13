package ports

import "github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"

// CatalogRepository is the port for master data. The concrete type today is
// *catalog.Repository (PrismaTec organisms). Features depend on the port so
// tests can substitute fakes without touching httpapi.
type CatalogRepository interface {
	ListWarehouses() ([]catalog.Warehouse, error)
	ListItems() ([]catalog.Item, error)
	ListBins() ([]catalog.Bin, error)
	GetItem(id int64) (catalog.Item, error)
}
