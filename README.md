# grades-site

Сайт приложения WatchYourGrade: главная со скачиванием, политика конфиденциальности, FAQ.
Обычный статический сайт (HTML + CSS + немного JS), публикуется через GitHub Pages.

## Что заполнить перед публикацией

1. `assets/config.js`: впиши свой аккаунт вместо `GITHUB_USER` (и имя репозитория, если оно не `grades-site`).
   Пока там `GITHUB_USER`, кнопка скачивания отключена и пишет «Ссылка появится после первого релиза».
2. `signingCertSha256` в том же файле: отпечаток сертификата подписи (когда создашь ключ).
   Получить: `keytool -list -v -keystore agenda-release.jks -alias agenda` и скопировать строку «SHA256».
   Пока поле пустое, блок на странице скрыт.
3. Во всех HTML-файлах есть строка `<meta name="robots" content="noindex, nofollow">`: сайт скрыт от поисковиков.
   Удали её, когда решишь запускаться публично.
4. Проверь в `index.html` строку «Android 7.0 и новее»: она должна совпадать с `minSdk` в `app/build.gradle.kts` (24 = Android 7.0).

## Публикация (один раз)

1. Создай ПУБЛИЧНЫЙ репозиторий `grades-site` на GitHub и залей туда содержимое этой папки.
2. Settings → Pages → Source: «Deploy from a branch», ветка `main`, папка `/ (root)`.
3. Через минуту сайт откроется на `https://ИМЯ.github.io/grades-site/`.

## Как выпускать версию

Релизы лежат в этом же репозитории (раздел Releases), а `latest.json` в корне сайта.

1. Собери подписанный APK (см. `RELEASING.md` в проекте приложения) и переименуй его в `WatchYourGrade.apk`.
   Имя должно быть одинаковым у всех версий: на нём держится ссылка «latest».
2. GitHub → Releases → Draft a new release: тег `v0.3.0`, прикрепи `WatchYourGrade.apk`.
3. Сгенерируй `latest.json` (скрипт из проекта приложения):
   ```
   python tools/make_latest_json.py WatchYourGrade.apk --version-code 300 --version-name 0.3.0 \
     --base-url https://github.com/ИМЯ/grades-site/releases/download/v0.3.0/ \
     --notes "Что нового" > latest.json
   ```
4. Положи `latest.json` в корень этого репозитория, закоммить и запушь. Главная страница сама покажет версию, размер и SHA-256.
5. В приложении в `UpdateConfig.kt` должны стоять:
   - `UPDATE_URL = "https://ИМЯ.github.io/grades-site/latest.json"`
   - `TRUSTED_APK_PREFIX = "https://github.com/ИМЯ/grades-site/releases/download/"`

## Про политику конфиденциальности

Текст описывает то, что приложение делает СЕЙЧАС. Если меняется поведение (новая библиотека, новый сервер,
новые данные), меняй политику в том же коммите и повышай «версию документа» и дату.
Юридическую часть (в том числе соответствие закону Молдовы о защите персональных данных) стоит показать юристу до публичного запуска.
