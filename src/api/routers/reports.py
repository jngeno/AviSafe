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

_FILENAME_RE = re.compile(
    r"^safety_report_(?P<target>[A-Za-z_]+)_(?P<date>\d{4}-\d{2}-\d{2})_(?P<time>\d{4})_(?P<experiment_id>[0-9a-f]{6,})\.md$"
)


def _generated_at(path, match: re.Match | None) -> datetime:
    """
    The filename encodes the real generation timestamp; file mtime only
    reflects the last checkout/copy and isn't trustworthy (see the
    "rename reports" cleanup that introduced this convention).
    """

    if match:
        try:
            return datetime.strptime(
                f"{match.group('date')} {match.group('time')}", "%Y-%m-%d %H%M"
            ).replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)


@router.get("", response_model=list[schemas.ReportSummary])
def list_reports():

    try:
        reports_dir = Config().reports_dir

        if not reports_dir.exists():
            return []

        summaries = []

        for path in reports_dir.glob("*.md"):

            match = _FILENAME_RE.match(path.name)

            summaries.append(
                {
                    "filename": path.name,
                    "target_column": match.group("target") if match else None,
                    "experiment_id": match.group("experiment_id") if match else None,
                    "generated_at": _generated_at(path, match),
                    "size_kb": round(path.stat().st_size / 1024, 1),
                }
            )

        summaries.sort(key=lambda s: s["generated_at"], reverse=True)

        return summaries
    except Exception:
        return []


@router.get("/{filename}", response_class=PlainTextResponse)
def get_report(filename: str):

    try:
        reports_dir = Config().reports_dir

        path = (reports_dir / filename).resolve()

        if not path.is_relative_to(reports_dir.resolve()) or not path.exists():
            raise HTTPException(status_code=404, detail="Report not found")

        return path.read_text(encoding="utf-8")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error reading report: {str(exc)}") from exc
