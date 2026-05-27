from django.contrib.auth.models import User
from django.core.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from typing import Optional
from .models import Map


class MapService:
    """맵 관련 비즈니스 로직 서비스 레이어"""

    # 기본 맵 데이터 템플릿
    DEFAULT_LAYER = {
        'id': 'layer_0',
        'name': '레이어 1',
        'visible': True,
        'locked': False,
        'tiles': [],   # 생성 시 width*height 만큼 None으로 채움
        'icons': [],
    }

    @classmethod
    def new_map_data(cls, width: int, height: int) -> dict:
        """새 맵의 기본 데이터 구조 생성"""
        layer = dict(cls.DEFAULT_LAYER)
        layer['tiles'] = [None] * (width * height)
        return {'layers': [layer]}

    @classmethod
    def validate_map_data(cls, data: dict) -> bool:
        """맵 데이터 유효성 검사"""
        if not isinstance(data, dict):
            raise ValidationError('맵 데이터 형식이 올바르지 않습니다.')
        if 'layers' not in data or not isinstance(data['layers'], list):
            raise ValidationError('레이어 데이터가 없습니다.')
        return True

    @classmethod
    def get_map(cls, map_id: int, user: User) -> Map:
        """맵 조회 — 소유권 검사 포함"""
        map_obj = get_object_or_404(Map, id=map_id)
        if map_obj.owner != user:
            raise PermissionDenied('해당 맵에 접근 권한이 없습니다.')
        return map_obj

    @classmethod
    def get_user_maps(cls, user: User) -> list:
        """유저의 수동 저장 맵 목록 반환"""
        return list(Map.objects.filter(owner=user, is_autosave=False).values(
            'id', 'name', 'width', 'height', 'updated_at'
        ))

    @classmethod
    def get_last_map(cls, user: User) -> Optional[Map]:
        """마지막 편집 맵 반환 (자동저장 슬롯 우선, 없으면 최신 수동 저장)"""
        autosave = Map.objects.filter(owner=user, is_autosave=True).first()
        if autosave:
            return autosave
        return Map.objects.filter(owner=user, is_autosave=False).first()

    @classmethod
    def save_map(cls, user: User, payload: dict) -> Map:
        """맵 저장 또는 업데이트"""
        cls.validate_map_data(payload.get('data', {}))

        map_id = payload.get('id')
        if map_id:
            # 기존 맵 업데이트
            map_obj = cls.get_map(map_id, user)
            map_obj.name = payload.get('name', map_obj.name)
            map_obj.data = payload['data']
            map_obj.is_autosave = False
            map_obj.save()
        else:
            # 새 맵 생성
            width = int(payload.get('width', 30))
            height = int(payload.get('height', 20))
            map_obj = Map.objects.create(
                owner=user,
                name=payload.get('name', '새 맵'),
                width=width,
                height=height,
                tile_size=int(payload.get('tile_size', 32)),
                data=payload.get('data', cls.new_map_data(width, height)),
                is_autosave=False,
            )
        return map_obj

    @classmethod
    def autosave(cls, user: User, payload: dict) -> Map:
        """자동저장 — 유저당 슬롯 1개 유지"""
        cls.validate_map_data(payload.get('data', {}))

        map_obj, _ = Map.objects.update_or_create(
            owner=user,
            is_autosave=True,
            defaults={
                'name': payload.get('name', '자동저장'),
                'width': int(payload.get('width', 30)),
                'height': int(payload.get('height', 20)),
                'tile_size': int(payload.get('tile_size', 32)),
                'data': payload.get('data', {}),
            }
        )
        return map_obj

    @classmethod
    def delete_map(cls, map_id: int, user: User) -> None:
        """맵 삭제"""
        map_obj = cls.get_map(map_id, user)
        map_obj.delete()
