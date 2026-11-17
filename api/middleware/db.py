"""
Database session decorator - eliminates manual get_db() / try / except / finally
boilerplate from every route handler.
"""

from functools import wraps

from flask import g, jsonify
from sqlalchemy.exc import IntegrityError

import models.database as _db


def with_db(f):
    """Decorator that provides g.db for the duration of a request.

    Rolls back on exception, always closes the session.
    Routes must still call g.db.commit() explicitly for write operations.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        g.db = _db.SessionLocal()
        try:
            return f(*args, **kwargs)
        except IntegrityError as exc:
            g.db.rollback()
            original = getattr(exc, "orig", None)
            message = str(original or exc)
            if (
                getattr(original, "pgcode", None) == "23514"
                and "would undercut open Transfer Order reservations" in message
            ):
                return jsonify({
                    "error": "inventory_reservation_conflict",
                    "detail": (
                        "This inventory is reserved by an active Transfer Order. "
                        "Release or approve that transfer reservation before consuming this stock."
                    ),
                }), 409
            raise
        except Exception:
            g.db.rollback()
            raise
        finally:
            g.db.close()
    return wrapper
