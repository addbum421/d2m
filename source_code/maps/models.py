from django.db import models
from django.contrib.auth.models import User


class Map(models.Model):
    """게임 맵 데이터 모델"""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='maps')
    name = models.CharField(max_length=100, default='새 맵')
    width = models.IntegerField(default=30)
    height = models.IntegerField(default=20)
    tile_size = models.IntegerField(default=32)
    # 전체 맵 데이터 (레이어 포함) — JSON 구조는 AGENT.md 참고
    data = models.JSONField(default=dict)
    # True = 자동저장 슬롯 (유저당 1개), False = 수동 저장 맵
    is_autosave = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = '맵'
        ordering = ['-updated_at']

    def __str__(self):
        tag = '[자동저장]' if self.is_autosave else ''
        return f'{self.owner.username} — {self.name} {tag}'

    def to_dict(self) -> dict:
        """API 응답용 직렬화"""
        return {
            'id': self.id,
            'name': self.name,
            'width': self.width,
            'height': self.height,
            'tile_size': self.tile_size,
            'data': self.data,
            'is_autosave': self.is_autosave,
            'updated_at': self.updated_at.isoformat(),
        }
