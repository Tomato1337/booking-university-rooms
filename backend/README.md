# Backend — Booking University Rooms

REST API для системы бронирования университетских аудиторий.

## Стек

- **Go** + **Gin** (HTTP framework)
- **PostgreSQL** (pgxpool)
- **JWT** (access + refresh token rotation)

## Быстрый старт

### 1. Настройка окружения

```bash
cp .env.example .env
# Отредактируйте .env: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```

### 2. База данных

```bash
psql $DATABASE_URL -f migrations/000001_init.sql
```

### 3. Запуск

```bash
go run ./cmd/api
```

Сервер стартует на `http://localhost:3000`.

## Структура проекта

```
backend/
├── cmd/api/main.go              # Точка входа, роутер
├── migrations/
│   └── 000001_init.sql          # Схема БД (единая миграция)
└── internal/
    ├── config/config.go         # Конфигурация (env)
    ├── db/db.go                 # pgxpool подключение
    ├── models/models.go         # Типы и модели
    ├── middleware/auth.go       # JWT middleware
    ├── utils/
    │   ├── jwt.go               # JWT / токены
    │   └── response.go          # Хелперы ответов, cursor пагинация
    ├── services/
    │   ├── auth/                # Регистрация, логин, refresh, logout
    │   ├── rooms/               # Поиск, детали, CRUD комнат, оборудование
    │   ├── bookings/            # Создание, список, история, отмена
    │   └── admin/               # Pending список, approve, reject, статистика
    └── handlers/
        ├── auth/
        ├── rooms/
        ├── equipment/
        ├── bookings/
        └── admin/
```

## Переменные окружения

| Переменная | Default | Описание |
|---|---|---|
| `PORT` | `3000` | Порт сервера |
| `HOST` | `0.0.0.0` | Адрес привязки |
| `ENV` | `development` | `development` / `production` |
| `DATABASE_URL` | — | PostgreSQL DSN |
| `JWT_SECRET` | — | Секрет access-токена |
| `JWT_REFRESH_SECRET` | — | Секрет refresh-токена |
| `JWT_ACCESS_TTL` | `15m` | Время жизни access-токена |
| `JWT_REFRESH_TTL` | `720h` | Время жизни refresh-токена (30 дней) |
| `CORS_ORIGINS` | `http://localhost:5173` | Разрешённые origins (через запятую) |
| `LOG_LEVEL` | `info` | Уровень логирования |

## API

Базовый путь: `/api`

### Auth
| Метод | Путь | Доступ |
|---|---|---|
| POST | `/auth/register` | Публичный |
| POST | `/auth/login` | Публичный |
| POST | `/auth/refresh` | Cookie |
| POST | `/auth/logout` | Authenticated |
| GET | `/auth/me` | Authenticated |

### Rooms & Equipment
| Метод | Путь | Доступ |
|---|---|---|
| GET | `/rooms` | Authenticated |
| GET | `/rooms/:roomId` | Authenticated |
| POST | `/rooms` | Admin |
| PUT | `/rooms/:roomId` | Admin |
| DELETE | `/rooms/:roomId` | Admin |
| GET | `/equipment` | Authenticated |

### Bookings
| Метод | Путь | Доступ |
|---|---|---|
| POST | `/bookings` | Authenticated |
| GET | `/bookings/my` | Authenticated |
| GET | `/bookings/my/history` | Authenticated |
| PATCH | `/bookings/:bookingId/cancel` | Authenticated (владелец) |

### Admin
| Метод | Путь | Доступ |
|---|---|---|
| GET | `/admin/bookings/pending` | Admin |
| PATCH | `/admin/bookings/:bookingId/approve` | Admin |
| PATCH | `/admin/bookings/:bookingId/reject` | Admin |
| GET | `/admin/stats` | Admin |
| GET | `/health` | Публичный |

## Docker

```bash
# Запуск всего стека (PostgreSQL + Backend + Frontend)
cp .env.example .env
docker compose up -d
```

## Ключевые особенности реализации

- **Оптимистичная модель бронирования**: пересечение с `pending` допустимо, с `confirmed` — запрещено
- **Каскадная автоотмена**: при approve конфликтующие pending заявки автоматически отклоняются (в транзакции SERIALIZABLE)
- **Refresh token rotation**: каждый refresh отзывает старый токен и выдаёт новый
- **Cursor-based пагинация** на всех list-эндпоинтах
- **In-memory rate limiting** по IP (auth) и user ID (authenticated endpoints)
