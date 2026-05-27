from django.urls import path
from . import views

# /api/maps/ 하위 REST API
urlpatterns = [
    path('',               views.map_list,     name='map_list'),
    path('search/',        views.map_search,   name='map_search'),
    path('save/',          views.map_save,     name='map_save'),
    path('autosave/',      views.map_autosave, name='map_autosave'),
    path('last/',          views.map_last,     name='map_last'),
    path('<int:map_id>/',         views.map_detail, name='map_detail'),
    path('<int:map_id>/copy/',    views.map_copy,   name='map_copy'),
]
