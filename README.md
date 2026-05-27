# D2M — Draw to Map

> 타일맵 기반 게임 맵 에디터 | 웹서버컴퓨팅 2026-1학기 AD 프로젝트

## 📌 프로젝트 소개

**D2M(Draw to Map)**은 게임 제작자나 게임 플레이어가 브라우저에서 빠르게 게임 맵을 그리고 공유할 수 있는 웹 에디터입니다.

### 핵심 기능
- 🗺 **타일맵 편집**: 바닥/벽/공허 타일을 브러시·지우개·채우기 도구로 편집
- 🧱 **오토타일링**: 벽 타일이 인접 방향에 따라 자동으로 연결 모양 결정 (16-tile bitmask)
- 📍 **아이콘 배치**: 해골(적), 깃발(목표), 힐팩, 유저(스폰) 아이콘을 레이어 위 자유 배치
- 🗂 **멀티 레이어**: 지형/오브젝트 레이어 분리 편집
- 🔐 **유저 인증**: 회원가입·로그인·로그아웃 (django.contrib.auth)
- 💾 **자동저장**: 편집 중 3초 후 자동저장, 재로그인 시 마지막 작업 복구
- 🔍 **줌/패닝**: 마우스 휠 줌, 우클릭 드래그 패닝

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| 백엔드 | Django 4.2, Django REST Framework |
| 프론트엔드 | Vanilla JS (ES Modules), HTML5 Canvas |
| DB | SQLite (개발) |
| 인증 | django.contrib.auth (세션 기반) |

## 🚀 실행 방법

### 1. 환경 준비
```bash
cd source_code
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. DB 초기화
```bash
python manage.py migrate
python manage.py createsuperuser  # 관리자 계정 (선택)
```

### 3. 서버 실행
```bash
python manage.py runserver
```

브라우저에서 `http://127.0.0.1:8000` 접속

## 📁 프로젝트 구조

```
source_code/
├── d2m/              # Django 설정 (settings, urls, wsgi)
├── accounts/         # 유저 인증 앱
│   ├── services.py   # AccountService (classmethod 패턴)
│   └── views.py      # login, logout, register, me
├── maps/             # 맵 에디터 앱
│   ├── models.py     # Map (JSONField)
│   ├── services.py   # MapService (classmethod 패턴)
│   └── views.py      # REST API (save, load, autosave, delete)
├── templates/        # Django 템플릿
└── static/
    ├── css/editor.css
    └── js/
        ├── config/   # tiles.js, icons.js (확장 포인트)
        ├── core/     # canvas.js, layers.js, autotile.js, tools.js
        └── api.js    # CSRF 포함 fetch 래퍼
```

## 🎮 사용법

| 동작 | 방법 |
|------|------|
| 타일 칠하기 | 팔레트에서 타일 선택 후 캔버스 드래그 |
| 지우기 | 🧹 지우개 선택 또는 `E` 키 |
| 채우기 | 🪣 채우기 선택 또는 `F` 키 |
| 아이콘 배치 | 아이콘 팔레트에서 선택 후 클릭 |
| 줌 | 마우스 휠 |
| 패닝 | 우클릭 드래그 |
| 저장 | 💾 버튼 또는 `Ctrl+S` |
| 새 맵 | `Ctrl+N` |

## 🌐 API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/accounts/register/` | 회원가입 |
| POST | `/accounts/login/` | 로그인 |
| POST | `/accounts/logout/` | 로그아웃 |
| GET | `/accounts/me/` | 현재 유저 정보 |
| GET | `/api/maps/` | 맵 목록 |
| POST | `/api/maps/save/` | 맵 저장 |
| POST | `/api/maps/autosave/` | 자동저장 |
| GET | `/api/maps/last/` | 마지막 편집 맵 |
| GET/DELETE | `/api/maps/<id>/` | 맵 조회/삭제 |

## 📝 환경 변수

개발 환경에서는 `settings.py`의 `SECRET_KEY`를 변경하세요. 프로덕션 배포 시 `.env` 파일로 분리 권장.
