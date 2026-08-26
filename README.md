# Acqualive Terracota

Loja Next.js responsiva com página do produto, carrinho persistente, checkout em etapas e confirmação de pedido.

## Publicar pelo GitHub na Vercel

1. Crie um repositório vazio no GitHub.
2. Envie todos os arquivos deste projeto para a raiz do repositório, incluindo `package-lock.json` e `vercel.json`.
3. Na Vercel, selecione **Add New > Project** e importe o repositório.
4. A Vercel reconhecerá o framework como **Next.js** e usará automaticamente `npm run build:vercel`.
5. Clique em **Deploy**. Não é necessário informar uma pasta de saída.

Configuração já incluída:

- Node.js 22.x;
- build Next.js próprio para a Vercel;
- rotas `/`, `/carrinho`, `/checkout` e `/pedido-confirmado`;
- consulta de CEP pelo ViaCEP;
- arquivos estáticos dentro de `public/assets`;
- integração real com a API PinPay para criação e consulta de cobranças Pix;
- QR Code e Pix copia e cola no checkout;
- painel de diagnóstico em `/painel`.

## Desenvolvimento local

```bash
npm ci
npm run dev:vercel
```

Abra `http://localhost:3000`.

## Pagamentos PinPay

O checkout usa a API oficial da PinPay. A cobrança é criada por `POST /pix`, o QR Code é exibido no checkout e o status é consultado por `GET /pix/{id}` até a aprovação.

Antes do deploy, cadastre em **Vercel > Project Settings > Environment Variables**:

- `PINPAY_TOKEN`: chave secreta `sk_...` da PinPay, obrigatória;
- `ADMIN_USER`: usuário do `/painel`, opcional (padrão `admin`);
- `ADMIN_PASSWORD`: senha do `/painel`, opcional (padrão `admin`);
- `ADMIN_SESSION_SECRET`: segredo aleatório para a sessão, opcional;
- `PINPAY_WEBHOOK_SECRET`: segredo `whsec_...` gerado pela PinPay, opcional.

Marque as variáveis para **Production, Preview e Development** e faça um novo deploy. A chave secreta nunca é enviada ao navegador ou incluída no GitHub.

O painel `/painel` testa a autenticação consultando o saldo da conta sem mostrar a chave completa.

O front-end já trata recusas reais retornadas como HTTP `402` ou pelos códigos `CARD_DECLINED`, `PAYMENT_DECLINED` e `TRANSACTION_DECLINED`. Nesses casos, o modal informa que nada foi cobrado e libera automaticamente Pix com 10% de desconto. Erros de configuração ou indisponibilidade são exibidos separadamente e não são apresentados como recusa bancária.

Variáveis de ambiente reservadas estão documentadas em `.env.example`. Cadastre os valores reais somente em **Vercel > Project Settings > Environment Variables**. Nunca envie tokens reais para o GitHub.

## Preço atual

- Purificador Acqualive Terracota: **R$ 169,00**;
- Kit Refil Fresh Nanno V: de **R$ 85,00** por **R$ 50,00**;
- Pix: **R$ 160,55** com 5% de desconto;
- Cartão: até **10x de R$ 16,90** sem juros.
