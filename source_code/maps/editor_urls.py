from django.urls import path
from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def editor_view(request):
    return render(request, 'maps/editor.html', {'user': request.user})


urlpatterns = [
    path('', editor_view, name='editor'),
]
