from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging


logger = logging.getLogger(__name__)


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def deprecated_gone(request, *args, **kwargs):
    logger.warning(
        "Trails endpoint hit after deprecation",
        extra={
            "user_id": getattr(request.user, "id", None),
            "path": request.path,
            "method": request.method,
        },
    )
    return Response(
        {"detail": "Trails API removed. Use vector tiles."},
        status=status.HTTP_410_GONE,
    )
