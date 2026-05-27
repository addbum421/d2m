from django.contrib.auth.models import User
from django.core.exceptions import ValidationError, PermissionDenied
from django.db.models import Q
from django.shortcuts import get_object_or_404
from typing import Optional
from .models import Map


class MapService:
    """맵 관련 비즈니스 로직 서비스 레이어"""

    DEFAULT_LAYER = {
        'id': 'layer_0',
        'name': '레이어 1',
        'visible': True,
        'locked': False,
        'tiles': [],
        'icons': [],
    }

    @classmethod
    def new_map_data(cls, width: int, height: int) -> dict:
        layer = dict(cls.DEFAULT_LAYER)
        layer['tiles'] = [None] * (width * height)
        return {'layers': [layer]}

    @classmethod
    def validate_map_data(cls, data: dict) -> bool:
        if not isinstance(data, dict):
            raise ValidationError('맵 데이터 형식이 올바르지 않습니다.')
        if 'layers' not in data or not isinstance(data['layers'], list):
            raise ValidationError('레이어 데이터가 없습니다.')
        return True

    # ── 조회 ──────────────────────────────────────────

    @classmethod
    def get_map(cls, map_id: int, user: User) -> Map:
        """소유권 확인 포함 조회"""
        map_obj = get_object_or_404(Map, id=map_id)
        if map_obj.owner != user:
            raise PermissionDenied('해당 맵에 접근 권한이 없습니다.')
        return map_obj

    @classmethod
    def get_map_public(cls, map_id: int) -> Map:
        """소유권 무관 조회 (열람용)"""
        return get_object_or_404(Map, id=map_id, is_autosave=False)

    @classmethod
    def get_user_maps(cls, user: User) -> list:
        return list(
            Map.objects.filter(owner=user, is_autosave=False)
            .values('id', 'name', 'game', 'stage', 'width', 'height', 'updated_at')
        )

    @classmethod
    def get_last_map(cls, user: User) -> Optional[Map]:
        autosave = Map.objects.filter(owner=user, is_autosave=True).first()
        if autosave:
            return autosave
        return Map.objects.filter(owner=user, is_autosave=False).first()

    @classmethod
    def search_maps(cls, query: str = '', game: str = '', stage: str = '') -> list:
        """공개 맵 검색 — game / stage / name 통합 검색"""
        qs = Map.objects.filter(is_autosave=False).select_related('owner')
        if game:
            qs = qs.filter(game__icontains=game)
        if stage:
            qs = qs.filter(stage__icontains=stage)
        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(game__icontains=query) |
                Q(stage__icontains=query)
            )
        return [m.to_dict(include_data=False) for m in qs.order_by('-updated_at')[:60]]

    # ── 저장 / 수정 ───────────────────────────────────

    @classmethod
    def save_map(cls, user: User, payload: dict) -> Map:
        cls.validate_map_data(payload.get('data', {}))
        map_id = payload.get('id')
        if map_id:
            map_obj = cls.get_map(map_id, user)
            map_obj.name  = payload.get('name',  map_obj.name)
            map_obj.game  = payload.get('game',  map_obj.game)
            map_obj.stage = payload.get('stage', map_obj.stage)
            map_obj.data  = payload['data']
            map_obj.is_autosave = False
            map_obj.save()
        else:
            width  = int(payload.get('width',  30))
            height = int(payload.get('height', 20))
            map_obj = Map.objects.create(
                owner=user,
                name=payload.get('name', '새 맵'),
                game=payload.get('game', ''),
                stage=payload.get('stage', ''),
                width=width,
                height=height,
                tile_size=int(payload.get('tile_size', 32)),
                data=payload.get('data', cls.new_map_data(width, height)),
                is_autosave=False,
            )
        return map_obj

    @classmethod
    def autosave(cls, user: User, payload: dict) -> Map:
        cls.validate_map_data(payload.get('data', {}))
        map_obj, _ = Map.objects.update_or_create(
            owner=user,
            is_autosave=True,
            defaults={
                'name':      payload.get('name',  '자동저장'),
                'game':      payload.get('game',  ''),
                'stage':     payload.get('stage', ''),
                'width':     int(payload.get('width',  30)),
                'height':    int(payload.get('height', 20)),
                'tile_size': int(payload.get('tile_size', 32)),
                'data':      payload.get('data', {}),
            }
        )
        return map_obj

    @classmethod
    def copy_map(cls, map_id: int, user: User) -> Map:
        """다른 유저의 맵을 내 계정으로 복사"""
        original = get_object_or_404(Map, id=map_id, is_autosave=False)
        return Map.objects.create(
            owner=user,
            name=f'{original.name} (복사)',
            game=original.game,
            stage=original.stage,
            width=original.width,
            height=original.height,
            tile_size=original.tile_size,
            data=original.data,
            is_autosave=False,
        )

    @classmethod
    def delete_map(cls, map_id: int, user: User) -> None:
        map_obj = cls.get_map(map_id, user)
        map_obj.delete()
