from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsOwnerOrManager
from .models import User
from .serializers import UserSerializer, UserCreateSerializer, ChangePasswordSerializer


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get_queryset(self):
        return User.objects.filter(
            organization=self.request.user.organization
        ).order_by('last_name', 'first_name')

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Текущий пользователь."""
        return Response(UserSerializer(request.user).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request, pk=None):
        user = self.get_object()
        if user != request.user and not request.user.is_owner_or_manager:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': 'Неверный пароль.'}, status=400)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'status': 'Пароль изменён'})
