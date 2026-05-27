from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/',      admin.site.urls),
    path('accounts/',   include('accounts.urls')),
    path('api/maps/',   include('maps.urls')),
    path('editor/',     include('maps.editor_urls')),
    path('view/<int:map_id>/', include('maps.viewer_urls')),
    path('',            include('maps.index_urls')),
]
