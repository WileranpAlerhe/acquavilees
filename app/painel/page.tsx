"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeCheck, BarChart3, CircleAlert, Eye, KeyRound, LoaderCircle, LockKeyhole, LogOut, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { testGoogleAnalyticsConnection } from "@/app/analytics";

type IntegrationStatus = {
  configured: boolean;
  tokenPreview: string | null;
  apiBaseUrl: string;
  webhookUrl: string;
  analytics: { configured: boolean; measurementId: string | null; streamId: string | null; variableName: string | null };
};

export default function AdminPanelPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [analyticsTesting, setAnalyticsTesting] = useState(false);
  const [analyticsTest, setAnalyticsTest] = useState<{ ok: boolean; message: string } | null>(null);

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/admin/status", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    const data = await response.json();
    setAuthenticated(true);
    setStatus(data);
  }, []);

  useEffect(() => { loadStatus().catch(() => setAuthenticated(false)); }, [loadStatus]);

  async function login(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Acesso negado.");
      await loadStatus();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setLoading(false); }
  }

  async function testConnection() {
    setTesting(true); setMessage("");
    try {
      const response = await fetch("/api/admin/test", { method: "POST" });
      const data = await response.json();
      setMessage(data.message || (response.ok ? "Conexão funcionando." : "Falha na conexão."));
    } catch { setMessage("Não foi possível testar a conexão agora."); }
    finally { setTesting(false); }
  }

  async function testAnalyticsConnection() {
    setAnalyticsTesting(true);
    setAnalyticsTest(null);
    try {
      const measurementId = status?.analytics?.measurementId || "";
      setAnalyticsTest(await testGoogleAnalyticsConnection(measurementId));
    } catch {
      setAnalyticsTest({ ok: false, message: "Não foi possível executar o teste do GA4 neste navegador." });
    } finally {
      setAnalyticsTesting(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setStatus(null); setAuthenticated(false); setMessage("");
  }

  if (authenticated === null) return <main className="admin-shell admin-loading"><LoaderCircle className="spin" /><span>Carregando painel...</span></main>;

  if (!authenticated) return (
    <main className="admin-shell">
      <section className="admin-login-card">
        <div className="admin-brand"><img src="/assets/logo-acqualive.png" alt="Acqualive" /><span>PAINEL DE PAGAMENTOS</span></div>
        <span className="admin-lock"><LockKeyhole /></span>
        <h1>Acesso administrativo</h1>
        <p>Entre para verificar a integração segura com a PinPay.</p>
        <form onSubmit={login}>
          <label><span>Usuário</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
          <label><span>Senha</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label>
          {message && <div className="admin-message error"><CircleAlert /> {message}</div>}
          <button disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <KeyRound />} Entrar no painel</button>
        </form>
        <small>Acesso inicial: admin / admin. Altere as variáveis ADMIN_USER e ADMIN_PASSWORD antes de divulgar a loja.</small>
      </section>
    </main>
  );

  return (
    <main className="admin-shell dashboard-shell">
      <header className="admin-topbar"><div><img src="/assets/logo-acqualive.png" alt="Acqualive" /><span>Integração de pagamentos</span></div><button onClick={logout}><LogOut /> Sair</button></header>
      <section className="admin-dashboard">
        <div className="admin-dashboard-heading"><div><span>Configurações</span><h1>PinPay</h1><p>A chave permanece protegida no servidor e nunca é enviada ao navegador.</p></div><span className={status?.configured ? "integration-chip active" : "integration-chip"}>{status?.configured ? <BadgeCheck /> : <CircleAlert />}{status?.configured ? "Configurada" : "Não configurada"}</span></div>
        <div className="admin-metrics">
          <article><span><Server /></span><div><small>API</small><strong>PinPay API v1</strong><p>{status?.apiBaseUrl}</p></div></article>
          <article><span><KeyRound /></span><div><small>Chave secreta</small><strong>{status?.tokenPreview || "Não cadastrada"}</strong><p>Variável PINPAY_TOKEN</p></div></article>
          <article><span><ShieldCheck /></span><div><small>Segurança</small><strong>Somente servidor</strong><p>Bearer Token protegido</p></div></article>
        </div>
        <section className="admin-config-card">
          <div className="admin-config-title"><span><Eye /></span><div><h2>Como configurar o PINPAY_TOKEN</h2><p>Siga as etapas abaixo na ordem. A chave deve começar com <code>sk_</code>.</p></div></div>
          <div className="admin-token-example"><span>Nome da variável</span><code>PINPAY_TOKEN</code><span>Valor</span><code>sk_sua_chave_secreta</code></div>
          <ol className="admin-setup-steps">
            <li><span>1</span><div><strong>Copie sua chave secreta na PinPay</strong><p>Entre na sua conta PinPay, abra a área de API e copie a chave secreta que começa com <code>sk_</code>. Não use uma chave pública.</p></div></li>
            <li><span>2</span><div><strong>Abra o projeto na Vercel</strong><p>No painel da Vercel, selecione o projeto desta loja e acesse <b>Settings</b>.</p></div></li>
            <li><span>3</span><div><strong>Entre em Environment Variables</strong><p>Dentro de Settings, abra <b>Environment Variables</b> e clique para adicionar uma nova variável.</p></div></li>
            <li><span>4</span><div><strong>Cadastre a variável exatamente assim</strong><p>Em Name, digite <code>PINPAY_TOKEN</code>. Em Value, cole a chave <code>sk_...</code> sem aspas e sem espaços.</p></div></li>
            <li><span>5</span><div><strong>Selecione os ambientes e salve</strong><p>Marque <b>Production</b>, <b>Preview</b> e <b>Development</b>. Depois clique em <b>Save</b>.</p></div></li>
            <li><span>6</span><div><strong>Faça um novo deploy</strong><p>Abra <b>Deployments</b>, selecione o último deploy e clique em <b>Redeploy</b>. Quando terminar, volte aqui e use “Testar conexão”.</p></div></li>
          </ol>
          <div className="admin-setup-note"><ShieldCheck /><span><strong>Importante:</strong> nunca coloque a chave <code>sk_</code> dentro dos arquivos enviados ao GitHub.</span></div>
          <div className="admin-actions"><button onClick={testConnection} disabled={testing}>{testing ? <LoaderCircle className="spin" /> : <RefreshCw />} Testar conexão</button><a href="https://hub.usepinpay.com/documentacao" target="_blank" rel="noreferrer">Documentação PinPay</a><a href="/checkout">Abrir checkout</a></div>
          {message && <div className={message.includes("aprovada") ? "admin-message success" : "admin-message error"}>{message.includes("aprovada") ? <BadgeCheck /> : <CircleAlert />}{message}</div>}
        </section>
        <section className="admin-config-card admin-password-card">
          <div className="admin-config-title"><span><KeyRound /></span><div><h2>Como alterar o acesso admin / admin</h2><p>Crie as variáveis abaixo na Vercel. A nova senha não fica salva no GitHub.</p></div></div>
          <div className="admin-token-example admin-credential-example">
            <span>Nome da variável</span><code>ADMIN_USER</code><span>Exemplo de valor</span><code>seu_usuario_admin</code>
            <span>Nome da variável</span><code>ADMIN_PASSWORD</code><span>Exemplo de valor</span><code>use_uma_senha_forte</code>
          </div>
          <ol className="admin-setup-steps">
            <li><span>1</span><div><strong>Abra as variáveis do projeto</strong><p>Na Vercel, entre neste projeto e acesse <b>Settings → Environment Variables</b>.</p></div></li>
            <li><span>2</span><div><strong>Crie o novo usuário</strong><p>Adicione <code>ADMIN_USER</code> e informe o nome que deseja usar no lugar de <code>admin</code>.</p></div></li>
            <li><span>3</span><div><strong>Crie a nova senha</strong><p>Adicione <code>ADMIN_PASSWORD</code> e informe uma senha forte. Não use novamente <code>admin</code>.</p></div></li>
            <li><span>4</span><div><strong>Marque os ambientes e salve</strong><p>Selecione <b>Production</b>, <b>Preview</b> e <b>Development</b> nas duas variáveis e clique em <b>Save</b>.</p></div></li>
            <li><span>5</span><div><strong>Faça o Redeploy</strong><p>Abra <b>Deployments</b>, escolha o último deploy e clique em <b>Redeploy</b> para aplicar o novo acesso.</p></div></li>
            <li><span>6</span><div><strong>Teste o novo login</strong><p>Depois do deploy, clique em <b>Sair</b> neste painel e entre com o novo usuário e a nova senha. O acesso <code>admin / admin</code> deixará de funcionar.</p></div></li>
          </ol>
          <div className="admin-setup-note"><ShieldCheck /><span>Para encerrar também sessões antigas, adicione <code>ADMIN_SESSION_SECRET</code> com uma sequência aleatória de pelo menos 32 caracteres antes do Redeploy.</span></div>
        </section>
        <section className="admin-config-card admin-analytics-card">
          <div className="admin-config-title"><span><BarChart3 /></span><div><h2>Google Analytics 4</h2><p>Ative o acompanhamento completo do site informando somente os identificadores do seu fluxo da Web.</p></div></div>
          <div className="analytics-status-row">
            <span className={status?.analytics?.configured ? "integration-chip active" : "integration-chip"}>{status?.analytics?.configured ? <BadgeCheck /> : <CircleAlert />}{status?.analytics?.configured ? "GA4 configurado" : "GA4 não configurado"}</span>
            {status?.analytics?.measurementId && <code>{status.analytics.measurementId}</code>}
            {status?.analytics?.streamId && <small>Stream ID: {status.analytics.streamId}</small>}
            {status?.analytics?.variableName && <small>Variável ativa: {status.analytics.variableName}</small>}
          </div>
          <div className="admin-token-example admin-credential-example">
            <span>Variável obrigatória</span><code>GA4_MEASUREMENT_ID</code><span>Valor</span><code>G-XXXXXXXXXX</code>
            <span>Variável opcional</span><code>GA4_STREAM_ID</code><span>Valor</span><code>1234567890</code>
          </div>
          <ol className="admin-setup-steps">
            <li><span>1</span><div><strong>Encontre o Measurement ID no GA4</strong><p>No Google Analytics, abra <b>Administrador → Fluxos de dados → Web</b>, selecione o site e copie o código que começa com <code>G-</code>.</p></div></li>
            <li><span>2</span><div><strong>Abra as variáveis na Vercel</strong><p>Entre no projeto e acesse <b>Settings → Environment Variables</b>.</p></div></li>
            <li><span>3</span><div><strong>Cadastre o Measurement ID</strong><p>Crie <code>GA4_MEASUREMENT_ID</code> e cole o código <code>G-...</code>. Não use o prefixo <code>NEXT_PUBLIC_</code>.</p></div></li>
            <li><span>4</span><div><strong>Cadastre o Stream ID, se desejar</strong><p>Crie <code>GA4_STREAM_ID</code> e cole o número do fluxo. Ele serve para identificar a configuração neste painel.</p></div></li>
            <li><span>5</span><div><strong>Salve e faça o Redeploy</strong><p>Marque <b>Production</b>, <b>Preview</b> e <b>Development</b>, salve e publique novamente o último deploy.</p></div></li>
          </ol>
          <div className="analytics-events"><strong>Eventos já configurados</strong><div><span>page_view</span><span>view_item</span><span>add_to_cart</span><span>view_cart</span><span>begin_checkout</span><span>add_shipping_info</span><span>add_payment_info</span><span>pix_generated</span><span>payment_declined</span><span>purchase</span></div></div>
          <div className="admin-actions"><button onClick={testAnalyticsConnection} disabled={analyticsTesting || !status?.analytics?.configured}>{analyticsTesting ? <LoaderCircle className="spin" /> : <BarChart3 />} Testar GA4 agora</button></div>
          {analyticsTest && <div className={analyticsTest.ok ? "admin-message success" : "admin-message error"}>{analyticsTest.ok ? <BadgeCheck /> : <CircleAlert />}{analyticsTest.message}</div>}
          <div className="admin-setup-note"><ShieldCheck /><span>Depois do Redeploy, abra o relatório <b>Tempo real</b> do GA4 e navegue pela loja para confirmar o recebimento dos eventos.</span></div>
        </section>
        <section className="admin-webhook-card"><div><ShieldCheck /><span><strong>Endpoint preparado para confirmação</strong><small>{status?.webhookUrl}</small></span></div><p>O checkout acompanha o pagamento diretamente pela API oficial. Nenhum dado de cartão ou token secreto é armazenado no navegador.</p></section>
      </section>
    </main>
  );
}
