package ports

// AdminResourceRepository is the Daniel-compliant data port for admin
// resources still migrating off Flask. HTTP handlers depend on this
// interface only — never on corestore or seed logic directly.
type AdminResourceRepository interface {
	List(resource string) ([]map[string]any, error)
	Get(resource, id string) (map[string]any, bool, error)
	Put(resource, id string, doc map[string]any) (map[string]any, error)
	Delete(resource, id string) error
	GetSetting(key string) (map[string]any, error)
	PutSetting(key string, value any) (map[string]any, error)
}
