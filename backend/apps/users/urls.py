# backend/apps/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    CustomLoginView,
    RequestPasswordResetView,
    ResetPasswordView,
)

# trailing_slash=True (по умолчанию) гарантирует / в конце путей роутера
router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")

urlpatterns = [
    # ВАЖНО: Добавлены завершающие слеши во все ручные пути
    path("auth/login/", CustomLoginView.as_view(), name="token_obtain_pair"),
    path(
        "auth/refresh/", RequestPasswordResetView.as_view(), name="token_refresh"
    ),  # Заглушка
    path(
        "auth/forgot-password/",
        RequestPasswordResetView.as_view(),
        name="forgot_password",
    ),
    path("auth/reset-password/", ResetPasswordView.as_view(), name="reset_password"),
    # Профиль
    path(
        "profile/",
        UserViewSet.as_view({"get": "profile", "put": "update_profile"}),
        name="profile",
    ),
    path(
        "profile/change-password/",
        UserViewSet.as_view({"post": "change_my_password"}),
        name="profile_change_password",
    ),
    # Роутер (users/, users/page/, users/search/)
    path("", include(router.urls)),
]
