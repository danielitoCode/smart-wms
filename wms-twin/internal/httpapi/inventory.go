package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/domain/inventory"
)

func (s *Server) inventory(w http.ResponseWriter, r *http.Request) {
	action := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/twin/inventory/"), "/")
	if action == "balances" {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		balances, version, err := s.ledger.List()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"version": version, "balances": balances, "total": len(balances)})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var err error
	switch action {
	case "adjust":
		var command inventoryledger.AdjustCommand
		if err = decodeStrictJSON(r, &command); err == nil {
			var result inventoryledger.Result
			result, err = s.ledger.Adjust(command)
			if err == nil {
				writeJSON(w, http.StatusOK, result)
				return
			}
		}
	case "allocate":
		var command inventoryledger.QuantityCommand
		if err = decodeStrictJSON(r, &command); err == nil {
			var result inventoryledger.Result
			result, err = s.ledger.Allocate(command)
			if err == nil {
				writeJSON(w, http.StatusOK, result)
				return
			}
		}
	case "release":
		var command inventoryledger.QuantityCommand
		if err = decodeStrictJSON(r, &command); err == nil {
			var result inventoryledger.Result
			result, err = s.ledger.Release(command)
			if err == nil {
				writeJSON(w, http.StatusOK, result)
				return
			}
		}
	case "move":
		var command inventoryledger.MoveCommand
		if err = decodeStrictJSON(r, &command); err == nil {
			var result inventoryledger.Result
			result, err = s.ledger.Move(command)
			if err == nil {
				writeJSON(w, http.StatusOK, result)
				return
			}
		}
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "inventory action not found"})
		return
	}
	if isRequestDecodeError(err) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeInventoryError(w, err)
}

func decodeStrictJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	data, err := io.ReadAll(io.LimitReader(r.Body, (1<<20)+1))
	if err != nil {
		return err
	}
	if len(data) > 1<<20 {
		return errors.New("request body exceeds 1 MiB")
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return errors.New("request must contain exactly one JSON value")
	}
	return nil
}

func isRequestDecodeError(err error) bool {
	if err == nil {
		return false
	}
	return errors.Is(err, io.EOF) || strings.Contains(err.Error(), "request body") ||
		strings.Contains(err.Error(), "unknown field") ||
		strings.Contains(err.Error(), "invalid character") ||
		strings.Contains(err.Error(), "cannot unmarshal") ||
		strings.Contains(err.Error(), "request must contain")
}

func writeInventoryError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, inventoryledger.ErrIdempotencyConflict):
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
	case errors.Is(err, inventoryledger.ErrInvalidOperationID):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	case errors.Is(err, inventory.ErrNegativeQuantity),
		errors.Is(err, inventory.ErrInvalidMovement),
		errors.Is(err, inventory.ErrInvalidBalance),
		errors.Is(err, inventory.ErrQuantityOverflow):
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": err.Error()})
	case errors.Is(err, inventory.ErrInsufficientAvailable):
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
	default:
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
}
