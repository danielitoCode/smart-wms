// Package zyrion defines the ternary outcome model used as the nervous system
// of external commerce signals (not end-customer card capture inside the WMS).
package zyrion

// Outcome is the ternary result of a domain step.
// 1 = success (closed positively), 0 = failure (closed negatively),
// 2 = indeterminate (open, waiting, or needs reconciliation).
type Outcome int

const (
	Failure       Outcome = 0
	Success       Outcome = 1
	Indeterminate Outcome = 2
)

func (o Outcome) String() string {
	switch o {
	case Failure:
		return "failure"
	case Success:
		return "success"
	case Indeterminate:
		return "indeterminate"
	default:
		return "unknown"
	}
}

func Parse(s string) Outcome {
	switch s {
	case "failure", "0", "failed", "error":
		return Failure
	case "success", "1", "paid", "ok", "done":
		return Success
	default:
		return Indeterminate
	}
}

// VisualAnchor is a stable UI/ops label for dashboards (not CSS).
func (o Outcome) VisualAnchor() string {
	switch o {
	case Success:
		return "green"
	case Failure:
		return "red"
	default:
		return "amber"
	}
}
