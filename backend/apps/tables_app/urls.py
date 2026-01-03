# backend/apps/tables_app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')

# Используем единообразный подход с подключением через include
urlpatterns = [
    path("", include(router.urls)),
]