from django.urls import path
from .views import editor_view

urlpatterns = [
    path('', editor_view, name='editor'),
]
