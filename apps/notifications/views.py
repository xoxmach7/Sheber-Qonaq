from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = self.request.user.organization
        qs  = Notification.objects.filter(
            organization=org
        ).exclude(type__in=Notification.HIDDEN_FROM_LIST_TYPES)
        unread_only = self.request.query_params.get('unread')
        if unread_only:
            qs = qs.filter(is_read=False)
        return qs[:50]

    def list(self, request, *args, **kwargs):
        qs       = self.get_queryset()
        org      = request.user.organization
        # Тот же набор типов, что и в списке — иначе бейдж расходится с пустым списком.
        unread   = Notification.objects.filter(
            organization=org, is_read=False
        ).exclude(type__in=Notification.HIDDEN_FROM_LIST_TYPES).count()
        data     = self.get_serializer(qs, many=True).data
        return Response({'results': data, 'unread_count': unread})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk, organization=request.user.organization)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(
        organization=request.user.organization, is_read=False
    ).update(is_read=True)
    return Response({'status': 'ok'})
