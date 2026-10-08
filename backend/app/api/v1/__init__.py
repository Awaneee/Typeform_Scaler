from fastapi import APIRouter

from app.api.v1 import forms, health, public, results

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(forms.router)
router.include_router(results.router)
router.include_router(public.router)
