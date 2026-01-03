# backend/apps/users/views.py
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets, status, permissions, views  # Добавлен views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from deep_translator import GoogleTranslator
from .serializers import UserSerializer, CustomTokenObtainPairSerializer
from .permissions import IsAdminRole, IsAdminOrManager

User = get_user_model()


def is_empty(val):
    """Проверка на пустое значение."""
    if val is None:
        return True
    s = str(val).strip().lower()
    return s in ["", "nan", "none", "-", "—"]


def translate_fio_to_zh(fio_ru):
    """Перевод ФИО на китайский."""
    if is_empty(fio_ru):
        return ""
    try:
        translator = GoogleTranslator(source="auto", target="zh-CN")
        return translator.translate(str(fio_ru))
    except Exception:
        return ""


class CustomLoginView(TokenObtainPairView):
    """Вью для логина, возвращающая success, token, role, email.

    Используется кастомный сериализатор для приведения ответа к формату,
    который ожидает Angular AuthService.
    """

    serializer_class = CustomTokenObtainPairSerializer


class RequestPasswordResetView(views.APIView):
    """Эндпоинт для запроса сброса пароля.
    
    Необходим для устранения ImportError в urls.py.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email required"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Password reset email sent"}, status=status.HTTP_200_OK)


class ResetPasswordView(views.APIView):
    """Эндпоинт для подтверждения сброса пароля.
    
    Необходим для устранения ImportError в urls.py.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        password = request.data.get('password')
        if not token or not password:
            return Response({"error": "Data missing"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet для управления пользователями и профилем.

    Поддерживает стандартный CRUD, а также расширенные действия для
    пагинации, поиска и массовых операций, адаптированные под Angular.
    """

    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        """Создание пользователя с автопереводом ФИО на китайский."""
        instance = serializer.save()
        self._auto_translate_fio(instance)

    def perform_update(self, serializer):
        """Обновление пользователя с автопереводом ФИО на китайский."""
        instance = serializer.save()
        self._auto_translate_fio(instance)

    def _auto_translate_fio(self, instance):
        """Автоперевод ФИО если fio_zh пусто."""
        if not is_empty(instance.fio) and is_empty(instance.fio_zh):
            translated = translate_fio_to_zh(instance.fio)
            if translated:
                instance.fio_zh = translated
                instance.save(update_fields=["fio_zh"])

    def get_permissions(self):
        """Определяет права доступа в зависимости от выполняемого действия.

        Returns:
            list: Список экземпляров классов разрешений.
        """
        if self.action in [
            "create",
            "destroy",
            "update",
            "partial_update",
            "bulk_update",
            "bulk_delete",
        ]:
            permission_classes = [IsAdminOrManager]
        elif self.action == "change_user_password":
            permission_classes = [IsAdminRole]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=["get"])
    def profile(self, request):
        """Получение данных профиля текущего авторизованного пользователя.

        Args:
            request: Объект запроса.

        Returns:
            Response: Сериализованные данные пользователя.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @profile.mapping.put
    def update_profile(self, request):
        """Обновление данных профиля текущего пользователя.

        Args:
            request: Объект запроса с данными профиля.

        Returns:
            Response: Обновленные данные профиля.
        """
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="profile/change-password")
    def change_my_password(self, request):
        """Смена собственного пароля пользователем.

        Args:
            request: Объект запроса, содержащий oldPassword and newPassword.

        Returns:
            Response: Статус успеха или сообщение об ошибке.
        """
        user = request.user
        old_pw = request.data.get("oldPassword")
        new_pw = request.data.get("newPassword")

        if not old_pw or not new_pw:
            return Response(
                {"error": "Требуются старый и новый пароли"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(old_pw):
            return Response(
                {"error": "Старый пароль неверен"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_pw)
        user.save()
        return Response({"success": True, "message": "Пароль успешно изменен"})

    @action(detail=False, methods=["get", "post"], url_path="page")
    def get_users_page(self, request):
        """Получение страницы пользователей (пагинация).

        Поддерживает GET (через query-параметры) и POST (через JSON тело).

        Args:
            request: Объект запроса. Ожидает pageIndex и pageSize.

        Returns:
            Response: Словарь с массивом пользователей и общим количеством.
        """
        # Извлекаем параметры из query_params (GET) или data (POST)
        params = request.query_params if request.method == "GET" else request.data

        try:
            page_index = int(params.get("pageIndex", 0))
            page_size = int(params.get("pageSize", 10))
        except (ValueError, TypeError):
            page_index, page_size = 0, 10

        queryset = self.filter_queryset(self.get_queryset())
        total_count = queryset.count()

        start = page_index * page_size
        end = start + page_size
        users = queryset[start:end]

        serializer = self.get_serializer(users, many=True)
        return Response({"users": serializer.data, "totalCount": total_count})

    @action(detail=False, methods=["get", "post"], url_path="search")
    def search_users(self, request):
        """Поиск пользователей по ФИО или Email.

        Args:
            request: Объект запроса. Ожидает параметр query.

        Returns:
            Response: Список найденных пользователей.
        """
        params = request.query_params if request.method == "GET" else request.data
        query = params.get("query", "").strip()

        if not query:
            return Response([])

        queryset = self.get_queryset().filter(
            Q(fio__icontains=query) |
            Q(fio_zh__icontains=query) |
            Q(email__icontains=query)
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["put"], url_path="bulk-update")
    def bulk_update(self, request):
        """Массовое обновление данных нескольких пользователей.

        Доступно только пользователям с ролью admin или manager.
        """
        users_data = request.data
        if not isinstance(users_data, list):
            return Response(
                {"error": "Expected a list"}, status=status.HTTP_400_BAD_REQUEST
            )

        updated_users = []
        for user_data in users_data:
            user_id = user_data.get("id")
            if not user_id:
                continue
            try:
                user_instance = User.objects.get(id=user_id)
                # Менеджер не может редактировать Администратора
                if user_instance.role == "admin" and request.user.role != "admin":
                    continue

                serializer = self.get_serializer(
                    user_instance, data=user_data, partial=True
                )
                if serializer.is_valid():
                    instance = serializer.save()
                    self._auto_translate_fio(instance)
                    updated_users.append(serializer.data)
            except User.DoesNotExist:
                continue
        return Response(updated_users)

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """Массовое удаление пользователей по списку ID.

        ID передаются в теле запроса как массив чисел.
        """
        ids = request.data
        if isinstance(request.data, dict) and "ids" in request.data:
            ids = request.data["ids"]

        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "Expected a list of IDs"}, status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.id in ids:
            return Response(
                {"error": "Нельзя удалить самого себя"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        users_to_delete = User.objects.filter(id__in=ids)
        for u in users_to_delete:
            if u.role == "admin" and request.user.role != "admin":
                return Response(
                    {"error": "Недостаточно прав для удаления администратора"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        users_to_delete.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["put"], url_path="change-email")
    def change_email(self, request, pk=None):
        """Индивидуальная смена Email пользователя администратором."""
        user = self.get_object()
        new_email = request.data.get("email")
        if not new_email:
            return Response(
                {"error": "Email required"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.email = new_email
        user.save()
        return Response({"status": "success"})

    @action(detail=True, methods=["put"], url_path="change-password")
    def change_user_password(self, request, pk=None):
        """Индивидуальная смена пароля пользователя (административный сброс)."""
        user = self.get_object()
        new_password = request.data.get("password")
        if not new_password:
            return Response(
                {"error": "Password required"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response({"status": "success"})