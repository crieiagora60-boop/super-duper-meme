WORDER EFFECT - COMO GERAR O APK INSTALAVEL

IMPORTANTE
Este ZIP contem o codigo-fonte e a configuracao Capacitor. O APK ainda precisa ser compilado num computador com Android SDK. O ambiente onde este ZIP foi preparado nao possui Android SDK/Gradle instalado e nao conseguiu baixar as dependencias, portanto nao seria correto afirmar que o APK ja esta pronto.

METODO MAIS SIMPLES (WINDOWS)
1. Instale Node.js LTS.
2. Instale Android Studio.
3. Abra Android Studio > SDK Manager e instale Android SDK Platform, Android SDK Build-Tools e Android SDK Command-line Tools.
4. Instale o JDK 21 se o Android Studio nao configurar um JDK compativel.
5. Extraia esta pasta para um local simples, como C:\\WorderEffect.
6. Clique duas vezes em BUILD-APK-WINDOWS.bat e aguarde terminar.
7. O APK de teste sera criado em:
   android\\app\\build\\outputs\\apk\\debug\\app-debug.apk
8. Copie app-debug.apk para o celular Android e instale. Talvez seja necessario permitir instalacao desta fonte nas configuracoes do Android.

METODO MANUAL
Na pasta do projeto, execute:
  npm install
  npm run build:mobile
  npx cap add android   (somente se a pasta android ainda nao existir)
  npx cap sync android
  npx cap open android

No Android Studio, aguarde a sincronizacao do Gradle e escolha Build > Build Bundle(s) / APK(s) > Build APK(s).

REQUISITOS
- Windows, macOS ou Linux para compilar.
- Node.js e npm.
- Android Studio e Android SDK.
- Conexao com a internet na primeira compilacao para baixar dependencias.

OBSERVACAO
O APK gerado e uma versao Android que empacota a aplicacao web via Capacitor. Recursos de processamento pesado de video, Optical Flow/Twixtor e plugins nativos do After Effects nao passam a funcionar automaticamente por estarem dentro de um APK; eles exigem implementacao propria e compatibilidade tecnica.
