from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """django.contrib.auth.User 를 확장한 프로필"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '유저 프로필'

    def __str__(self):
        return f'{self.user.username} 프로필'
