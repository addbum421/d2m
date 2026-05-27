from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('api/maps/', include('maps.urls')),
    path('editor/', include('maps.editor_urls')),
    path('', lambda req: redirect('editor/')),
]
