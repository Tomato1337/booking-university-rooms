# Спецификация Backend API — Система Бронирования Университетских Аудиторий

> **Версия:** 1.0.0  
> **Дата:** 06.04.2026  
> **Статус:** Draft  
> **Автор:** Backend Architecture Team  

---

## Содержание

1. [Executive Summary](#1-executive-summary)
2. [Рекомендация по технологическому стеку](#2-рекомендация-по-технологическому-стеку)
3. [Схема базы данных](#3-схема-базы-данных)
4. [Аутентификация и авторизация](#4-аутентификация-и-авторизация)
5. [Стандарты API](#5-стандарты-api)
6. [API Endpoints — Auth](#6-api-endpoints--auth)
7. [API Endpoints — Rooms](#7-api-endpoints--rooms)
8. [API Endpoints — Bookings](#8-api-endpoints--bookings)
9. [API Endpoints — Admin](#9-api-endpoints--admin)
10. [Бизнес-логика](#10-бизнес-логика)
11. [Операционные аспекты](#11-операционные-аспекты)
12. [План реализации](#12-план-реализации)

---

## 1. Executive Summary

Система бронирования университетских аудиторий — это REST API, обслуживающий SPA-фронтенд (React + Reatom). Система позволяет пользователям искать свободные аудитории по набору фильтров (дата, время, оборудование, вместимость), просматривать детальную информацию о комнате с таймлайном занятости на конкретный день, создавать заявки на бронирование, и отслеживать их статус. Администраторы одобряют или отклоняют заявки через отдельный дашборд.

Ключевые характеристики архитектуры:
- **JWT-аутентификация** с парой access/refresh токенов
- **PostgreSQL** как единственное хранилище данных
- **Cursor-based пагинация** для infinity scroll
- **Оптимистичная модель бронирования**: пересечение с `pending` слотами разрешено, с `occupied` — запрещено
- **Каскадная автоотмена**: при одобрении бронирования конфликтующие `pending` заявки автоматически отклоняются

---

## 2. Рекомендация по технологическому стеку

### Рекомендуемый стек: **Node.js + Fastify**

| Компонент | Технология | Обоснование |
|-----------|------------|-------------|
| **Runtime** | Node.js 22 LTS | Единый язык с фронтендом (TypeScript), упрощает DevX и sharing типов |
| **Framework** | Fastify 5 | Высокая производительность, встроенная JSON-валидация через JSON Schema, отличная экосистема плагинов |
| **ORM** | Drizzle ORM | Type-safe SQL-подобный синтаксис, минимальный overhead, отличная поддержка PostgreSQL, push/pull миграции |
| **Валидация** | Zod + fastify-type-provider-zod | Можно шарить Zod-схемы с фронтендом, автогенерация JSON Schema |
| **БД** | PostgreSQL 16 | ACID, GiST/GIN-индексы, range types для временных интервалов, row-level locking |
| **Миграции** | drizzle-kit | Декларативные миграции из схемы Drizzle |
| **Хеширование** | argon2 | Рекомендация OWASP для хеширования паролей |
| **JWT** | @fastify/jwt | Встроенная интеграция с Fastify |
| **Логирование** | pino (встроен в Fastify) | Структурированный JSON-логгинг, высокая производительность |

### Альтернативные варианты (отклонённые)

| Вариант | Причина отклонения |
|---------|-------------------|
| **Python/FastAPI** | Команда работает в TypeScript-стеке, два языка увеличат когнитивную нагрузку |
| **Go** | Избыточная производительность для ~1K RPS, длиннее время разработки для данной команды |
| **Express.js** | Устаревшая архитектура, медленнее Fastify в 2-3x, нет встроенной валидации |

---

## 3. Схема базы данных

### 3.1 Enum-типы

```sql
-- Роли пользователей
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Статусы бронирований
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');

-- Типы помещений
CREATE TYPE room_type AS ENUM ('lab', 'auditorium', 'seminar', 'conference', 'studio', 'lecture_hall');

-- Назначение бронирования
CREATE TYPE booking_purpose AS ENUM (
  'academic_lecture',
  'research_workshop',
  'collaborative_study',
  'technical_assessment'
);
```

### 3.2 Таблица `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  department    VARCHAR(200),
  role          user_role NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
```

**Поля:**

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | UUID | PK, auto-generated | Уникальный идентификатор |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email (используется для логина) |
| `password_hash` | VARCHAR(255) | NOT NULL | Хеш пароля (argon2) |
| `first_name` | VARCHAR(100) | NOT NULL | Имя |
| `last_name` | VARCHAR(100) | NOT NULL | Фамилия |
| `department` | VARCHAR(200) | NULLABLE | Факультет / кафедра |
| `role` | user_role | NOT NULL, DEFAULT 'user' | Роль в системе |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Дата обновления |

### 3.3 Таблица `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;
```

**Поля:**

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | UUID | PK | Уникальный идентификатор |
| `user_id` | UUID | FK -> users.id, CASCADE | Владелец токена |
| `token_hash` | VARCHAR(255) | NOT NULL, UNIQUE | SHA-256 хеш refresh-токена |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Срок действия |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `revoked_at` | TIMESTAMPTZ | NULLABLE | Дата отзыва (NULL = активен) |

### 3.4 Таблица `rooms`

```sql
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  room_type   room_type NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0),
  building    VARCHAR(200) NOT NULL,
  floor       INTEGER NOT NULL,
  photos      TEXT[] DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX idx_rooms_name_trgm ON rooms USING GIN (name gin_trgm_ops);
CREATE INDEX idx_rooms_capacity ON rooms (capacity);
CREATE INDEX idx_rooms_building ON rooms (building);
CREATE INDEX idx_rooms_is_active ON rooms (is_active) WHERE is_active = true;
```

> **Примечание:** Для индекса `gin_trgm_ops` необходимо расширение `pg_trgm`:
> ```sql
> CREATE EXTENSION IF NOT EXISTS pg_trgm;
> ```

**Поля:**

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | UUID | PK | Уникальный идентификатор |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Отображаемое название (e.g. "LAB_402B") |
| `description` | TEXT | NULLABLE | Полное описание помещения |
| `room_type` | room_type | NOT NULL | Тип помещения |
| `capacity` | INTEGER | NOT NULL, >0 | Максимальная вместимость |
| `building` | VARCHAR(200) | NOT NULL | Здание / корпус |
| `floor` | INTEGER | NOT NULL | Этаж |
| `photos` | TEXT[] | DEFAULT '{}' | Один backend-proxy URL главного фото (`/api/media/rooms/...`); массив сохранён для совместимости |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Активна ли аудитория |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Дата обновления |

### 3.5 Таблица `equipment` (справочник оборудования)

```sql
CREATE TABLE equipment (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(100) NOT NULL UNIQUE,
  icon  VARCHAR(50) NOT NULL
);

-- Предзаполнение
INSERT INTO equipment (name, icon) VALUES
  ('Projector', 'IconVideo'),
  ('Whiteboard', 'IconPresentation'),
  ('Computers', 'IconDeviceDesktop'),
  ('Microphone', 'IconMicrophone'),
  ('Live Stream', 'IconBroadcast'),
  ('Spatial Audio', 'IconVolume'),
  ('Wi-Fi', 'IconWifi'),
  ('Linux Nodes', 'IconTerminal2');
```

### 3.6 Таблица `room_equipment` (связь M:N)

```sql
CREATE TABLE room_equipment (
  room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, equipment_id)
);

-- Индексы
CREATE INDEX idx_room_equipment_equipment_id ON room_equipment (equipment_id);
```

### 3.7 Таблица `bookings`

```sql
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  purpose         booking_purpose NOT NULL,
  booking_date    DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  attendee_count  INTEGER CHECK (attendee_count > 0),
  status          booking_status NOT NULL DEFAULT 'pending',
  admin_id        UUID REFERENCES users(id),
  status_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ограничения
  CONSTRAINT chk_time_range CHECK (start_time < end_time),
  CONSTRAINT chk_time_granularity CHECK (
    EXTRACT(SECOND FROM start_time) = 0 AND
    EXTRACT(SECOND FROM end_time) = 0 AND
    MOD(EXTRACT(MINUTE FROM start_time)::int, 5) = 0 AND
    MOD(EXTRACT(MINUTE FROM end_time)::int, 5) = 0
  )
);

-- Ключевой индекс для проверки пересечений:
-- Быстрый поиск confirmed бронирований для конкретной комнаты на конкретную дату
CREATE INDEX idx_bookings_room_date_status ON bookings (room_id, booking_date, status);

-- Индекс для "My Bookings" (бронирования пользователя)
CREATE INDEX idx_bookings_user_id_date ON bookings (user_id, booking_date DESC, created_at DESC);

-- Индекс для админ-дашборда (pending бронирования)
CREATE INDEX idx_bookings_status_created ON bookings (status, created_at DESC)
  WHERE status = 'pending';

-- Индекс для cursor-based пагинации
CREATE INDEX idx_bookings_created_at ON bookings (created_at DESC, id DESC);
```

**Поля:**

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | UUID | PK | Уникальный идентификатор |
| `user_id` | UUID | FK -> users.id | Пользователь, создавший заявку |
| `room_id` | UUID | FK -> rooms.id | Бронируемая аудитория |
| `title` | VARCHAR(200) | NOT NULL | Название мероприятия |
| `purpose` | booking_purpose | NOT NULL | Назначение бронирования |
| `booking_date` | DATE | NOT NULL | Дата бронирования |
| `start_time` | TIME | NOT NULL | Начало (с гранулярностью 5 мин) |
| `end_time` | TIME | NOT NULL | Конец (с гранулярностью 5 мин) |
| `attendee_count` | INTEGER | >0, NULLABLE | Кол-во участников |
| `status` | booking_status | NOT NULL, DEFAULT 'pending' | Текущий статус |
| `admin_id` | UUID | FK -> users.id, NULLABLE | Админ, обработавший заявку |
| `status_reason` | TEXT | NULLABLE | Причина отклонения (при reject) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Дата создания |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Дата обновления |

### 3.8 ER-диаграмма (текстовое описание)

```
users ──────< refresh_tokens     (1:N)
users ──────< bookings           (1:N, как user_id)
users ──────< bookings           (1:N, как admin_id)
rooms ──────< bookings           (1:N)
rooms ──────< room_equipment ──── equipment   (M:N через связующую таблицу)
```

### 3.9 Миграция создания БД (полный SQL)

```sql
-- 000001_init.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');
CREATE TYPE room_type AS ENUM ('lab', 'auditorium', 'seminar', 'conference', 'studio', 'lecture_hall');
CREATE TYPE booking_purpose AS ENUM ('academic_lecture', 'research_workshop', 'collaborative_study', 'technical_assessment');

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  department    VARCHAR(200),
  role          user_role NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

-- Equipment catalog
CREATE TABLE equipment (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(100) NOT NULL UNIQUE,
  icon  VARCHAR(50) NOT NULL
);

-- Rooms
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  room_type   room_type NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0),
  building    VARCHAR(200) NOT NULL,
  floor       INTEGER NOT NULL,
  photos      TEXT[] DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room-equipment M:N
CREATE TABLE room_equipment (
  room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, equipment_id)
);

-- Bookings
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  purpose         booking_purpose NOT NULL,
  booking_date    DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  attendee_count  INTEGER CHECK (attendee_count > 0),
  status          booking_status NOT NULL DEFAULT 'pending',
  admin_id        UUID REFERENCES users(id),
  status_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_time_range CHECK (start_time < end_time),
  CONSTRAINT chk_time_granularity CHECK (
    EXTRACT(SECOND FROM start_time) = 0 AND
    EXTRACT(SECOND FROM end_time) = 0 AND
    MOD(EXTRACT(MINUTE FROM start_time)::int, 5) = 0 AND
    MOD(EXTRACT(MINUTE FROM end_time)::int, 5) = 0
  )
);

-- Indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_rooms_name_trgm ON rooms USING GIN (name gin_trgm_ops);
CREATE INDEX idx_rooms_capacity ON rooms (capacity);
CREATE INDEX idx_rooms_is_active ON rooms (is_active) WHERE is_active = true;
CREATE INDEX idx_room_equipment_equipment_id ON room_equipment (equipment_id);
CREATE INDEX idx_bookings_room_date_status ON bookings (room_id, booking_date, status);
CREATE INDEX idx_bookings_user_id_date ON bookings (user_id, booking_date DESC, created_at DESC);
CREATE INDEX idx_bookings_status_created ON bookings (status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_bookings_created_at ON bookings (created_at DESC, id DESC);

-- Seed equipment
INSERT INTO equipment (name, icon) VALUES
  ('Projector', 'IconVideo'),
  ('Whiteboard', 'IconPresentation'),
  ('Computers', 'IconDeviceDesktop'),
  ('Microphone', 'IconMicrophone'),
  ('Live Stream', 'IconBroadcast'),
  ('Spatial Audio', 'IconVolume'),
  ('Wi-Fi', 'IconWifi'),
  ('Linux Nodes', 'IconTerminal2');
```

---

## 4. Аутентификация и авторизация

### 4.1 Конфигурация токенов

| Параметр | Значение | Обоснование |
|----------|----------|-------------|
| Access Token TTL | 15 минут | Короткий срок минимизирует окно уязвимости |
| Refresh Token TTL | 30 дней | Удобство — пользователь не перелогинивается месяц |
| Access Token алгоритм | HS256 | Достаточно для монолита, можно перейти на RS256 при микросервисах |
| Refresh Token хранение | httpOnly cookie + хеш в БД | Защита от XSS |
| Access Token хранение | Возвращается в теле ответа, хранится в памяти (Reatom atom) | Не персистится, безопаснее localStorage |

### 4.2 Структура Access Token (JWT payload)

```json
{
  "sub": "uuid-пользователя",
  "email": "user@university.edu",
  "role": "user",
  "iat": 1712400000,
  "exp": 1712400900
}
```

### 4.3 Потоки аутентификации

#### 4.3.1 Регистрация

```
POST /api/auth/register
  ↓
Валидация входных данных (email, password, firstName, lastName)
  ↓
Проверка уникальности email
  ↓
Хеширование пароля (argon2)
  ↓
Создание записи в users (role = 'user')
  ↓
Генерация access token + refresh token
  ↓
Сохранение SHA-256(refresh_token) в refresh_tokens
  ↓
Response: { accessToken } + Set-Cookie: accessToken (httpOnly, Secure, SameSite=Strict, Path=/api) + refreshToken (httpOnly, Secure, SameSite=Strict, Path=/api/auth)
```

#### 4.3.2 Логин

```
POST /api/auth/login
  ↓
Поиск пользователя по email
  ↓
Верификация пароля (argon2.verify)
  ↓
Генерация access token + refresh token
  ↓
Сохранение SHA-256(refresh_token) в refresh_tokens
  ↓
Response: { accessToken } + Set-Cookie: accessToken + refreshToken
```

#### 4.3.3 Обновление токена

```
POST /api/auth/refresh
  ↓
Извлечение refresh token из cookie
  ↓
Вычисление SHA-256(refresh_token)
  ↓
Поиск в refresh_tokens: token_hash совпадает, revoked_at IS NULL, expires_at > now()
  ↓
Если не найден → 401 Unauthorized
  ↓
Ротация: revoke текущий refresh token, генерация нового
  ↓
Response: { accessToken } + Set-Cookie: новый accessToken + новый refreshToken
```

> **Важно — Refresh Token Rotation:** При каждом использовании refresh-токен отзывается и выпускается новый. Это позволяет обнаружить кражу токена: если украденный токен используется после ротации, система обнаружит повторное использование отозванного токена и может отозвать всю цепочку.

#### 4.3.4 Логаут

```
POST /api/auth/logout
  ↓
Извлечение refresh token из cookie
  ↓
Отзыв refresh token (revoked_at = now())
  ↓
Очистка accessToken и refreshToken cookie
  ↓
Response: 204 No Content
```

### 4.4 Middleware авторизации

```typescript
// Декоратор для routes
// Уровни доступа:
// - authenticate: проверяет наличие и валидность access token
// - requireRole('admin'): проверяет authenticate + role === 'admin'

// Основной формат: httpOnly cookie accessToken (Path=/api)
// Совместимость для API клиентов:
// Authorization: Bearer <access_token>
```

### 4.5 Матрица доступа

| Endpoint | Гость | User | Admin |
|----------|-------|------|-------|
| `POST /api/auth/register` | Yes | No (уже залогинен) | No |
| `POST /api/auth/login` | Yes | No | No |
| `POST /api/auth/refresh` | Yes (нужен cookie) | Yes | Yes |
| `POST /api/auth/logout` | Yes | Yes | Yes |
| `GET /api/auth/me` | No | Yes | Yes |
| `GET /api/rooms` | No | Yes | Yes |
| `GET /api/rooms/:id` | No | Yes | Yes |
| `POST /api/rooms` | No | No | Yes |
| `PUT /api/rooms/:id` | No | No | Yes |
| `DELETE /api/rooms/:id` | No | No | Yes |
| `GET /api/equipment` | No | Yes | Yes |
| `POST /api/bookings` | No | Yes | Yes |
| `GET /api/bookings/my` | No | Yes | Yes |
| `GET /api/bookings/my/history` | No | Yes | Yes |
| `PATCH /api/bookings/:id/cancel` | No | Yes (owner) | Yes |
| `GET /api/admin/bookings/pending` | No | No | Yes |
| `PATCH /api/admin/bookings/:id/approve` | No | No | Yes |
| `PATCH /api/admin/bookings/:id/reject` | No | No | Yes |

---

## 5. Стандарты API

### 5.1 Базовый URL

```
/api/v1
```

> Для MVP допустимо использовать `/api` без версии, но рекомендуется сразу закладывать `/api/v1` для будущей совместимости.

### 5.2 Формат успешного ответа

```json
// Единичный ресурс
{
  "data": { ... },
  "meta": {}
}

// Коллекция с пагинацией
{
  "data": [ ... ],
  "meta": {
    "total": 42,
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNC0wNlQxMDowMDowMFoiLCJpZCI6ImFiYzEyMyJ9",
    "hasMore": true
  }
}
```

### 5.3 Формат ошибки

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Запрошенный временной интервал пересекается с подтверждённым бронированием",
    "details": {
      "conflicting_booking_id": "uuid",
      "conflicting_time_range": "14:00-16:00"
    }
  }
}
```

### 5.4 Формат ошибок валидации

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ошибка валидации входных данных",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Некорректный формат email",
          "code": "invalid_format"
        },
        {
          "field": "password",
          "message": "Пароль должен содержать минимум 8 символов",
          "code": "too_short"
        }
      ]
    }
  }
}
```

### 5.5 Коды ошибок

| HTTP Status | Error Code | Описание |
|-------------|------------|----------|
| 400 | `VALIDATION_ERROR` | Ошибка валидации входных данных |
| 400 | `INVALID_TIME_RANGE` | start_time >= end_time или не кратно 5 мин |
| 400 | `INVALID_DATE` | Дата в прошлом |
| 400 | `CAPACITY_EXCEEDED` | attendee_count > room.capacity |
| 401 | `UNAUTHORIZED` | Отсутствует или невалидный access token |
| 401 | `TOKEN_EXPIRED` | Access token истёк |
| 401 | `REFRESH_TOKEN_INVALID` | Refresh token невалиден, отозван или истёк |
| 403 | `FORBIDDEN` | Недостаточно прав (не admin) |
| 403 | `NOT_OWNER` | Попытка отменить чужое бронирование |
| 404 | `ROOM_NOT_FOUND` | Комната не найдена |
| 404 | `BOOKING_NOT_FOUND` | Бронирование не найдено |
| 409 | `EMAIL_ALREADY_EXISTS` | Email уже зарегистрирован |
| 409 | `BOOKING_CONFLICT` | Пересечение с confirmed бронированием |
| 409 | `BOOKING_ALREADY_PROCESSED` | Бронирование уже обработано (не pending) |
| 422 | `BOOKING_IN_PAST` | Попытка создать бронирование на прошедшее время |
| 429 | `RATE_LIMIT_EXCEEDED` | Превышен лимит запросов |
| 500 | `INTERNAL_ERROR` | Внутренняя ошибка сервера |

### 5.6 Cursor-based пагинация

Для infinity scroll используется cursor-based пагинация. Cursor — это Base64-закодированная строка JSON с полями, по которым идёт сортировка.

**Параметры запроса:**

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `limit` | integer | 20 | Количество элементов (1-100) |
| `cursor` | string | null | Курсор следующей страницы |

**Как это работает:**

```
// Cursor = Base64({ created_at: "2026-04-06T10:00:00Z", id: "abc-123" })

// SQL для следующей страницы:
WHERE (created_at, id) < ($cursor_created_at, $cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT $limit + 1   -- берём на 1 больше, чтобы определить hasMore
```

**Ответ:**

```json
{
  "data": [...],
  "meta": {
    "hasMore": true,
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNC0wNlQxMDowMDowMFoiLCJpZCI6ImFiYzEyMyJ9"
  }
}
```

### 5.7 Формат дат и времени

| Поле | Формат | Пример |
|------|--------|--------|
| `booking_date` | `YYYY-MM-DD` | `2026-04-06` |
| `start_time` / `end_time` | `HH:mm` | `09:00`, `14:30` |
| `created_at` / `updated_at` | ISO 8601 (UTC) | `2026-04-06T10:30:00.000Z` |

---

## 6. API Endpoints — Auth

### 6.1 `POST /api/auth/register`

**Доступ:** Публичный (только для незалогиненных)

**Request Body:**

```json
{
  "email": "john.doe@university.edu",
  "password": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe",
  "department": "Faculty of Computer Science"
}
```

**Валидация:**

| Поле | Правила |
|------|---------|
| `email` | Обязательно, валидный email, max 255 символов |
| `password` | Обязательно, min 8 символов, хотя бы 1 заглавная, 1 строчная, 1 цифра |
| `firstName` | Обязательно, 1-100 символов |
| `lastName` | Обязательно, 1-100 символов |
| `department` | Необязательно, max 200 символов |

**Response 201 Created:**

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@university.edu",
      "firstName": "John",
      "lastName": "Doe",
      "department": "Faculty of Computer Science",
      "role": "user",
      "createdAt": "2026-04-06T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:**

```
Set-Cookie: accessToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=900
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000
```

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 409 | `EMAIL_ALREADY_EXISTS` | Email уже зарегистрирован |
| 400 | `VALIDATION_ERROR` | Невалидные поля |

---

### 6.2 `POST /api/auth/login`

**Доступ:** Публичный

**Request Body:**

```json
{
  "email": "john.doe@university.edu",
  "password": "SecureP@ss123"
}
```

**Валидация:**

| Поле | Правила |
|------|---------|
| `email` | Обязательно, валидный email |
| `password` | Обязательно, непустая строка |

**Response 200 OK:**

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@university.edu",
      "firstName": "John",
      "lastName": "Doe",
      "department": "Faculty of Computer Science",
      "role": "user",
      "createdAt": "2026-04-06T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:** Аналогично регистрации: `accessToken` и `refreshToken`.

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 401 | `UNAUTHORIZED` | Неверный email или пароль (один код для обоих случаев — не раскрываем, что именно неверно) |
| 400 | `VALIDATION_ERROR` | Невалидные поля |

---

### 6.3 `POST /api/auth/refresh`

**Доступ:** Публичный (требуется валидный refresh token в cookie)

**Request:** Без тела. Refresh token извлекается из httpOnly cookie.

**Response 200 OK:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:** Новый `accessToken` и новый `refreshToken`.

**Бизнес-логика:**
1. Извлечь refresh token из cookie `refreshToken`
2. Вычислить `SHA-256(token)`
3. Найти в `refresh_tokens` по `token_hash` WHERE `revoked_at IS NULL` AND `expires_at > now()`
4. Если не найден -> 401
5. Отозвать текущий токен: `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $id`
6. Сгенерировать новый refresh token, сохранить его хеш
7. Вернуть новый access token + set новый access cookie + set новый refresh cookie

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 401 | `REFRESH_TOKEN_INVALID` | Cookie отсутствует, токен невалиден/отозван/истёк |

---

### 6.4 `POST /api/auth/logout`

**Доступ:** Публичный endpoint. Если refresh cookie есть, токен отзывается; access token не обязателен.

**Request:** Без тела. Refresh token извлекается из cookie.

**Response 204 No Content**

**Бизнес-логика:**
1. Отозвать refresh token из cookie (если есть)
2. Очистить `accessToken` и `refreshToken` cookie

**Cookies Cleared:**

```
Set-Cookie: accessToken=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0
```

---

### 6.5 `GET /api/auth/me`

**Доступ:** Authenticated (`accessToken` httpOnly cookie; `Authorization: Bearer` поддерживается для API клиентов)

**Response 200 OK:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@university.edu",
    "firstName": "John",
    "lastName": "Doe",
    "department": "Faculty of Computer Science",
    "role": "user",
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
}
```

---

## 7. API Endpoints — Rooms

### 7.1 `GET /api/rooms` — Поиск аудиторий

**Доступ:** Authenticated

**Query Parameters:**

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `date` | string (YYYY-MM-DD) | Текущая дата | Дата для проверки доступности |
| `search` | string | — | Поиск по названию (partial match, case-insensitive) |
| `timeFrom` | string (HH:mm) | — | Начало интересующего интервала |
| `timeTo` | string (HH:mm) | — | Конец интересующего интервала |
| `equipment` | string (CSV UUID) | — | ID оборудования через запятую, e.g. `id1,id2,id3` |
| `minCapacity` | integer | — | Минимальная вместимость |
| `limit` | integer | 20 | Количество (1-100) |
| `cursor` | string | — | Cursor для пагинации |

**Примеры запросов:**

```
GET /api/rooms?date=2026-04-06
GET /api/rooms?date=2026-04-06&search=LAB&minCapacity=30
GET /api/rooms?date=2026-04-06&timeFrom=09:00&timeTo=14:00&equipment=uuid1,uuid2
GET /api/rooms?date=2026-04-06&cursor=eyJ...&limit=10
```

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "room-uuid-1",
      "name": "LAB_402B",
      "roomType": "lab",
      "capacity": 45,
      "building": "Building C",
      "floor": 4,
      "equipment": [
        { "id": "eq-uuid-1", "name": "Computers", "icon": "IconDeviceDesktop" }
      ],
      "availability": {
        "isAvailable": true,
        "label": "AVAILABLE NOW",
        "availableTimeRange": "09:00 — 18:00"
      }
    },
    {
      "id": "room-uuid-2",
      "name": "SEM_12",
      "roomType": "seminar",
      "capacity": 20,
      "building": "Building A",
      "floor": 1,
      "equipment": [
        { "id": "eq-uuid-2", "name": "Whiteboard", "icon": "IconPresentation" }
      ],
      "availability": {
        "isAvailable": false,
        "label": "BOOKED UNTIL 16:00",
        "availableTimeRange": null
      }
    }
  ],
  "meta": {
    "hasMore": true,
    "nextCursor": "eyJ..."
  }
}
```

**Бизнес-логика расчёта `availability`:**

1. Для каждой комнаты на указанную `date` выбрать все `confirmed` бронирования
2. Вычислить свободные интервалы в рамках рабочего дня (08:00-22:00)
3. Если `timeFrom`/`timeTo` указаны — проверить, есть ли пересечение свободного времени с запрошенным интервалом
4. `isAvailable: true` — если прямо сейчас (или в запрошенном интервале) есть свободное время
5. `label`:
   - Если сейчас свободна: `"AVAILABLE NOW"`
   - Если сейчас занята: `"BOOKED UNTIL HH:mm"` (конец ближайшего occupied слота)
   - Если `date` не сегодня и есть свободное время: `"AVAILABLE"`
6. `availableTimeRange`: первый непрерывный свободный интервал, e.g. `"09:00 — 18:00"`

**SQL-фильтрация по оборудованию:**

```sql
-- Комнаты, у которых есть ВСЕ запрошенные виды оборудования
WHERE r.id IN (
  SELECT re.room_id
  FROM room_equipment re
  WHERE re.equipment_id = ANY($equipment_ids)
  GROUP BY re.room_id
  HAVING COUNT(DISTINCT re.equipment_id) = $equipment_count
)
```

**Пагинация:**

Cursor-based по `(name, id)` — сортировка по имени (алфавитная), при совпадении — по id.

```sql
WHERE (r.name, r.id) > ($cursor_name, $cursor_id)
ORDER BY r.name ASC, r.id ASC
LIMIT $limit + 1
```

---

### 7.2 `GET /api/rooms/:roomId` — Детальная информация о комнате

**Доступ:** Authenticated

**Path Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `roomId` | UUID | ID комнаты |

**Query Parameters:**

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `date` | string (YYYY-MM-DD) | Текущая дата | Дата для отображения таймлайна |

**Response 200 OK:**

```json
{
  "data": {
    "id": "room-uuid-1",
    "name": "LAB_402_OMEGA",
    "description": "State-of-the-art laboratory equipped with...",
    "roomType": "lab",
    "capacity": 45,
    "building": "Building C",
    "floor": 4,
    "photos": [
      "https://storage.example.com/rooms/lab402/photo1.jpg"
    ],
    "equipment": [
      { "id": "eq-uuid-1", "name": "4K Projector", "icon": "IconVideo" },
      { "id": "eq-uuid-2", "name": "Fiber Uplink", "icon": "IconWifi" },
      { "id": "eq-uuid-3", "name": "Spatial Audio", "icon": "IconVolume" },
      { "id": "eq-uuid-4", "name": "Linux Nodes", "icon": "IconTerminal2" }
    ],
    "timeSlots": [
      {
        "startTime": "08:00",
        "endTime": "10:00",
        "status": "available",
        "booking": null
      },
      {
        "startTime": "10:00",
        "endTime": "12:00",
        "status": "occupied",
        "booking": {
          "id": "booking-uuid-1",
          "title": "Physics Lecture",
          "userId": "user-uuid-other"
        }
      },
      {
        "startTime": "12:00",
        "endTime": "13:00",
        "status": "available",
        "booking": null
      },
      {
        "startTime": "13:00",
        "endTime": "14:00",
        "status": "pending",
        "booking": {
          "id": "booking-uuid-2",
          "title": "Research Meeting",
          "userId": "user-uuid-other"
        }
      },
      {
        "startTime": "14:00",
        "endTime": "16:30",
        "status": "yours",
        "booking": {
          "id": "booking-uuid-3",
          "title": "Advanced Architecture II",
          "userId": "current-user-uuid"
        }
      },
      {
        "startTime": "16:30",
        "endTime": "22:00",
        "status": "available",
        "booking": null
      }
    ],
    "userBookingsToday": [
      {
        "id": "booking-uuid-3",
        "title": "Advanced Architecture II",
        "startTime": "14:00",
        "endTime": "16:30",
        "status": "confirmed"
      }
    ]
  }
}
```

**Бизнес-логика формирования `timeSlots`:**

Рабочий день: `08:00` — `22:00` (конфигурируемо).

1. Выбрать все бронирования для `room_id` на `date` WHERE `status IN ('confirmed', 'pending')`
2. Построить таймлайн:
   - `confirmed` бронирования -> `status: "occupied"`
   - `pending` бронирования -> `status: "pending"`
   - Бронирования текущего пользователя (любого статуса) -> `status: "yours"`
   - Остальное время -> `status: "available"`
3. Объединить соседние слоты одного статуса
4. Отсортировать по `startTime`

> **Приоритет статусов при пересечениях:** `yours` > `occupied` > `pending` > `available`
> Если у текущего пользователя есть confirmed бронирование — это `yours`, а не `occupied`.

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 404 | `ROOM_NOT_FOUND` | Комната не существует или is_active = false |

---

### 7.3 `POST /api/rooms` — Создание комнаты (Admin)

**Доступ:** Admin only

**Request Body (`application/json`, совместимость без загрузки файла):**

```json
{
  "name": "LAB_402B",
  "description": "Modern computer laboratory with...",
  "roomType": "lab",
  "capacity": 45,
  "building": "Building C",
  "floor": 4,
  "photos": ["/api/media/rooms/room-uuid/photo.jpg"],
  "equipmentIds": ["eq-uuid-1", "eq-uuid-2"]
}
```

**Request Body (`multipart/form-data`, основной UI-flow):**

| Поле | Правила |
|------|---------|
| `name`, `description`, `roomType`, `capacity`, `building`, `floor`, `openTime`, `closeTime` | То же, что JSON |
| `equipmentIds` | Повторяемое поле с UUID оборудования |
| `photo` | Необязательно, одно изображение PNG/JPG/WEBP до 5MB |

Backend загружает `photo` в MinIO bucket `room-photos`, в БД сохраняет один URL вида `/api/media/rooms/<roomId>/<fileName>`. Браузер не обращается к MinIO напрямую.

**Валидация:**

| Поле | Правила |
|------|---------|
| `name` | Обязательно, 1-100 символов, уникально |
| `description` | Необязательно |
| `roomType` | Обязательно, одно из enum значений |
| `capacity` | Обязательно, integer > 0 |
| `building` | Обязательно, 1-200 символов |
| `floor` | Обязательно, integer |
| `photos` | Необязательно, максимум один URL; для UI вместо этого используется multipart `photo` |
| `equipmentIds` | Необязательно, массив UUID |

**Response 201 Created:**

```json
{
  "data": {
    "id": "new-room-uuid",
    "name": "LAB_402B",
    "description": "Modern computer laboratory with...",
    "roomType": "lab",
    "capacity": 45,
    "building": "Building C",
    "floor": 4,
    "photos": ["/api/media/rooms/new-room-uuid/photo.jpg"],
    "equipment": [
      { "id": "eq-uuid-1", "name": "Projector", "icon": "IconVideo" }
    ],
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
}
```

---

### 7.4 `PUT /api/rooms/:roomId` — Обновление комнаты (Admin)

**Доступ:** Admin only

**Request Body:** Аналогично POST. Для `multipart/form-data` без поля `photo` текущее фото сохраняется; `removePhoto=true` удаляет текущее фото; новый `photo` заменяет старое.

**Response 200 OK:** Обновлённый объект комнаты (формат как в POST).

---

### 7.5 `DELETE /api/rooms/:roomId` — Удаление комнаты (Admin)

**Доступ:** Admin only

**Бизнес-логика:** Soft delete — `is_active = false`. Существующие бронирования НЕ отменяются автоматически.

**Response 204 No Content**

---

### 7.6 `GET /api/media/rooms/:objectKey` — Фото аудитории

**Доступ:** Public внутри backend API proxy.

Backend читает объект из MinIO по ключу `rooms/<roomId>/<fileName>` и стримит байты с исходным `Content-Type`. Этот endpoint используется URL-ами из `rooms.photos`.

---

### 7.6 `GET /api/equipment` — Список оборудования

**Доступ:** Authenticated

**Response 200 OK:**

```json
{
  "data": [
    { "id": "eq-uuid-1", "name": "Projector", "icon": "IconVideo" },
    { "id": "eq-uuid-2", "name": "Whiteboard", "icon": "IconPresentation" },
    { "id": "eq-uuid-3", "name": "Computers", "icon": "IconDeviceDesktop" },
    { "id": "eq-uuid-4", "name": "Microphone", "icon": "IconMicrophone" },
    { "id": "eq-uuid-5", "name": "Live Stream", "icon": "IconBroadcast" },
    { "id": "eq-uuid-6", "name": "Spatial Audio", "icon": "IconVolume" },
    { "id": "eq-uuid-7", "name": "Wi-Fi", "icon": "IconWifi" },
    { "id": "eq-uuid-8", "name": "Linux Nodes", "icon": "IconTerminal2" }
  ]
}
```

> Этот endpoint нужен фронтенду для рендеринга фильтра оборудования с корректными ID.

---

## 8. API Endpoints — Bookings

### 8.1 `POST /api/bookings` — Создание бронирования

**Доступ:** Authenticated

**Request Body:**

```json
{
  "roomId": "room-uuid-1",
  "title": "Advanced AI Seminar",
  "purpose": "academic_lecture",
  "bookingDate": "2026-04-10",
  "startTime": "14:00",
  "endTime": "16:30",
  "attendeeCount": 35
}
```

**Валидация:**

| Поле | Правила |
|------|---------|
| `roomId` | Обязательно, UUID, комната должна существовать и быть active |
| `title` | Обязательно, 1-200 символов |
| `purpose` | Обязательно, одно из enum значений |
| `bookingDate` | Обязательно, YYYY-MM-DD, не в прошлом |
| `startTime` | Обязательно, HH:mm, кратно 5 мин |
| `endTime` | Обязательно, HH:mm, кратно 5 мин, > startTime |
| `attendeeCount` | Необязательно, integer > 0, <= room.capacity |

**Бизнес-логика (КРИТИЧНО):**

```
1. Валидация входных данных
2. Проверка существования комнаты (is_active = true)
3. Проверка: bookingDate + startTime НЕ в прошлом
4. Проверка: attendeeCount <= room.capacity (если указан)
5. ** ПРОВЕРКА ПЕРЕСЕЧЕНИЙ (в транзакции с SELECT ... FOR UPDATE): **
   a. Выбрать все бронирования для room_id на booking_date
      WHERE status = 'confirmed'
      AND start_time < $endTime
      AND end_time > $startTime
   b. Если найдены confirmed бронирования с пересечением -> 409 BOOKING_CONFLICT
   c. Пересечение с pending бронированиями — ДОПУСТИМО (не блокирует)
6. Создать запись bookings со status = 'pending'
7. Вернуть созданное бронирование
```

**Response 201 Created:**

```json
{
  "data": {
    "id": "new-booking-uuid",
    "roomId": "room-uuid-1",
    "roomName": "LAB_402B",
    "title": "Advanced AI Seminar",
    "purpose": "academic_lecture",
    "bookingDate": "2026-04-10",
    "startTime": "14:00",
    "endTime": "16:30",
    "attendeeCount": 35,
    "status": "pending",
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
}
```

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Невалидные поля |
| 400 | `INVALID_TIME_RANGE` | startTime >= endTime или не кратно 5 мин |
| 400 | `CAPACITY_EXCEEDED` | attendeeCount > room.capacity |
| 404 | `ROOM_NOT_FOUND` | Комната не найдена |
| 409 | `BOOKING_CONFLICT` | Пересечение с confirmed бронированием |
| 422 | `BOOKING_IN_PAST` | Дата+время в прошлом |

---

### 8.2 `GET /api/bookings/my` — Мои бронирования (активные)

**Доступ:** Authenticated

**Query Parameters:**

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `search` | string | — | Поиск по названию комнаты, ID бронирования, локации |
| `limit` | integer | 20 | Количество (1-100) |
| `cursor` | string | — | Cursor для пагинации |

**Фильтрация "активных":**

```sql
WHERE user_id = $currentUserId
  AND status IN ('pending', 'confirmed')
  AND (booking_date > CURRENT_DATE
       OR (booking_date = CURRENT_DATE AND end_time > CURRENT_TIME))
ORDER BY booking_date ASC, start_time ASC, id ASC
```

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "booking-uuid-1",
      "bookingId": "#BK-88291-Q",
      "roomId": "room-uuid-1",
      "roomName": "RM_402 QUANTUM LAB",
      "title": "Advanced AI Seminar",
      "bookingDate": "2026-04-10",
      "startTime": "14:00",
      "endTime": "16:30",
      "building": "SCIENCE BLOCK B",
      "status": "confirmed",
      "createdAt": "2026-04-06T10:00:00.000Z"
    }
  ],
  "meta": {
    "hasMore": false,
    "nextCursor": null
  }
}
```

> **Поле `bookingId`:** Генерируется на бэкенде как human-readable ID: `#BK-{последние5цифрHashId}-{первая буква roomType uppercase}`. Хранить его отдельно необязательно — можно генерировать из `id` + `roomType` при сериализации. Формат: `#BK-{crc32(uuid) mod 100000}-{roomTypeInitial}`.

---

### 8.3 `GET /api/bookings/my/history` — Прошедшие бронирования

**Доступ:** Authenticated

**Query Parameters:**

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `search` | string | — | Поиск по названию комнаты, ID бронирования, локации |
| `limit` | integer | 20 | Количество (1-100) |
| `cursor` | string | — | Cursor для пагинации |

**Фильтрация "истории":**

```sql
WHERE user_id = $currentUserId
  AND (
    status IN ('rejected', 'cancelled')
    OR (booking_date < CURRENT_DATE)
    OR (booking_date = CURRENT_DATE AND end_time <= CURRENT_TIME)
  )
ORDER BY booking_date DESC, start_time DESC, id DESC
```

**Response 200 OK:** Формат аналогичен `/my`, но отсортированы в обратном хронологическом порядке.

---

### 8.4 `PATCH /api/bookings/:bookingId/cancel` — Отмена бронирования

**Доступ:** Authenticated (только владелец бронирования)

**Path Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `bookingId` | UUID | ID бронирования |

**Request:** Без тела.

**Бизнес-логика:**

```
1. Найти бронирование по ID
2. Проверить, что user_id === текущий пользователь (или admin)
3. Проверить, что status IN ('pending', 'confirmed')
   — Нельзя отменить уже rejected/cancelled
4. Проверить, что booking_date + start_time ещё не прошли
   — Нельзя отменить бронирование, которое уже началось
5. Обновить status = 'cancelled', updated_at = now()
```

**Response 200 OK:**

```json
{
  "data": {
    "id": "booking-uuid",
    "status": "cancelled",
    "updatedAt": "2026-04-06T11:00:00.000Z"
  }
}
```

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 404 | `BOOKING_NOT_FOUND` | Бронирование не найдено |
| 403 | `NOT_OWNER` | Пользователь не владелец бронирования |
| 409 | `BOOKING_ALREADY_PROCESSED` | Статус не pending/confirmed |
| 422 | `BOOKING_IN_PAST` | Бронирование уже началось |

---

## 9. API Endpoints — Admin

### 9.1 `GET /api/admin/bookings/pending` — Список pending бронирований

**Доступ:** Admin only

**Query Parameters:**

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `search` | string | — | Поиск по имени пользователя, комнате, корпусу, факультету |
| `limit` | integer | 20 | Количество (1-100) |
| `cursor` | string | — | Cursor для пагинации |

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "booking-uuid-1",
      "user": {
        "id": "user-uuid",
        "firstName": "Johnathan",
        "lastName": "Doe",
        "initials": "JD",
        "department": "Graduate Research Lab"
      },
      "room": {
        "id": "room-uuid",
        "name": "AUDITORIUM B-12",
        "building": "Engineering Block"
      },
      "title": "Physics Workshop",
      "purpose": "research_workshop",
      "bookingDate": "2026-04-06",
      "startTime": "14:00",
      "endTime": "16:30",
      "attendeeCount": 30,
      "status": "pending",
      "createdAt": "2026-04-05T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 24,
    "hasMore": true,
    "nextCursor": "eyJ..."
  }
}
```

> **Обоснование `total`:** Для admin-дашборда total нужен для отображения MetricCard "Pending Requests: 24". Считается отдельным `COUNT(*)` запросом с теми же фильтрами.

---

### 9.2 `PATCH /api/admin/bookings/:bookingId/approve` — Одобрение бронирования

**Доступ:** Admin only

**Path Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `bookingId` | UUID | ID бронирования |

**Request:** Без тела.

**Бизнес-логика (КРИТИЧНО — в транзакции):**

```
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

1. Найти бронирование по ID (SELECT ... FOR UPDATE)
2. Проверить, что status = 'pending'
   -> Иначе: 409 BOOKING_ALREADY_PROCESSED
3. Проверить, что booking_date + start_time ещё не прошли
   -> Иначе: 422 BOOKING_IN_PAST
4. ** ПОВТОРНАЯ ПРОВЕРКА ПЕРЕСЕЧЕНИЙ: **
   — Возможно, пока заявка ожидала, другое бронирование было confirmed
   SELECT id FROM bookings
   WHERE room_id = $roomId
     AND booking_date = $bookingDate
     AND status = 'confirmed'
     AND start_time < $endTime
     AND end_time > $startTime
     FOR UPDATE;
   -> Если найдены -> 409 BOOKING_CONFLICT
5. Обновить бронирование:
   UPDATE bookings SET status = 'confirmed', admin_id = $adminUserId, updated_at = now()
   WHERE id = $bookingId;
6. ** КАСКАДНАЯ АВТООТМЕНА: **
   — Найти все pending бронирования, которые конфликтуют с только что одобренным:
   UPDATE bookings
   SET status = 'rejected',
       admin_id = $adminUserId,
       status_reason = 'Auto-rejected: conflicting with approved booking ' || $bookingId,
       updated_at = now()
   WHERE room_id = $roomId
     AND booking_date = $bookingDate
     AND status = 'pending'
     AND id != $bookingId
     AND start_time < $endTime
     AND end_time > $startTime;
7. Собрать список автоотклонённых бронирований для ответа

COMMIT;
```

**Response 200 OK:**

```json
{
  "data": {
    "booking": {
      "id": "booking-uuid",
      "status": "confirmed",
      "updatedAt": "2026-04-06T11:00:00.000Z"
    },
    "autoRejected": [
      {
        "id": "booking-uuid-2",
        "userId": "user-uuid-2",
        "title": "Conflicting meeting",
        "startTime": "14:30",
        "endTime": "15:30",
        "reason": "Auto-rejected: conflicting with approved booking booking-uuid"
      }
    ]
  }
}
```

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 404 | `BOOKING_NOT_FOUND` | Бронирование не найдено |
| 409 | `BOOKING_ALREADY_PROCESSED` | Статус не pending |
| 409 | `BOOKING_CONFLICT` | Появился конфликт с другим confirmed бронированием |
| 422 | `BOOKING_IN_PAST` | Бронирование уже в прошлом |

---

### 9.3 `PATCH /api/admin/bookings/:bookingId/reject` — Отклонение бронирования

**Доступ:** Admin only

**Path Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `bookingId` | UUID | ID бронирования |

**Request Body:**

```json
{
  "reason": "Room is reserved for maintenance on this date"
}
```

| Поле | Правила |
|------|---------|
| `reason` | Необязательно, max 500 символов |

**Бизнес-логика:**

```
1. Найти бронирование по ID
2. Проверить, что status = 'pending'
3. Обновить:
   status = 'rejected',
   admin_id = $adminUserId,
   status_reason = $reason,
   updated_at = now()
```

**Response 200 OK:**

```json
{
  "data": {
    "id": "booking-uuid",
    "status": "rejected",
    "statusReason": "Room is reserved for maintenance on this date",
    "updatedAt": "2026-04-06T11:00:00.000Z"
  }
}
```

**Ошибки:**

| HTTP | Code | Условие |
|------|------|---------|
| 404 | `BOOKING_NOT_FOUND` | Бронирование не найдено |
| 409 | `BOOKING_ALREADY_PROCESSED` | Статус не pending |

---

### 9.4 `GET /api/admin/stats` — Статистика для дашборда

**Доступ:** Admin only

**Response 200 OK:**

```json
{
  "data": {
    "pendingCount": 24,
    "occupancyRate": 88,
    "todayBookingsCount": 15,
    "totalRooms": 42,
    "totalActiveRooms": 40
  }
}
```

**Расчёт `occupancyRate`:**

```sql
-- Процент занятости на текущий день
-- (суммарное время confirmed бронирований) / (кол-во активных комнат * рабочие часы * 60 мин) * 100

SELECT
  ROUND(
    COALESCE(
      SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0
    ) / (
      (SELECT COUNT(*) FROM rooms WHERE is_active = true) * 14 * 60  -- 14 часов рабочего дня (08:00-22:00)
    ) * 100
  ) AS occupancy_rate
FROM bookings b
WHERE b.booking_date = CURRENT_DATE
  AND b.status = 'confirmed';
```

---

## 10. Бизнес-логика

### 10.1 Алгоритм проверки пересечений (Overlap Detection)

Два временных интервала `[A_start, A_end)` и `[B_start, B_end)` пересекаются тогда и только тогда, когда:

```
A_start < B_end AND A_end > B_start
```

**SQL-выражение для поиска конфликтующих confirmed бронирований:**

```sql
SELECT id, start_time, end_time
FROM bookings
WHERE room_id = $roomId
  AND booking_date = $bookingDate
  AND status = 'confirmed'
  AND start_time < $requestedEndTime
  AND end_time > $requestedStartTime;
```

### 10.2 Логика каскадной автоотмены

При одобрении бронирования (approve):

```
ВХОД: bookingId (только что одобренное бронирование)

1. Получить room_id, booking_date, start_time, end_time одобренного бронирования
2. Найти все pending бронирования, пересекающиеся с ним:

   SELECT id, user_id, title, start_time, end_time
   FROM bookings
   WHERE room_id = $roomId
     AND booking_date = $bookingDate
     AND status = 'pending'
     AND id != $bookingId
     AND start_time < $approvedEndTime
     AND end_time > $approvedStartTime;

3. Для каждого найденного:
   UPDATE bookings
   SET status = 'rejected',
       admin_id = $adminId,
       status_reason = 'Auto-rejected: time slot conflict with approved booking',
       updated_at = now()
   WHERE id = $conflictingId;

4. Вернуть список автоотклонённых в ответе (для информирования админа)
```

### 10.3 Построение TimeSlots для Room Detail

```
ВХОД: roomId, date, currentUserId

1. Определить рабочий день: dayStart = 08:00, dayEnd = 22:00

2. Выбрать все бронирования:
   SELECT id, user_id, title, start_time, end_time, status
   FROM bookings
   WHERE room_id = $roomId
     AND booking_date = $date
     AND status IN ('confirmed', 'pending')
   ORDER BY start_time ASC;

3. Инициализировать timeline = []
4. currentTime = dayStart

5. Для каждого бронирования booking (в порядке start_time):
   a. Если currentTime < booking.start_time:
      — Добавить available слот: [currentTime, booking.start_time]
   b. Определить статус:
      — Если booking.user_id === currentUserId -> "yours"
      — Если booking.status === 'confirmed' -> "occupied"
      — Если booking.status === 'pending' -> "pending"
   c. Добавить слот: [booking.start_time, booking.end_time, status, booking]
   d. currentTime = max(currentTime, booking.end_time)

6. Если currentTime < dayEnd:
   — Добавить available слот: [currentTime, dayEnd]

7. Обработка пересечений pending слотов:
   — Если два pending слота пересекаются, отображать оба отдельно
   — Если pending и confirmed пересекаются (не должно быть, но defensive):
     confirmed выигрывает
```

> **Примечание о пересечениях pending:** Поскольку несколько pending бронирований могут пересекаться, таймлайн строится из всех бронирований, и при наложении слотов pending/pending — показываются оба (фронтенд рендерит их с пропорциональной шириной). Для упрощения MVP, при наложении pending слотов — отображать один (ближайший по created_at).

### 10.4 Расчёт availability для карточки комнаты (Room Card)

```
ВХОД: roomId, date, [timeFrom, timeTo]

1. Выбрать confirmed бронирования на date
2. Вычислить свободные интервалы в рамках [08:00, 22:00]
3. Если timeFrom/timeTo указаны:
   — Проверить, что запрошенный интервал [timeFrom, timeTo] полностью свободен
   — isAvailable = true если свободен
4. Если timeFrom/timeTo НЕ указаны:
   — isAvailable = true если есть хоть один свободный интервал
5. label:
   — Если date === today:
     — Если текущее время попадает в свободный интервал -> "AVAILABLE NOW"
     — Если текущее время попадает в занятый интервал ->
       найти ближайший конец occupied слота -> "BOOKED UNTIL HH:mm"
     — Если все слоты заняты -> "FULLY BOOKED"
   — Если date !== today:
     — Если есть свободное время -> "AVAILABLE"
     — Иначе -> "FULLY BOOKED"
6. availableTimeRange:
   — Первый свободный интервал (ближайший к timeFrom, если указан)
   — Формат: "HH:mm — HH:mm"
```

### 10.5 Матрица RBAC (Role-Based Access Control)

```
Resource          Action        user      admin
──────────────────────────────────────────────────
rooms             list          Yes       Yes
rooms             get           Yes       Yes
rooms             create        No        Yes
rooms             update        No        Yes
rooms             delete        No        Yes
equipment         list          Yes       Yes
bookings          create        Yes       Yes
bookings          cancel_own    Yes       Yes (any)
bookings          list_own      Yes       Yes
bookings          list_pending  No        Yes
bookings          approve       No        Yes
bookings          reject        No        Yes
stats             view          No        Yes
```

---

## 11. Операционные аспекты

### 11.1 CORS-конфигурация

```typescript
// fastify-cors configuration
{
  origin: [
    'http://localhost:5173',     // Vite dev server
    'https://booking.university.edu'  // Production
  ],
  credentials: true,            // Для httpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400                 // Preflight cache: 24h
}
```

### 11.2 Rate Limiting

| Endpoint группа | Лимит | Окно |
|----------------|-------|------|
| `POST /api/auth/login` | 5 запросов | 15 минут (per IP) |
| `POST /api/auth/register` | 3 запроса | 1 час (per IP) |
| `POST /api/auth/refresh` | 10 запросов | 1 минута (per IP) |
| `POST /api/bookings` | 10 запросов | 1 минута (per user) |
| Остальные authenticated | 100 запросов | 1 минута (per user) |
| Остальные public | 30 запросов | 1 минута (per IP) |

**Реализация:** `@fastify/rate-limit` с Redis store (или in-memory для MVP).

**Response при превышении (429 Too Many Requests):**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "details": {
      "retryAfter": 45
    }
  }
}
```

Headers:
```
Retry-After: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712404500
```

### 11.3 Логирование

**Структурированный JSON-лог (pino):**

```json
{
  "level": "info",
  "time": "2026-04-06T10:00:00.000Z",
  "reqId": "req-uuid",
  "method": "POST",
  "url": "/api/bookings",
  "userId": "user-uuid",
  "statusCode": 201,
  "responseTime": 45,
  "msg": "Booking created"
}
```

**Уровни логирования:**

| Уровень | Что логируем |
|---------|-------------|
| `error` | Необработанные ошибки, ошибки БД, критические сбои |
| `warn` | Rate limit exceeded, невалидные токены, подозрительная активность |
| `info` | Создание/одобрение/отклонение бронирования, регистрация, логин |
| `debug` | SQL-запросы (только в dev), детали валидации |

### 11.4 Мониторинг

**Health Check endpoint:**

```
GET /api/health

Response 200:
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400,
  "database": "connected"
}
```

**Рекомендуемые метрики (для Prometheus/Grafana):**

- `http_requests_total` — counter по method, route, status
- `http_request_duration_seconds` — histogram
- `db_query_duration_seconds` — histogram
- `bookings_created_total` — counter
- `bookings_approved_total` — counter
- `bookings_auto_rejected_total` — counter
- `active_refresh_tokens_gauge` — gauge

### 11.5 Безопасность

| Угроза | Мера противодействия |
|--------|---------------------|
| SQL Injection | Parameterized queries (Drizzle ORM) |
| XSS через API | Refresh token в httpOnly cookie, sanitize output |
| CSRF | SameSite=Strict cookie, CORS whitelist |
| Brute-force login | Rate limiting на auth endpoints |
| Token theft | Short-lived access token (15 min), refresh rotation |
| Privilege escalation | Server-side role check на каждом endpoint |
| Mass assignment | Explicit field whitelisting в Zod schemas |
| Password leak | Argon2 hashing, никогда не возвращаем password_hash |
| Timing attack | Constant-time comparison для token verification |

### 11.6 Deployment

**Рекомендуемая конфигурация:**

```yaml
# docker-compose.yml (development)
services:
  api:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/booking
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CORS_ORIGIN: http://localhost:5173
      NODE_ENV: development
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: booking
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d booking"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

**Переменные окружения:**

| Переменная | Описание | Default |
|-----------|----------|---------|
| `PORT` | Порт сервера | 3000 |
| `HOST` | Хост | 0.0.0.0 |
| `DATABASE_URL` | Connection string PostgreSQL | — |
| `JWT_SECRET` | Секрет для access token | — |
| `JWT_REFRESH_SECRET` | Секрет для refresh token | — |
| `JWT_ACCESS_TTL` | TTL access token | 15m |
| `JWT_REFRESH_TTL` | TTL refresh token | 30d |
| `CORS_ORIGIN` | Разрешённые origins | http://localhost:5173 |
| `RATE_LIMIT_MAX` | Глобальный лимит | 100 |
| `NODE_ENV` | Окружение | development |
| `LOG_LEVEL` | Уровень логирования | info |

### 11.7 Структура проекта (Backend)

```
backend/
├── src/
│   ├── app.ts                    # Fastify app factory
│   ├── server.ts                 # Entry point, start server
│   ├── config/
│   │   └── env.ts                # Environment variables parsing (Zod)
│   ├── db/
│   │   ├── client.ts             # Drizzle client instance
│   │   ├── schema/
│   │   │   ├── users.ts          # users table schema
│   │   │   ├── rooms.ts          # rooms, equipment, room_equipment
│   │   │   ├── bookings.ts       # bookings table schema
│   │   │   ├── refresh-tokens.ts # refresh_tokens table schema
│   │   │   └── index.ts          # Re-export all schemas
│   │   └── migrations/           # Drizzle migrations
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts    # Route definitions
│   │   │   ├── auth.service.ts   # Business logic
│   │   │   ├── auth.schemas.ts   # Zod validation schemas
│   │   │   └── auth.utils.ts     # Token helpers
│   │   ├── rooms/
│   │   │   ├── rooms.routes.ts
│   │   │   ├── rooms.service.ts
│   │   │   └── rooms.schemas.ts
│   │   ├── bookings/
│   │   │   ├── bookings.routes.ts
│   │   │   ├── bookings.service.ts
│   │   │   └── bookings.schemas.ts
│   │   └── admin/
│   │       ├── admin.routes.ts
│   │       ├── admin.service.ts
│   │       └── admin.schemas.ts
│   ├── plugins/
│   │   ├── auth.plugin.ts        # JWT verification, decorators
│   │   ├── cors.plugin.ts        # CORS config
│   │   └── rate-limit.plugin.ts  # Rate limiting
│   ├── shared/
│   │   ├── errors.ts             # Custom error classes
│   │   ├── pagination.ts         # Cursor encode/decode helpers
│   │   └── types.ts              # Shared TypeScript types
│   └── test/
│       ├── helpers/
│       │   └── test-server.ts    # Test server factory
│       ├── auth.test.ts
│       ├── rooms.test.ts
│       └── bookings.test.ts
├── drizzle.config.ts             # Drizzle Kit config
├── tsconfig.json
├── package.json
├── Dockerfile
└── .env.example
```

---

## 12. План реализации

### Фаза 1 — MVP (Неделя 1-2)

| Задача | Приоритет | Зависимости |
|--------|-----------|-------------|
| Инициализация проекта (Fastify + TypeScript + Drizzle) | P0 | — |
| Схема БД + миграция | P0 | — |
| Auth: register, login, logout, refresh, me | P0 | БД |
| JWT middleware (authenticate, requireRole) | P0 | Auth |
| Rooms: GET /rooms (базовый поиск) | P0 | Auth middleware |
| Rooms: GET /rooms/:id (с timeSlots) | P0 | Auth middleware |
| Bookings: POST /bookings (с overlap detection) | P0 | Rooms |
| Bookings: GET /bookings/my | P1 | Auth |
| Bookings: PATCH /bookings/:id/cancel | P1 | Bookings |

### Фаза 2 — Admin + Polish (Неделя 3)

| Задача | Приоритет | Зависимости |
|--------|-----------|-------------|
| Admin: GET /admin/bookings/pending | P0 | Auth admin middleware |
| Admin: PATCH approve (с каскадной автоотменой) | P0 | Overlap logic |
| Admin: PATCH reject | P0 | — |
| Admin: GET /admin/stats | P1 | — |
| Rooms CRUD (POST, PUT, DELETE) для admin | P1 | Admin middleware |
| Bookings: GET /bookings/my/history | P1 | — |
| Equipment: GET /equipment | P1 | — |

### Фаза 3 — Hardening (Неделя 4)

| Задача | Приоритет | Зависимости |
|--------|-----------|-------------|
| Rate limiting | P1 | — |
| Error handling (глобальный error handler) | P0 | — |
| Input sanitization audit | P1 | — |
| Pagination: cursor-based для всех list endpoints | P1 | — |
| Health check endpoint | P2 | — |
| Docker compose + seed data | P1 | — |
| Integration tests | P1 | Всё выше |
| API documentation (OpenAPI/Swagger) | P2 | — |

### Открытые вопросы

| # | Вопрос | Влияние | Рекомендация |
|---|--------|---------|-------------|
| 1 | Нужна ли email-нотификация при approve/reject? | Добавляет зависимость (SMTP/SendGrid) | Отложить на Фазу 4 |
| 2 | Нужна ли возможность повторной подачи rejected заявки? | Влияет на UI flow | Пока пользователь создаёт новую заявку вручную |
| 3 | Фиксированный рабочий день 08:00-22:00 или per-room? | Влияет на схему БД | Начать с глобальной конфигурации, per-room — позже |
| 4 | Нужен ли WebSocket/SSE для real-time обновления статусов? | Существенно усложняет архитектуру | Отложить; для MVP — polling или refetch on focus |
| 5 | Загрузка фотографий комнат — через этот API или отдельный file storage? | Влияет на инфраструктуру | Реализовано: S3-compatible MinIO + backend proxy `/api/media/rooms/...` |
| 6 | Soft delete для бронирований или только status change? | Влияет на аудит | Status change достаточно для всех кейсов |
| 7 | Ограничение количества pending бронирований на пользователя? | Предотвращение спама | Рекомендую: max 10 active (pending+confirmed) бронирований на пользователя |

### Ключевые риски

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|-----------|
| Race condition при одновременном одобрении двух пересекающихся бронирований | Средняя | Высокое (двойное бронирование) | SERIALIZABLE transaction + SELECT FOR UPDATE |
| Производительность поиска комнат с расчётом availability | Низкая (для текущих объёмов) | Среднее | Индексы, денормализация при необходимости |
| Истечение access token во время длительной сессии | Высокая | Низкое | Frontend interceptor для автоматического refresh |
| Невалидная дата/время из-за таймзоны | Средняя | Среднее | Все даты в UTC, frontend конвертирует |

---

## Приложение A: Пример cURL-запросов

### Регистрация

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@university.edu",
    "password": "SecureP@ss123",
    "firstName": "John",
    "lastName": "Doe",
    "department": "Computer Science"
  }'
```

### Логин

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john.doe@university.edu",
    "password": "SecureP@ss123"
  }'
```

### Поиск комнат

```bash
curl -X GET "http://localhost:3000/api/rooms?date=2026-04-10&minCapacity=30&search=LAB" \
  -H "Authorization: Bearer eyJ..."
```

### Создание бронирования

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-uuid",
    "title": "AI Seminar",
    "purpose": "academic_lecture",
    "bookingDate": "2026-04-10",
    "startTime": "14:00",
    "endTime": "16:30",
    "attendeeCount": 35
  }'
```

### Одобрение бронирования (Admin)

```bash
curl -X PATCH http://localhost:3000/api/admin/bookings/booking-uuid/approve \
  -H "Authorization: Bearer eyJ..."
```

---

## Динамические справочники зданий и целей

Названия зданий и целей бронирования не хранятся во frontend i18n. Клиент
передаёт текущий язык интерфейса через `X-Locale: ru|en`, backend возвращает
локализованный `label`. Если язык не передан или неизвестен, используется `ru`.

### Здания

- `GET /api/buildings` возвращает активные здания: `{ code, label }[]`.
- В `rooms.building` хранится стабильный `code`.
- Ответы комнат дополнительно содержат `buildingLabel` для отображения.
- `GET /api/rooms` принимает `building=<code>`; если параметра нет, backend
  использует `aviamotornaya`.
- Create/update комнаты отклоняет неизвестный или неактивный building code.
- Начальные значения: `aviamotornaya`, `narod-opolchenie`.

### Цели бронирования

- `GET /api/booking-purposes` возвращает активные цели: `{ code, label }[]`.
- В `bookings.purpose` хранится стабильный `code`.
- Create booking отклоняет неизвестную или неактивную цель.
- Admin CRUD:
  - `GET /api/admin/booking-purposes`
  - `POST /api/admin/booking-purposes`
  - `PUT /api/admin/booking-purposes/{code}`
  - `DELETE /api/admin/booking-purposes/{code}` — soft deactivate
  - `PATCH /api/admin/booking-purposes/{code}/reactivate`
  - `DELETE /api/admin/booking-purposes/{code}/hard` — окончательное удаление цели и связанных бронирований
- `code` цели после создания не редактируется; labels и sort order редактируются.
- Hard delete каскадно удаляет все `bookings`, где `purpose = code`; UI обязан предупреждать администратора.

---

## Приложение B: Zod-схемы (пример)

```typescript
// src/modules/auth/auth.schemas.ts
import { z } from "zod"

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase, one lowercase, and one digit"
  ),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  department: z.string().max(200).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// src/modules/bookings/bookings.schemas.ts
const timeRegex = /^([01]\d|2[0-3]):([0-5][05])$/

export const createBookingSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(1).max(200),
  purpose: z.string().min(1),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(timeRegex, "Time must be HH:mm in 5-minute steps"),
  endTime: z.string().regex(timeRegex, "Time must be HH:mm in 5-minute steps"),
  attendeeCount: z.number().int().positive().optional(),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "startTime must be before endTime", path: ["endTime"] }
)

// src/modules/rooms/rooms.schemas.ts
export const roomSearchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(100).optional(),
  building: z.string().min(1).default("aviamotornaya"),
  timeFrom: z.string().regex(/^([01]\d|2[0-3]):([0-5][05])$/).optional(),
  timeTo: z.string().regex(/^([01]\d|2[0-3]):([0-5][05])$/).optional(),
  equipment: z.string().optional(), // CSV UUIDs, parsed in handler
  minCapacity: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})
```

---

## Приложение C: Маппинг Frontend <-> Backend

| Frontend компонент | Backend endpoint | Данные |
|-------------------|-----------------|--------|
| `RoomsPage` (FilterCard + RoomCard list) | `GET /api/rooms` | Список комнат с availability |
| `RoomDetailPage` (TimeGrid + BookingForm) | `GET /api/rooms/:id?date=` | Детали комнаты + timeSlots |
| `RoomDetailPage` -> "Confirm Booking" | `POST /api/bookings` | Создание бронирования |
| `BookingsPage` -> Active tab | `GET /api/bookings/my` | Активные бронирования |
| `BookingsPage` -> History tab | `GET /api/bookings/my/history` | Прошедшие бронирования |
| `BookingRow` -> "Cancel" button | `PATCH /api/bookings/:id/cancel` | Отмена бронирования |
| `DashboardPage` (MetricCards) | `GET /api/admin/stats` | Статистика |
| `DashboardPage` (AdminBookingRow list) | `GET /api/admin/bookings/pending` | Pending бронирования |
| `AdminBookingRow` -> Approve button | `PATCH /api/admin/bookings/:id/approve` | Одобрение |
| `AdminBookingRow` -> Reject button | `PATCH /api/admin/bookings/:id/reject` | Отклонение |
| `AppSidebar` -> UserCard | `GET /api/auth/me` | Данные пользователя |
| `AppSidebar` -> Logout icon | `POST /api/auth/logout` | Выход |
| FilterCard -> Equipment filter | `GET /api/equipment` | Список оборудования |
