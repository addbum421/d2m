from django.contrib import admin
from .models import Map


@admin.register(Map)
class MapAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'width', 'height', 'is_autosave', 'updated_at')
    list_filter = ('is_autosave', 'owner')
