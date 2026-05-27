import json
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError, PermissionDenied
from django.views.decorators.http import require_http_methods
from .services import MapService


def _json_error(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse({'error': message}, status=status)


@login_required
@require_http_methods(['GET'])
def map_list(request):
    """GET /api/maps/ — 유저의 맵 목록"""
    maps = MapService.get_user_maps(request.user)
    return JsonResponse({'maps': maps})


@login_required
@require_http_methods(['POST'])
def map_save(request):
    """POST /api/maps/save/ — 맵 저장 (신규 or 업데이트)"""
    try:
        payload = json.loads(request.body)
        map_obj = MapService.save_map(request.user, payload)
        return JsonResponse({'ok': True, 'map': map_obj.to_dict()}, status=201)
    except (json.JSONDecodeError, KeyError):
        return _json_error('잘못된 요청 형식입니다.')
    except ValidationError as e:
        return _json_error(str(e))
    except PermissionDenied as e:
        return _json_error(str(e), status=403)


@login_required
@require_http_methods(['POST'])
def map_autosave(request):
    """POST /api/maps/autosave/ — 자동저장"""
    try:
        payload = json.loads(request.body)
        map_obj = MapService.autosave(request.user, payload)
        return JsonResponse({'ok': True, 'map': map_obj.to_dict()})
    except (json.JSONDecodeError, KeyError):
        return _json_error('잘못된 요청 형식입니다.')
    except ValidationError as e:
        return _json_error(str(e))


@login_required
@require_http_methods(['GET'])
def map_last(request):
    """GET /api/maps/last/ — 마지막 편집 맵 (로그인 시 복구용)"""
    map_obj = MapService.get_last_map(request.user)
    if map_obj is None:
        return JsonResponse({'map': None})
    return JsonResponse({'map': map_obj.to_dict()})


@login_required
@require_http_methods(['GET', 'DELETE'])
def map_detail(request, map_id: int):
    """GET /api/maps/<id>/ — 맵 불러오기 | DELETE — 삭제"""
    try:
        if request.method == 'GET':
            map_obj = MapService.get_map(map_id, request.user)
            return JsonResponse({'map': map_obj.to_dict()})
        else:  # DELETE
            MapService.delete_map(map_id, request.user)
            return JsonResponse({'ok': True})
    except PermissionDenied as e:
        return _json_error(str(e), status=403)
