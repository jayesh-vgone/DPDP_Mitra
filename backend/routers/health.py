from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "DPDP Mitra API", "version": "2.0.0"}
