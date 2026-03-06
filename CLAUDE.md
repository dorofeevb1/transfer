# Brio Trade & Logistic — Промпт для AI-ассистента

## Проект

Веб-приложение для управления каталогом закупочных товаров.
Клиент — компания Brio Trade & Logistic (стратегический партнёр по закупкам).

## Стек

- **Frontend:** Angular 15, Angular Material, SCSS, ngx-translate (ru/zh), RxJS
- **Backend:** Django REST Framework, PostgreSQL
- **API URL:** `https://217.26.29.116.sslip.io`
- **Сборка:** `ng build` (frontend/), `python manage.py runserver` (backend/)

## Структура проекта

```
frontend/
  src/app/
    core/                     # Синглтон-сервисы, гварды, интерсепторы
      services/api-service/   # ApiService (HTTP), ProductTableService, AuthService
      interceptors/           # JWT auth interceptor
      guards/                 # AuthGuard
    features/
      products/               # Модуль каталога товаров и RFI
        components/           # table, products-table, page-header, table-controls, rfi-list, rfi-detail, products-container
        dialogs/              # import-dialog, edit-dialog, filter-form, photo-viewer, rfi-create-dialog, rfi-transform-dialog
        models/               # table.interfaces.ts, rfi.interfaces.ts, import.interfaces.ts
        services/             # rfi.service.ts, table-state.service.ts
      auth/                   # Модуль авторизации
      admin/                  # Модуль админ-панели (управление пользователями)
    layout/                   # header, footer
    shared/                   # SharedModule — Angular Material, pipes, directives
  src/assets/i18n/            # ru.json, zh.json — переводы

backend/
  apps/
    tables_app/               # Модели и API каталога продуктов
    rfi_app/                  # Модели и API заявок RFI (в разработке)
```

## Архитектурные правила (Angular 15)

### Модули
- Используем **NgModule** (не standalone-компоненты — это Angular 15)
- Каждый feature-модуль имеет свой routing module (lazy loading через `loadChildren`)
- Все Material-модули реэкспортируются через `SharedModule`

### Компоненты
- Декораторы `@Input()` / `@Output()` (не signal-based — Angular 15)
- Структурные директивы: `*ngIf`, `*ngFor`, `*ngSwitch` (не `@if` / `@for`)
- Именование файлов: `kebab-case` — `my-component.component.ts`
- Каждый компонент = отдельная папка: `.ts`, `.html`, `.scss`, `.spec.ts`
- Стили — SCSS с `ViewEncapsulation` по умолчанию

### Сервисы
- `providedIn: 'root'` для синглтонов
- `ApiService` — единая точка HTTP-запросов (добавляет JWT-токен и Accept-Language)
- Паттерн: feature-service (например `ProductTableService`, `RfiService`) оборачивает `ApiService`
- Используем `BehaviorSubject` + `Observable` для реактивного стейта

### Формы
- `ReactiveFormsModule` (`FormBuilder`, `FormGroup`, `FormControl`, `FormArray`)
- Валидация через `Validators`

### Переводы (i18n)
- Библиотека: `@ngx-translate/core`
- Файлы: `src/assets/i18n/ru.json`, `src/assets/i18n/zh.json`
- В шаблонах: `{{ 'KEY.SUBKEY' | translate }}`
- В коде: `this.translate.instant('KEY')` или `this.translate.get('KEY').subscribe(...)`
- **Всегда добавлять переводы в оба файла** (ru и zh)

### Стили (SCSS)
- Палитра проекта:
  - Основной фон: `#FFFFFF`, серый фон: `#F5F7F9`, `#FAFAFA`
  - Заголовок таблицы: `#1A1A1A` (чёрный), текст: `#FFFFFF`
  - Акцент (красный): `#D91F26` (кнопки, активные вкладки, ховеры)
  - Текст основной: `#333333`, приглушённый: `#999999`
  - Границы: `#E0E0E0`, `#F0F0F0`
- Шрифт: `'Inter', sans-serif`
- Кнопки: `height: 40px`, `border-radius: 4px`, `text-transform: uppercase`, `font-weight: 600`
- Sticky заголовок таблицы: `*matHeaderRowDef="columns; sticky: true"`

### Диалоги
- Используем `MatDialog` для модальных окон
- Структура: `.dialog-header`, `.dialog-content`, `.dialog-actions`
- Кнопка "Закрыть" — `mat-icon-button` с `close` иконкой
- Кнопка подтверждения: красная (`#D91F26`)

## API-паттерны

### Аутентификация
- JWT-токен в `localStorage` под ключом `jwt-token`
- Язык в `localStorage` под ключом `lang` (ru/zh)
- Заголовки: `Authorization: Bearer <token>`, `Accept-Language: <lang>`

### Эндпоинты каталога
- `GET api/products/columns/` — структура таблицы
- `GET api/products/data/?page=0&size=10` — данные с пагинацией
- `POST api/products/import/` — импорт (legacy)
- `POST api/products/import/preview/` — предпросмотр импорта
- `POST api/products/import/commit/` — подтверждение импорта
- `PUT api/products/{id}/` — обновление строки
- `POST api/products/delete/` — массовое удаление
- `POST api/products/export/excel/` / `export/csv/` — экспорт

### Эндпоинты RFI
- `GET api/rfi/?page=0&size=10` — список RFI
- `GET api/rfi/{id}/` — детали RFI
- `POST api/rfi/` — создание
- `POST api/rfi/{id}/status/` — смена статуса
- `GET api/rfi/templates/` — шаблоны
- `GET api/rfi/{id}/transform/preview/` — предпросмотр трансформации
- `POST api/rfi/{id}/transform/confirm/` — подтверждение трансформации

## Роли пользователей

- **Администратор** — полный доступ
- **Товаровед** — импорт, редактирование каталога
- **Менеджер** — только просмотр (кнопка импорта скрыта через `AuthService.isManager()`)
- **Клиент** — ограниченный просмотр

## Правила при работе с кодом

1. **Не ломать существующее.** Перед изменением файла — прочитать его целиком.
2. **Не создавать лишних файлов.** Предпочитать редактирование существующих.
3. **Всегда обновлять переводы** в обоих файлах (ru.json, zh.json).
4. **Регистрировать компоненты** в `declarations` соответствующего NgModule.
5. **Диалоги и компоненты** — в отдельных папках с полным набором файлов.
6. **Проверять сборку** после значительных изменений: `cd frontend && npx ng build`.
7. **Не коммитить автоматически** — только по запросу пользователя.
8. **Fallback для API** — если новый эндпоинт недоступен (404), откатываться на старый.
9. **Минимальные изменения** — не рефакторить и не улучшать код вне задачи.
10. **Серверная пагинация** — не назначать `paginator` на `dataSource`, использовать `(page)` event.
