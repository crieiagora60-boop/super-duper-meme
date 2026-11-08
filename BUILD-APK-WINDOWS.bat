@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo Worder Effect - Android APK Builder
echo ==========================================
where node >nul 2>nul || (echo ERRO: instale Node.js LTS primeiro.& pause& exit /b 1)
where npm >nul 2>nul || (echo ERRO: npm nao encontrado.& pause& exit /b 1)
where java >nul 2>nul || (echo ERRO: instale um JDK compativel, recomendado JDK 21.& pause& exit /b 1)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (echo Falha ao instalar dependencias.& pause& exit /b 1)
)
echo Gerando versao web para Android...
call npm run build:mobile
if errorlevel 1 (echo Falha no build web.& pause& exit /b 1)
if not exist android (
  echo Criando projeto Android Capacitor...
  call npx cap add android
  if errorlevel 1 (echo Falha ao criar projeto Android. Verifique a conexao e as dependencias.& pause& exit /b 1)
)
echo Sincronizando arquivos Android...
call npx cap sync android
if errorlevel 1 (echo Falha ao sincronizar Android.& pause& exit /b 1)
if not exist android\gradlew.bat (echo Gradle wrapper nao encontrado.& pause& exit /b 1)
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (echo Compilacao falhou. Abra a pasta android no Android Studio e instale os SDKs solicitados.& pause& exit /b 1)
echo.
echo APK criado em: android\app\build\outputs\apk\debug\app-debug.apk
pause
