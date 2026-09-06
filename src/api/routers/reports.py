"""
Generated regulator-ready safety report listing (see
src.explainability.report_generator, saved to reports/ by the CLI
training entry point).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from src.core.config import Config

from .. import schemas

router = APIRouter(prefix="/reports", tags=["reports"])

_FILENAME_RE = re.compile(r"^safety_report_(?:(?P<target>[A-Za-z_]+)_)?(?P<experiment_id>[0-9a-f-]{8,})\.md$")


@router.get("", response_model=list[schemas.ReportSummary])
def list_reports():

    try:
        reports_dir = Config().project_root / "reports"

        if not reports_dir.exists():
            return []

        summaries = []

        for path in sorted(reports_dir.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True):

            match = _FILENAME_RE.match(path.name)

            summaries.append(
                {
                    "filename": path.name,
                    "target_column": match.group("target") if match else None,
                    "experiment_id": match.group("experiment_id") if match else None,
                    "generated_at": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc),
                    "size_kb": round(path.stat().st_size / 1024, 1),
                }
            )

        return summaries
    except Exception:
        # If reports can't be listed, return empty list
        return []


@router.get("/{filename}", response_class=PlainTextResponse)
def get_report(filename: str):

    try:
        reports_dir = Config().project_root / "reports"

        path = (reports_dir / filename).resolve()

        if not path.is_relative_to(reports_dir.resolve()) or not path.exists():
            raise HTTPException(status_code=404, detail="Report not found")

        return path.read_text(encoding="utf-8")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error reading report: {str(exc)}") from exc
