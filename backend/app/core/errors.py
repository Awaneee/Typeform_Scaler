"""One error shape for the whole API: {"error": {"code", "message", "fields"}}."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, fields: dict[str, str] | None = None, extra: dict | None = None):
        super().__init__(message)
        self.message = message
        self.fields = fields
        self.extra = extra or {}


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class TooManyRequestsError(AppError):
    status_code = 429
    code = "rate_limited"


class ValidationFailedError(AppError):
    status_code = 422
    code = "validation_failed"


def _body(code: str, message: str, fields: dict | None = None, **extra) -> dict:
    return {"error": {"code": code, "message": message, "fields": fields, **extra}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_req: Request, exc: AppError):
        return JSONResponse(_body(exc.code, exc.message, exc.fields, **exc.extra), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _request_validation(_req: Request, exc: RequestValidationError):
        fields = {".".join(str(p) for p in err["loc"][1:]) or "body": err["msg"] for err in exc.errors()}
        return JSONResponse(_body("invalid_request", "The request is malformed.", fields), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_req: Request, exc: StarletteHTTPException):
        return JSONResponse(_body("http_error", str(exc.detail)), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _unhandled(_req: Request, exc: Exception):
        # Never leak stack traces to clients; log them server-side instead.
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(_body("internal_error", "Something went wrong on our side."), status_code=500)
