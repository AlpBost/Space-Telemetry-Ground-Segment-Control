"""
Master FastAPI Application for Space Telemetry & Ground Segment Control Dashboard.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import telemetry_ws, commands, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch high-frequency background telemetry broadcast loop
    telemetry_ws.start_telemetry_loop()
    yield
    # Shutdown: Cleanly terminate broadcast task
    telemetry_ws.stop_telemetry_loop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Mission-critical space telemetry simulation, FDIR engine, and real-time WebSocket ground station interface.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for Ground Station Frontend Operator Console
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(telemetry_ws.router)
app.include_router(commands.router, prefix=settings.API_V1_STR)
app.include_router(health.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root_info():
    return {
        "system": settings.PROJECT_NAME,
        "segment": settings.GROUND_STATION_NAME,
        "telemetry_ws": settings.WS_TELEMETRY_ENDPOINT,
        "api_docs": "/docs",
    }
