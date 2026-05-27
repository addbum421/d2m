from django.urls import path
from .views import map_viewer

urlpatterns = [
    path('', map_viewer, name='map_viewer'),
]
