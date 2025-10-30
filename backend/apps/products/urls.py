from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet
from typing import List
from django.urls.resolvers import URLPattern

router = DefaultRouter()
router.register(r'products', ProductViewSet)

urlpatterns: List[URLPattern] = [
    path('', include(router.urls)),
]
