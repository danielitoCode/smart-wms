// Package ports defines interfaces at the boundary of features (Clean Architecture).
//
// Feature-first layout (logical):
//
//	features/auth, catalog, receiving, picking, packing, shipping,
//	salesorders, admin, integrations, identity…
//
// Each feature's use-cases depend on ports; infrastructure/persistence
// implements those ports with PrismaTec-Core (corestore organisms + ledger).
//
// Physical packages remain under internal/application/* for stability; new
// code should accept ports.X interfaces instead of concrete *Repository types
// at the edges of httpapi when practical.
package ports
