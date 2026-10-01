# SelfHub

App desktop (Tauri v2 + Vue 3 + Tailwind v4) com cara de navegador para consultar as APIs dos seus apps self-host.

- Abas verticais à esquerda, uma por serviço
- Conteúdo no centro, com cards de dados
- Painel de detalhes que desliza pela direita
- Visual Material 3: cores tonais, cantos arredondados e o app inteiro muda de cor conforme o serviço da aba ativa
- Tema claro, escuro ou automático

Serviços suportados: **Jellyfin**, **Navidrome**, **Uptime Kuma**, **Gatus** e **Speedtest Tracker**.

## Requisitos

- Node.js 20 ou mais novo
- Rust (https://rustup.rs)
- Dependências de sistema do Tauri v2 para o seu sistema: https://v2.tauri.app/start/prerequisites/

## Como rodar

```bash
npm install
npm run tauri dev      # abre o app com hot reload
npm run tauri build    # gera o instalador em src-tauri/target/release/bundle
```

Para mexer só na interface, `npm run dev` abre no navegador (http://localhost:1420). Nesse modo as chamadas
dependem do CORS de cada serviço e provavelmente serão bloqueadas. No app Tauri isso não acontece, porque as
requisições saem pelo Rust (`@tauri-apps/plugin-http`).

## Configurar cada serviço

| Serviço | O que informar |
|---|---|
| Jellyfin | Endereço e chave de API (Painel, Avançado, Chaves de API) |
| Navidrome | Endereço, usuário e senha (API Subsonic) |
| Uptime Kuma | Endereço e o slug da página de status (o final de `/status/<slug>`). O Kuma não tem API REST oficial, então o app lê a página de status pública |
| Gatus | Só o endereço |
| Speedtest Tracker | Endereço e token de API (com a permissão de rodar testes, se quiser usar o botão) |

Use **Testar conexão** no modal antes de salvar. Para HTTPS com certificado autoassinado, marque a opção correspondente.

## Atalhos

| Atalho | Ação |
|---|---|
| Ctrl/Cmd + T | Nova aba |
| Ctrl/Cmd + W | Fechar aba |
| Ctrl/Cmd + B | Abrir ou fechar o painel direito |
| Alt + seta esquerda ou direita | Voltar e avançar entre abas |

## Estrutura

```
src/
  services/      um adapter por serviço, mais registry.ts (nome, ícone, cor e campos de cada um)
  stores/        Pinia: services (lista salva), tabs, snapshots (dados e polling de 30 s), ui
  components/    TabSidebar, Toolbar, TabContent, HomeView, ServiceView, RightPanel, ServiceModal...
  lib/           http (plugin-http com fallback para fetch), storage, theme (Material 3), format
src-tauri/       Rust, tauri.conf.json e capabilities/default.json (permissões de HTTP, store e opener)
```

## Adicionar um novo serviço

1. Crie `src/services/meu-servico.ts` exportando uma função `(config) => ServiceAdapter`. O método `snapshot()` devolve
   os cards (`stats`) e a lista do painel direito (`items`). Opcionalmente, `actions` cria botões de ação.
2. Inclua o tipo em `ServiceType` (`services/types.ts`).
3. Registre em `services/registry.ts`: `META` (nome, ícone Material Symbols, cor, campos do formulário) e `FACTORIES`.

A cor definida em `META` também vira o tema do app quando a aba está ativa.

## Segurança

- Serviços, tokens e senhas ficam em texto puro no arquivo `selfhub.json`, na pasta de dados do app. Para algo mais
  sério, troque `src/lib/storage.ts` por `tauri-plugin-stronghold` ou pelo cofre de senhas do sistema.
- `capabilities/default.json` libera qualquer endereço `http://` e `https://`. Restrinja aos seus domínios ou IPs
  se quiser mais segurança.

## Android e iOS

O Tauri v2 roda em mobile com o mesmo código: `npm run tauri android init` e depois `npm run tauri android dev`.
Os ícones de mobile já foram gerados em `src-tauri/icons`. Para trocar o ícone, edite `app-icon.png` e rode
`npm run tauri icon app-icon.png`.
