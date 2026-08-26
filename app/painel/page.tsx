"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, Eye, KeyRound, LoaderCircle, LockKeyhole, LogOut, RefreshCw, Server, ShieldCheck } from "lucide-react";

type IntegrationStatus = {
  configured: boolean;
  tokenPreview: string | null;
  apiBaseUrl: string;
  webhookUrl: string;
};

export default function AdminPanelPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

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
          <div className="admin-config-title"><span><Eye /></span><div><h2>Configuração no Vercel</h2><p>Cadastre a chave secreta e publique novamente o projeto.</p></div></div>
          <ol><li>Abra o projeto no Vercel e entre em <strong>Settings → Environment Variables</strong>.</li><li>Crie a variável <code>PINPAY_TOKEN</code> e cole sua chave <code>sk_...</code>.</li><li>Marque Production, Preview e Development; salve e faça um novo deploy.</li></ol>
          <div className="admin-actions"><button onClick={testConnection} disabled={testing}>{testing ? <LoaderCircle className="spin" /> : <RefreshCw />} Testar conexão</button><a href="/checkout">Abrir checkout</a></div>
          {message && <div className={message.includes("aprovada") ? "admin-message success" : "admin-message error"}>{message.includes("aprovada") ? <BadgeCheck /> : <CircleAlert />}{message}</div>}
        </section>
        <section className="admin-webhook-card"><div><ShieldCheck /><span><strong>Endpoint preparado para confirmação</strong><small>{status?.webhookUrl}</small></span></div><p>O checkout acompanha o pagamento diretamente pela API oficial. Nenhum dado de cartão ou token secreto é armazenado no navegador.</p></section>
      </section>
    </main>
  );
}
