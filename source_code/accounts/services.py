from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from .models import UserProfile


class AccountService:
    """유저 관련 비즈니스 로직 서비스 레이어"""

    @classmethod
    def register(cls, request, username: str, password: str, password2: str) -> User:
        """회원가입: 유효성 검사 후 User + UserProfile 생성"""
        if password != password2:
            raise ValidationError('비밀번호가 일치하지 않습니다.')
        if User.objects.filter(username=username).exists():
            raise ValidationError('이미 존재하는 아이디입니다.')
        if len(username) < 3:
            raise ValidationError('아이디는 3자 이상이어야 합니다.')

        user = User.objects.create_user(username=username, password=password)
        UserProfile.objects.create(user=user)
        login(request, user)
        return user

    @classmethod
    def login_user(cls, request, username: str, password: str) -> User:
        """로그인: 인증 후 세션 생성"""
        user = authenticate(request, username=username, password=password)
        if user is None:
            raise ValidationError('아이디 또는 비밀번호가 올바르지 않습니다.')
        login(request, user)
        return user

    @classmethod
    def logout_user(cls, request) -> None:
        """로그아웃: 세션 종료"""
        logout(request)

    @classmethod
    def get_user_info(cls, user: User) -> dict:
        """현재 유저 정보 반환 (JSON API용)"""
        return {
            'id': user.id,
            'username': user.username,
            'is_authenticated': user.is_authenticated,
        }
