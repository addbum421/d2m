from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from .services import AccountService


def register_view(request):
    """회원가입 뷰 — Request 객체에서 POST 데이터 직접 추출"""
    if request.user.is_authenticated:
        return redirect('editor')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')
        try:
            AccountService.register(request, username, password, password2)
            return redirect('editor')
        except ValidationError as e:
            return render(request, 'accounts/register.html', {'error': e.message})

    return render(request, 'accounts/register.html')


def login_view(request):
    """로그인 뷰"""
    if request.user.is_authenticated:
        return redirect('editor')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        try:
            AccountService.login_user(request, username, password)
            return redirect('editor')
        except ValidationError as e:
            return render(request, 'accounts/login.html', {'error': e.message})

    return render(request, 'accounts/login.html')


def logout_view(request):
    """로그아웃 뷰"""
    if request.method == 'POST':
        AccountService.logout_user(request)
    return redirect('login')


@login_required
def me_view(request):
    """현재 로그인 유저 정보 JSON 반환 (API)"""
    return JsonResponse(AccountService.get_user_info(request.user))
