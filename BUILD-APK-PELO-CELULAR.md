# Gerar o APK usando somente o celular

Você não precisa instalar Android Studio nem ter computador. A compilação acontece nos servidores do GitHub Actions.

## O que é necessário
- Uma conta gratuita no GitHub.
- O ZIP do projeto extraído no celular.
- Navegador do celular.

## Passos
1. No navegador, entre em https://github.com e crie uma conta ou entre na sua conta.
2. Crie um repositório novo, por exemplo `worder-effect-android`.
3. Extraia este ZIP no celular usando o gerenciador de arquivos.
4. Dentro do repositório no GitHub, use **Add file > Upload files** e envie todos os arquivos e pastas que estão dentro de `worder-effects-studio-main` (incluindo a pasta oculta `.github`). Não envie apenas o ZIP compactado.
5. Confirme em **Commit changes**.
6. Abra a aba **Actions** do repositório. O fluxo **Build Android APK** deve iniciar automaticamente. Se não iniciar, abra esse fluxo e toque em **Run workflow**.
7. Aguarde o fluxo terminar com um visto verde. Abra a execução concluída, desça até **Artifacts** e baixe `worder-effect-debug-apk`.
8. Extraia o arquivo baixado e toque em `app-debug.apk` para instalar. O Android pode pedir autorização para instalar apps dessa origem.

## Se o fluxo falhar
Abra a execução em Actions, toque no passo vermelho e copie a mensagem de erro. Não instale APK de fontes desconhecidas fora desse fluxo.

## Limites
Este é um APK de depuração, adequado para instalar e testar. Não é um app publicado na Play Store nem um APK assinado para distribuição. Recursos de vídeo avançados, como Optical Flow/Twixtor real, exigem implementação de processamento adicional e não passam a existir só por empacotar o projeto web.
