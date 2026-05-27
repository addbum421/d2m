import json
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError, PermissionDenied
from django.views.decorators.http import require_http_methods
from django.utils.html import escapejs
from .services import MapService


def _json_error(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse({'error': message}, status=status)


# ── 페이지 뷰 ──────────────────────────────────────

def index_view(request):
    """메인 페이지 — 공개 맵 브라우저"""
    q     = request.GET.get('q', '').strip()
    game  = request.GET.get('game', '').strip()
    stage = request.GET.get('stage', '').strip()
    maps  = MapService.search_maps(query=q, game=game, stage=stage)
    return render(request, 'maps/index.html', {
        'maps': maps,
        'q': q,
        'filter_game': game,
        'filter_stage': stage,
    })


def map_viewer(request, map_id: int):
    """공개 맵 열람 페이지 (read-only)"""
    map_obj = MapService.get_map_public(map_id)
    map_dict = map_obj.to_dict()
    return render(request, 'maps/viewer.html', {
        'map':      map_dict,                   # Django 템플릿 태그용 (dict)
        'map_json': json.dumps(map_dict),       # JS용 JSON 문자열
        'can_copy': request.user.is_authenticated,
        'is_owner': request.user.is_authenticated and map_obj.owner == request.user,
    })


@login_required
def editor_view(request):
    """에디터 페이지"""
    return render(request, 'maps/editor.html', {'user': request.user})


# ── REST API ──────────────────────────────────────

@require_http_methods(['GET'])
def map_list(request):
    """GET /api/maps/ — 내 맵 목록 (로그인 필요)"""
    if not request.user.is_authenticated:
        return _json_error('로그인이 필요합니다.', 401)
    maps = MapService.get_user_maps(request.user)
    return JsonResponse({'maps': maps})


@require_http_methods(['GET'])
def map_search(request):
    """GET /api/maps/search/ — 공개 맵 검색"""
    q     = request.GET.get('q', '').strip()
    game  = request.GET.get('game', '').strip()
    stage = request.GET.get('stage', '').strip()
    maps  = MapService.search_maps(query=q, game=game, stage=stage)
    return JsonResponse({'maps': maps})


@login_required
@require_http_methods(['POST'])
def map_save(request):
    """POST /api/maps/save/ — 맵 저장"""
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


@require_http_methods(['GET'])
def map_last(request):
    """GET /api/maps/last/ — 마지막 편집 맵"""
    if not request.user.is_authenticated:
        return JsonResponse({'map': None})
    map_obj = MapService.get_last_map(request.user)
    return JsonResponse({'map': map_obj.to_dict() if map_obj else None})


@require_http_methods(['GET', 'DELETE'])
def map_detail(request, map_id: int):
    """GET /api/maps/<id>/ — 공개 열람 | DELETE — 본인만 삭제"""
    try:
        if request.method == 'GET':
            map_obj = MapService.get_map_public(map_id)
            return JsonResponse({'map': map_obj.to_dict()})
        else:  # DELETE
            if not request.user.is_authenticated:
                return _json_error('로그인이 필요합니다.', 401)
            MapService.delete_map(map_id, request.user)
            return JsonResponse({'ok': True})
    except PermissionDenied as e:
        return _json_error(str(e), status=403)


@login_required
@require_http_methods(['POST'])
def map_copy(request, map_id: int):
    """POST /api/maps/<id>/copy/ — 맵 복사 (내 계정으로)"""
    try:
        copied = MapService.copy_map(map_id, request.user)
        return JsonResponse({'ok': True, 'map': copied.to_dict()})
    except Exception as e:
        return _json_error(str(e))
