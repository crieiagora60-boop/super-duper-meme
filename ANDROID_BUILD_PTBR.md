# Como gerar o APK do Worder Effect

Este ZIP agora inclui uma entrada web (`index.html`) e uma configuração Capacitor para transformar o editor em um projeto Android.

## Requisitos
- Node.js 20 ou superior
- Android Studio atualizado
- Android SDK instalado pelo Android Studio
- JDK 17 ou compatível com a versão do Android Gradle Plugin instalada

## No computador
1. Extraia o ZIP.
2. Abra um terminal na pasta `worder-effects-studio-main`.
3. Execute `npm install`.
4. Execute `npm run build:mobile` para compilar a versão web usada pelo app.
5. Execute `npx cap add android` para criar o projeto Android (somente na primeira vez).
6. Execute `npx cap sync android`.
7. Execute `npx cap open android`.
8. No Android Studio, aguarde a sincronização do Gradle.
9. Use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

O APK de debug costuma aparecer em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Observações importantes
- O APK ainda não foi compilado neste ambiente: não há Android SDK/Gradle configurado aqui.
- O código do editor é um projeto web React. O Capacitor cria a camada Android, mas o processamento pesado de vídeo e recursos como Optical Flow/Twixtor real dependem de implementação nativa ou de um motor de processamento compatível. A interface não transforma automaticamente esses recursos em processamento profissional.
- Para gerar APK assinado para distribuição, configure uma chave de assinatura no Android Studio.
