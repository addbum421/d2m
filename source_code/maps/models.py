from django.db import models
from django.contrib.auth.models import User


class Map(models.Model):
    """게임 맵 데이터 모델"""
    owner     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='maps')
    name      = models.CharField(max_length=100, default='새 맵')
    game      = models.CharField(max_length=100, blank=True, default='')   # 게임명
    stage     = models.CharField(max_length=100, blank=True, default='')   # 스테이지
    width     = models.IntegerField(default=30)
    height    = models.IntegerField(default=20)
    tile_size = models.IntegerField(default=32)
    data      = models.JSONField(default=dict)
    is_autosave = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = '맵'
        ordering = ['-updated_at']

    def __str__(self):
        parts = [p for p in [self.game, self.stage, self.name] if p]
        label = ' / '.join(parts) if parts else '(무제)'
        tag = ' [자동저장]' if self.is_autosave else ''
        return f'{self.owner.username} — {label}{tag}'

    def to_dict(self, include_data=True) -> dict:
        """API 응답용 직렬화. include_data=False 이면 레이어 데이터 제외 (목록용)"""
        d = {
            'id':         self.id,
            'name':       self.name,
            'game':       self.game,
            'stage':      self.stage,
            'owner':      self.owner.username,
            'width':      self.width,
            'height':     self.height,
            'tile_size':  self.tile_size,
            'is_autosave': self.is_autosave,
            'updated_at': self.updated_at.isoformat(),
        }
        if include_data:
            d['data'] = self.data
        return d
