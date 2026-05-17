from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DefeitoViewSet

router = DefaultRouter()
router.register('', DefeitoViewSet, basename='defeitos')

urlpatterns = [
    path('', include(router.urls)),
]
