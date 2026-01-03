# backend/apps/tables_app/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class CustomPageNumberPagination(PageNumberPagination):
    # Настройки по умолчанию
    page_size = 50
    page_size_query_param = "size"
    max_page_size = 1000
    page_query_param = "page"

    def get_page_number(self, request, paginator):
        """
        Адаптер для Angular:
        Фронт шлет page=0, мы превращаем в 1.
        Фронт шлет page=1, мы превращаем в 2.
        """
        page_number = request.query_params.get(self.page_query_param, 0)
        try:
            # Превращаем 0-based index (Angular) в 1-based index (Django)
            return int(page_number) + 1
        except (TypeError, ValueError):
            return 1

    def get_paginated_response(self, data):
        """
        Формат ответа: { rows: [...], totalCount: 100 }
        """
        return Response({"totalCount": self.page.paginator.count, "rows": data})