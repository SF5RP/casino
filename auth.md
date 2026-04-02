# Auth Service Integration

Документ для остальных сервисов, которые хотят использовать центральную авторизацию через `auth-service`.

## Что предоставляет сервис

- Discord OAuth2 login
- выдачу `access_token` и `refresh_token`
- API для получения текущего пользователя
- API для обновления access token
- централизованное хранение пользователей и ролей

Базовый production URL в примерах ниже:

```text
https://auth.example.com
```

Во внутренних запросах API используется префикс:

```text
https://auth.example.com/api
```

## Основные endpoints

- `GET /api/login`
- `GET /api/callback`
- `POST /api/refresh`
- `GET /api/me`
- `GET /health`

## Базовый сценарий интеграции

1. Пользователь в другом сервисе нажимает кнопку входа.
2. Сервис или frontend перенаправляет пользователя на `auth-service`.
3. `auth-service` отправляет пользователя в Discord OAuth2.
4. После успешного входа `auth-service` создаёт или обновляет пользователя.
5. `auth-service` генерирует `access_token` и `refresh_token`.
6. Пользователь возвращается на callback URL с токенами в query string.
7. Клиент сохраняет токены и использует `access_token` для вызова `GET /api/me`.

## Самый простой вариант для других frontend-сервисов

Если другой frontend не хочет реализовывать свой OAuth callback, используйте `auth-service` как отдельную страницу входа:

1. Открывайте `https://auth.example.com/login` или `https://auth.example.com/api/login`.
2. После успешной авторизации пользователь окажется внутри `auth-service`.
3. Ваш основной продукт может читать сессию через общий SSO-шлюз только если вы отдельно внедрите обмен токенами между доменами.

Этот вариант подходит, если `auth-service` остаётся отдельным кабинетом авторизации и управления профилем.

## Рекомендуемый вариант для других сервисов

Если другие сервисы должны логинить пользователя у себя в интерфейсе, используйте схему reverse proxy или общий auth gateway.

Идея:

- пользователь открывает ваш сервис `app.example.com`
- при необходимости входа вы редиректите его на `https://auth.example.com/api/login?return_to=...`
- после Discord login токены выдаёт `auth-service`
- дальше ваш gateway или frontend должен сохранить токены и использовать их для вызова `auth-service`

Сейчас сервис уже поддерживает `return_to` и signed `state`.

По умолчанию callback после Discord ведёт на:

```text
{FRONTEND_URL}/callback?access_token=...&refresh_token=...
```

Если передан разрешённый `return_to`, редирект пойдёт туда.

## Что нужно, если другой сервис хочет свой callback

Для multi-service сценария используйте `return_to`.

Пример желаемого потока:

1. Другой сервис редиректит пользователя на:

```text
https://auth.example.com/api/login?return_to=https://app.example.com/auth/callback
```

2. `auth-service` валидирует `return_to` по whitelist из `ALLOWED_RETURN_URLS`.
3. После Discord callback сервис редиректит пользователя на:

```text
https://app.example.com/auth/callback?access_token=...&refresh_token=...
```

`auth-service` подписывает `state` и сам восстанавливает `return_to` на callback этапе.

## Как вызывать API после логина

### Получить текущего пользователя

Запрос:

```http
GET /api/me
Authorization: Bearer <access_token>
```

Ответ:

```json
{
  "id": 1,
  "discord_id": "123456789012345678",
  "username": "Username",
  "discriminator": "0",
  "avatar": "https://cdn.discordapp.com/avatars/...",
  "role": "user",
  "created_at": "2026-03-30T10:00:00Z"
}
```

### Обновить access token

Запрос:

```http
POST /api/refresh
Content-Type: application/json
```

Body:

```json
{
  "refresh_token": "<refresh_token>"
}
```

Ответ:

```json
{
  "access_token": "<new_access_token>"
}
```

## Как хранить токены в других сервисах

Минимально допустимо:

- `access_token` хранить краткоживущим
- `refresh_token` хранить осторожно
- отправлять `access_token` только в `Authorization: Bearer ...`

Лучше:

- не хранить refresh token в `localStorage`
- использовать `HttpOnly` cookie через backend-for-frontend или gateway
- обновлять access token на серверной стороне

Текущий frontend `auth-service` хранит токены в browser cookies через JS. Для внутренних корпоративных сервисов безопаснее перейти на server-managed cookie model.

## Что должен знать backend другого сервиса

Если другой backend хочет доверять `auth-service`, есть два варианта:

### Вариант 1. Просто проксировать `/api/me`

Другой backend получает `Authorization` header от клиента и вызывает:

```http
GET https://auth.example.com/api/me
Authorization: Bearer <access_token>
```

Плюсы:

- просто внедрить
- нет дублирования логики проверки токенов

Минусы:

- зависимость от сети между сервисами
- на каждый запрос нужен внешний вызов

### Вариант 2. Валидировать JWT локально

Другой backend сам проверяет `access_token` тем же `JWT_SECRET`.

Плюсы:

- быстрее
- меньше сетевых вызовов

Минусы:

- нужно централизованно управлять `JWT_SECRET`
- сервисы сильнее связаны между собой

Для микросервисной схемы лучше перейти на отдельный публичный JWK/JWKS или introspection endpoint, но в текущей реализации этого нет.

## Минимальные требования к интеграции

- знать публичный URL `auth-service`
- знать API base URL `auth-service`
- использовать одинаковый `JWT_SECRET`, если планируется локальная валидация JWT
- использовать точный `DISCORD_REDIRECT_URI`, зарегистрированный в Discord Developer Portal
- добавить callback URL сервиса в `ALLOWED_RETURN_URLS`

## Ограничения текущей реализации

- whitelist callback URL задаётся вручную через `ALLOWED_RETURN_URLS`
- нет отдельного machine-to-machine introspection endpoint
- нет JWKS endpoint для безопасной распределённой проверки JWT

## Что рекомендуется сделать дальше

Если сервис должен стать общей авторизацией для всей экосистемы, следующим этапом стоит добавить:

1. server-side cookie flow для браузерных клиентов
2. endpoint introspection или JWKS для остальных backend-сервисов
3. отдельную документацию по ролям и ACL

## Быстрая памятка для команды

- логин: `GET /api/login`
- логин c возвратом в другой сервис: `GET /api/login?return_to=https://app.example.com/auth/callback`
- профиль текущего пользователя: `GET /api/me`
- обновление access token: `POST /api/refresh`
- callback Discord должен совпадать с `DISCORD_REDIRECT_URI`
- внешний callback должен быть добавлен в `ALLOWED_RETURN_URLS`
