from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from django.db import transaction
from .models import Product
from .serializers import ProductSerializer
from typing import Any, List


class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows products to be viewed or edited.

    Provides standard CRUD operations for the Product model, along with a
    custom action for bulk deletion of products.
    """
    queryset = Product.objects.prefetch_related('photos').all()
    serializer_class = ProductSerializer
    filterset_fields: List[str] = ['category_level_1', 'category_level_2', 'name', 'sku']
    search_fields: List[str] = ['name', 'sku', 'composition', 'comments']

    @action(detail=False, methods=['delete'], url_path='bulk-delete')
    @transaction.atomic
    def bulk_delete(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """
        Deletes multiple products in a single request.

        Expects a list of product IDs in the request body.

        Args:
            request: The current DRF request object, containing the list of IDs.
            *args: Variable length argument list.
            **kwargs: Arbitrary keyword arguments.

        Returns:
            Response: An HTTP 204 No Content response on success, or an error
                      response if the request is invalid.

        Raises:
            serializers.ValidationError: If 'ids' are not provided or not a list.
        """
        ids = request.data.get('ids')

        if not ids or not isinstance(ids, list):
            return Response(
                {'error': 'A list of "ids" is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        products_to_delete = Product.objects.filter(pk__in=ids)
        count = products_to_delete.count()

        if count > 0:
            products_to_delete.delete()

        return Response(
            {'detail': f'{count} products deleted successfully.'},
            status=status.HTTP_204_NO_CONTENT
        )
