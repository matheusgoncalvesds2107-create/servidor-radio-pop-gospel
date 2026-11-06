# Servidor independente — Rádio Pop Gospel

Este projeto cria um serviço separado da Vem Comigo Deus. Ele recebe o áudio do motor Pop Gospel por WebSocket e distribui o sinal aos ouvintes.

## Publicar no Render

1. Crie um repositório GitHub novo, por exemplo `servidor-radio-pop-gospel`.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No Render, crie um **New > Web Service** e conecte esse repositório.
4. Use:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free (se disponível na sua conta)
5. Em Environment, crie:
   - `POP_GOSPEL_PANEL_TOKEN` = o mesmo token de transmissão já configurado no painel Pop Gospel.
6. Faça o deploy.

## Endereços depois do deploy

Substitua `SEU-SERVICO` pelo domínio que o Render fornecer:

- Base HTTPS para o campo de servidor do painel: `https://SEU-SERVICO.onrender.com`
- Áudio público: `https://SEU-SERVICO.onrender.com/radio.mp3`
- Saúde: `https://SEU-SERVICO.onrender.com/api/health`
- WebSocket: `wss://SEU-SERVICO.onrender.com/source-ws`

## Importante sobre o painel

O servidor espera que o painel envie o token no cabeçalho HTTP `x-pop-gospel-token` durante a abertura do WebSocket. O campo base HTTPS do painel precisa ser convertido pelo próprio motor para `wss://.../source-ws`.

Se o painel usa outro nome de cabeçalho ou outro caminho, será necessário ajustar o cliente do painel para coincidir com este servidor. Não coloque o token na URL e não compartilhe o token em mensagens ou capturas de tela.

## Observação sobre o plano gratuito

Serviços gratuitos podem dormir quando ficam sem tráfego e podem reiniciar. Portanto, teste o sinal e a disponibilidade antes de considerar a transmissão contínua 24 horas garantida.
