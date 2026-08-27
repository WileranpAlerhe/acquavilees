"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, BadgeCheck, BadgePercent, CheckCircle2, Clock3, Copy, CreditCard, LoaderCircle, LockKeyhole, MapPin, PackageCheck, QrCode, RefreshCw, ShieldCheck, Truck, UserRound } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckoutHeader, OrderSummary } from "@/app/checkout-components";
import { CartState, cartSubtotal, checkoutTotal as calculateCheckoutTotal, clearCart, loadCart, money } from "@/app/commerce";
import { analyticsItems, trackEvent } from "@/app/analytics";

type Customer = { name: string; email: string; phone: string; cpf: string };
type Address = { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };
type PaymentDialogState = "idle" | "processing" | "pixReady" | "declined" | "unavailable";
type PixCharge = { transactionId: string; orderCode: string; amount: number; qrCode: string; qrCodeUrl: string; expiresAt: string | null };
type CardDialogState = "form" | "processing" | "unavailable";
type CardDetails = { holder: string; number: string; expiry: string; cvv: string; installments: string };
type CheckoutSession = { customer: Customer; address: Address; shipping: string; payment: string; cepFound: boolean };

const CHECKOUT_SESSION_KEY = "acqualive-checkout-session-v1";
const CHECKOUT_ANALYTICS_KEY = "acqualive-checkout-analytics-started";

function onlyDigits(value: string, limit: number) {
  return value.replace(/\D/g, "").slice(0, limit);
}

function formatPhone(value: string) {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value: string) {
  const digits = onlyDigits(value, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatCep(value: string) {
  const digits = onlyDigits(value, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function formatCardNumber(value: string) {
  return onlyDigits(value, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartState | null>(null);
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState<Customer>({ name: "", email: "", phone: "", cpf: "" });
  const [address, setAddress] = useState<Address>({ cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" });
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("pix");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFound, setCepFound] = useState(false);
  const [error, setError] = useState("");
  const [pixBonus, setPixBonus] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDialogState, setPaymentDialogState] = useState<PaymentDialogState>("idle");
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPix, setCheckingPix] = useState(false);
  const [pixStatusMessage, setPixStatusMessage] = useState("Aguardando o pagamento...");
  const [pixSecondsLeft, setPixSecondsLeft] = useState(300);
  const [pixExpired, setPixExpired] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardDialogState, setCardDialogState] = useState<CardDialogState>("form");
  const [cardError, setCardError] = useState("");
  const [card, setCard] = useState<CardDetails>({ holder: "", number: "", expiry: "", cvv: "", installments: "1" });
  const pollTimerRef = useRef<number | null>(null);
  const pixCountdownRef = useRef<number | null>(null);
  const cardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const loadedCart = loadCart();
    try {
      const savedSession = window.sessionStorage.getItem(CHECKOUT_SESSION_KEY);
      if (savedSession) {
        const draft = JSON.parse(savedSession) as Partial<CheckoutSession>;
        if (draft.customer) setCustomer((current) => ({ ...current, ...draft.customer }));
        if (draft.address) setAddress((current) => ({ ...current, ...draft.address }));
        if (draft.shipping === "standard" || draft.shipping === "express") setShipping(draft.shipping);
        if (draft.payment === "pix" || draft.payment === "card") setPayment(draft.payment);
        setCepFound(Boolean(draft.cepFound));
      }
    } catch {
      window.sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
    }
    setCart(loadedCart);
    setReady(true);
    if (loadedCart && !window.sessionStorage.getItem(CHECKOUT_ANALYTICS_KEY)) {
      trackEvent("begin_checkout", { currency: "BRL", value: cartSubtotal(loadedCart), items: analyticsItems(loadedCart) });
      window.sessionStorage.setItem(CHECKOUT_ANALYTICS_KEY, "1");
    }
    return () => {
      if (cardTimerRef.current) window.clearTimeout(cardTimerRef.current);
      if (pixCountdownRef.current) window.clearInterval(pixCountdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const checkoutSession: CheckoutSession = { customer, address, shipping, payment, cepFound };
    window.sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(checkoutSession));
  }, [ready, customer, address, shipping, payment, cepFound]);

  function setCustomerField(field: keyof Customer, value: string) { setCustomer((current) => ({ ...current, [field]: value })); }
  function setAddressField(field: keyof Address, value: string) { setAddress((current) => ({ ...current, [field]: value })); }
  function setCardField(field: keyof CardDetails, value: string) { setCard((current) => ({ ...current, [field]: value })); }

  function selectPaymentMethod(value: string) {
    setPayment(value);
    if (value === "card") {
      setCardError("");
      setCardDialogState("form");
      setCardDialogOpen(true);
    }
  }

  async function lookupCep() {
    const digits = address.cep.replace(/\D/g, "");
    if (digits.length !== 8) { setError("Digite um CEP válido para continuar."); return; }
    setCepLoading(true); setError(""); setCepFound(false);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (!response.ok || data.erro) throw new Error("CEP inválido");
      setAddress((current) => ({ ...current, cep: formatCep(digits), street: data.logradouro || "", district: data.bairro || "", city: data.localidade || "", state: data.uf || "" }));
      setCepFound(true);
    } catch { setError("CEP não encontrado. Confira os números e tente novamente."); }
    finally { setCepLoading(false); }
  }

  function validate() {
    if (!customer.name.trim() || !customer.email.includes("@") || customer.phone.replace(/\D/g, "").length !== 11 || customer.cpf.replace(/\D/g, "").length !== 11) return "Preencha corretamente seus dados de identificação.";
    if (!cepFound || !address.street || !address.number || !address.city || !address.state) return "Consulte o CEP e complete o endereço de entrega.";
    return "";
  }

  function finalizeOrder(selectedPayment: string, discountRate: number, paymentStatus = "approved", transactionId?: string, orderCode?: string) {
    if (!cart) return;
    const shippingPrice = shipping === "express" ? 29.9 : 0;
    const subtotal = cartSubtotal(cart);
    const total = selectedPayment === "pix"
      ? calculateCheckoutTotal(subtotal, shippingPrice, discountRate)
      : calculateCheckoutTotal(subtotal, shippingPrice);
    const order = {
      code: orderCode || `ACQ${Date.now().toString().slice(-8)}`,
      customer: { name: customer.name, email: customer.email },
      address,
      shipping,
      payment: selectedPayment,
      paymentStatus,
      transactionId,
      total,
      cart,
    };
    window.sessionStorage.setItem("acqualive-last-order", JSON.stringify(order));
    window.sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
    window.sessionStorage.removeItem(CHECKOUT_ANALYTICS_KEY);
    clearCart();
    window.location.assign("/pedido-confirmado");
  }

  const checkPixStatus = async (charge = pixCharge, manual = false) => {
    if (!charge || checkingPix || pixExpired) return;
    if (manual) setCheckingPix(true);
    try {
      const response = await fetch(`/api/payments/status/${encodeURIComponent(charge.transactionId)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Não foi possível verificar o pagamento agora.");
      if (["approved", "paid", "payment_approved"].includes(String(result.status).toLowerCase())) {
        if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
        setPixStatusMessage("Pagamento aprovado!");
        finalizeOrder("pix", pixBonus ? 0.1 : 0.05, "approved", charge.transactionId, charge.orderCode);
        return;
      }
      if (["failed", "expired", "refunded"].includes(String(result.status).toLowerCase())) {
        setPixStatusMessage("Este Pix não está mais disponível. Gere uma nova cobrança.");
        return;
      }
      setPixStatusMessage("Pagamento ainda não identificado. Assim que pagar, a confirmação será automática.");
    } catch (statusError) {
      if (manual) setPixStatusMessage(statusError instanceof Error ? statusError.message : "Não foi possível consultar agora.");
    } finally { if (manual) setCheckingPix(false); }
  };

  useEffect(() => {
    if (!paymentDialogOpen || paymentDialogState !== "pixReady" || !pixCharge || pixExpired) return;
    const schedule = () => {
      pollTimerRef.current = window.setTimeout(async () => {
        await checkPixStatus(pixCharge, false);
        schedule();
      }, 5000);
    };
    schedule();
    return () => { if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current); };
  }, [paymentDialogOpen, paymentDialogState, pixCharge, pixExpired]);

  useEffect(() => {
    if (!paymentDialogOpen || paymentDialogState !== "pixReady" || !pixCharge?.expiresAt) return;
    const expiresAt = new Date(pixCharge.expiresAt).getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setPixSecondsLeft(remaining);
      if (remaining === 0) {
        setPixExpired(true);
        setPixStatusMessage("Tempo encerrado. Gere um novo Pix para pagar.");
        if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
        if (pixCountdownRef.current) window.clearInterval(pixCountdownRef.current);
      }
    };
    updateCountdown();
    pixCountdownRef.current = window.setInterval(updateCountdown, 1000);
    return () => { if (pixCountdownRef.current) window.clearInterval(pixCountdownRef.current); };
  }, [paymentDialogOpen, paymentDialogState, pixCharge]);

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    if (!cart) return;
    const validationError = validate();
    if (validationError) { setError(validationError); window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    if (payment === "card") {
      setCardError("");
      setCardDialogState("form");
      setCardDialogOpen(true);
      return;
    }

    setError("");
    const analyticsSubtotal = cartSubtotal(cart);
    const analyticsShipping = shipping === "express" ? 29.9 : 0;
    const analyticsTotal = calculateCheckoutTotal(analyticsSubtotal, analyticsShipping, payment === "pix" ? (pixBonus ? 0.1 : 0.05) : 0);
    trackEvent("add_shipping_info", { currency: "BRL", value: analyticsTotal, shipping_tier: shipping, items: analyticsItems(cart) });
    trackEvent("add_payment_info", { currency: "BRL", value: analyticsTotal, payment_type: payment, items: analyticsItems(cart) });
    setPaymentDialogState("processing");
    setPaymentDialogOpen(true);
    try {
      const orderCode = `ACQ${Date.now().toString().slice(-8)}`;
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: payment,
          orderCode,
          idempotencyKey: crypto.randomUUID(),
          pixDiscountRate: pixBonus ? 0.1 : 0.05,
          customer,
          address,
          shipping,
          cart,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (payment === "pix") {
        if (!response.ok) throw new Error("Não foi possível gerar o Pix agora. Tente novamente.");
        const pixCode = String(result.pix.qrCode || "");
        if (!pixCode) throw new Error("A PinPay não retornou um código Pix válido.");
        const realQrCodeUrl = await QRCode.toDataURL(pixCode, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 360,
          color: { dark: "#101828", light: "#ffffff" },
        });
        const expiresAt = result.pix.expiresAt;
        setPixCharge({
          transactionId: result.transactionId,
          orderCode: result.orderCode || orderCode,
          amount: result.amount,
          qrCode: pixCode,
          qrCodeUrl: realQrCodeUrl,
          expiresAt,
        });
        setPixExpired(false);
        setPixSecondsLeft(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
        setPixStatusMessage("Aguardando o pagamento...");
        trackEvent("pix_generated", { currency: "BRL", value: result.amount, transaction_id: result.transactionId, order_id: result.orderCode || orderCode, items: analyticsItems(cart) });
        setPaymentDialogState("pixReady");
        return;
      }
    } catch (paymentError) {
      if (payment === "pix") setError(paymentError instanceof Error ? paymentError.message : "Não foi possível gerar o Pix agora.");
      setPaymentDialogState("unavailable");
    }
  }

  function submitCard(event: FormEvent) {
    event.preventDefault();
    const cardDigits = onlyDigits(card.number, 16);
    const [month = "", year = ""] = card.expiry.split("/");
    if (card.holder.trim().length < 3 || cardDigits.length !== 16 || Number(month) < 1 || Number(month) > 12 || year.length !== 2 || card.cvv.length !== 3) {
      setCardError("Confira o nome, os 16 números do cartão, a validade e o CVV de 3 dígitos.");
      return;
    }

    setCardError("");
    setCardDialogState("processing");
    trackEvent("add_payment_info", { currency: "BRL", value: checkoutTotal, payment_type: "card", installments: Number(card.installments), items: analyticsItems(cart!) });
    cardTimerRef.current = window.setTimeout(() => {
      setCard((current) => ({ ...current, number: "", expiry: "", cvv: "" }));
      setCardDialogState("unavailable");
    }, 1800);
  }

  async function copyPixCode() {
    if (!pixCharge || pixExpired) return;
    await navigator.clipboard.writeText(pixCharge.qrCode);
    setPixCopied(true);
    window.setTimeout(() => setPixCopied(false), 1800);
  }

  function closeExpiredPix() {
    setPaymentDialogOpen(false);
    setPaymentDialogState("idle");
    setPixCharge(null);
    setPixExpired(false);
    setPixSecondsLeft(300);
  }

  if (!ready) return <div className="checkout-page"><CheckoutHeader current="checkout" /><div className="checkout-loading"><LoaderCircle className="spin" /> Preparando checkout...</div></div>;
  if (!cart) return <div className="checkout-page"><CheckoutHeader current="checkout" /><main className="empty-cart"><CreditCard /><h1>Não há produtos para finalizar</h1><p>Adicione o Purificador Terracota ao carrinho antes de entrar no checkout.</p><a className="checkout-primary" href="/">Voltar para o produto</a></main></div>;

  const shippingPrice = shipping === "express" ? 29.9 : 0;
  const pixDiscountRate = payment === "pix" ? (pixBonus ? 0.1 : 0.05) : 0;
  const checkoutTotal = calculateCheckoutTotal(cartSubtotal(cart), shippingPrice, pixDiscountRate);

  return (
    <div className="checkout-page yampi-checkout">
      <CheckoutHeader current="checkout" />
      <main className="checkout-container checkout-grid">
        <form className="checkout-form" onSubmit={submitOrder} noValidate>
          <div className="checkout-return"><a href="/carrinho">← Voltar ao carrinho</a><span><LockKeyhole /> Checkout seguro</span></div>
          {error && <div className="checkout-alert" role="alert">{error}</div>}

          <section className="checkout-card">
            <div className="section-heading"><span>1</span><UserRound /><div><h1>Identificação</h1><p>Use seus dados para acompanhar o pedido</p></div></div>
            <div className="form-grid two"><label className="full"><span>Nome completo</span><input value={customer.name} onChange={(e) => setCustomerField("name", e.target.value)} autoComplete="name" placeholder="Digite seu nome completo" /></label><label><span>E-mail</span><input value={customer.email} onChange={(e) => setCustomerField("email", e.target.value)} autoComplete="email" inputMode="email" placeholder="seuemail@exemplo.com" /></label><label><span>Celular</span><input value={customer.phone} onChange={(e) => setCustomerField("phone", formatPhone(e.target.value))} autoComplete="tel" inputMode="numeric" maxLength={15} placeholder="(00) 00000-0000" /></label><label className="full"><span>CPF</span><input value={customer.cpf} onChange={(e) => setCustomerField("cpf", formatCpf(e.target.value))} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" /></label></div>
          </section>

          <section className="checkout-card">
            <div className="section-heading"><span>2</span><MapPin /><div><h2>Endereço de entrega</h2><p>Consulte o CEP para preencher automaticamente</p></div></div>
            <div className="cep-checkout"><label><span>CEP</span><input value={address.cep} onChange={(e) => { setAddressField("cep", formatCep(e.target.value)); setCepFound(false); }} inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" /></label><button type="button" onClick={lookupCep} disabled={cepLoading}>{cepLoading ? <LoaderCircle className="spin" /> : "Buscar CEP"}</button></div>
            {cepFound && <div className="address-found"><BadgeCheck /> Endereço encontrado. Complete o número e confira os dados.</div>}
            <div className={cepFound ? "form-grid address-grid visible" : "form-grid address-grid"}>
              <label className="full"><span>Rua/Avenida</span><input value={address.street} onChange={(e) => setAddressField("street", e.target.value)} autoComplete="address-line1" /></label>
              <label><span>Número</span><input value={address.number} onChange={(e) => setAddressField("number", e.target.value)} autoComplete="address-line2" placeholder="Número" /></label>
              <label><span>Complemento</span><input value={address.complement} onChange={(e) => setAddressField("complement", e.target.value)} placeholder="Apto, bloco (opcional)" /></label>
              <label><span>Bairro</span><input value={address.district} onChange={(e) => setAddressField("district", e.target.value)} /></label>
              <label><span>Cidade</span><input value={address.city} onChange={(e) => setAddressField("city", e.target.value)} /></label>
              <label><span>Estado</span><input value={address.state} onChange={(e) => setAddressField("state", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} /></label>
            </div>
          </section>

          <section className="checkout-card">
            <div className="section-heading"><span>3</span><Truck /><div><h2>Forma de entrega</h2><p>Escolha quando deseja receber</p></div></div>
            <RadioGroup value={shipping} onValueChange={setShipping} className="option-list">
              <label className={shipping === "standard" ? "checkout-option professional-option selected" : "checkout-option professional-option"}><RadioGroupItem value="standard" /><span className="option-visual standard-delivery"><PackageCheck /></span><span><strong>Entrega padrão</strong><small>8 a 12 dias úteis • rastreamento incluído</small></span><b className="shipping-price free">GRÁTIS</b></label>
              <label className={shipping === "express" ? "checkout-option professional-option selected" : "checkout-option professional-option"}><RadioGroupItem value="express" /><span className="option-visual express-delivery"><Truck /></span><span><strong>Entrega expressa</strong><small>3 a 5 dias úteis • envio prioritário</small></span><b className="shipping-price">{money(29.9)}</b></label>
            </RadioGroup>
            <div className="delivery-assurances"><span><ShieldCheck /> Envio protegido</span><span><MapPin /> Rastreamento completo</span><span><BadgeCheck /> Transportadora verificada</span></div>
          </section>

          <section className="checkout-card">
            <div className="section-heading"><span>4</span><CreditCard /><div><h2>Pagamento</h2><p>Selecione a forma de pagamento</p></div></div>
            <RadioGroup value={payment} onValueChange={selectPaymentMethod} className="option-list payment-options">
              <label className={payment === "pix" ? "checkout-option professional-option payment-option selected" : "checkout-option professional-option payment-option"}><RadioGroupItem value="pix" /><span className="option-visual pix-visual"><img src="/assets/pix.svg" alt="" /></span><span><strong>Pix <em>Recomendado</em></strong><small>Aprovação rápida • pagamento protegido</small></span><b className="discount-badge"><BadgePercent /> {pixBonus ? "10% OFF" : "5% OFF"}</b></label>
              <label className={payment === "card" ? "checkout-option professional-option payment-option selected" : "checkout-option professional-option payment-option"}><RadioGroupItem value="card" /><span className="option-visual card-visual"><CreditCard /></span><span><strong>Cartão de crédito</strong><small>Parcele em até 6x sem juros</small></span><span className="card-brands" aria-label="Aceitamos Visa e Mastercard"><img src="/assets/visa.svg" alt="Visa" /><img src="/assets/mastercard.svg" alt="Mastercard" /></span></label>
            </RadioGroup>
            {payment === "pix" && <div className={pixBonus ? "pix-info professional-payment-info bonus-active" : "pix-info professional-payment-info"}><div><strong>{pixBonus ? "Oferta especial desbloqueada: 10% OFF" : "Economize 5% pagando com Pix"}</strong></div></div>}
          </section>

          <button className="place-order" type="submit"><LockKeyhole /> {payment === "card" ? "Processar cartão" : "Finalizar com Pix"} • {money(checkoutTotal)}</button>
        </form>

        <div className="checkout-aside"><OrderSummary cart={cart} shipping={shippingPrice} pixDiscountRate={pixDiscountRate} /></div>
      </main>

      <Dialog open={paymentDialogOpen} onOpenChange={(open) => paymentDialogState !== "processing" && setPaymentDialogOpen(open)}>
        <DialogContent className="payment-result-modal" showCloseButton={paymentDialogState !== "processing"} onOpenAutoFocus={(event) => event.preventDefault()}>
          {paymentDialogState === "processing" && <div className="payment-modal-state processing-state"><span className="payment-status-icon"><LoaderCircle className="spin" /></span><DialogHeader><DialogTitle>Processando pagamento</DialogTitle><DialogDescription>Aguarde um momento. Não feche esta janela.</DialogDescription></DialogHeader><div className="processing-bar"><i /></div><div className="modal-security"><LockKeyhole /> Conexão protegida</div></div>}
          {paymentDialogState === "pixReady" && pixCharge && <div className={pixExpired ? "payment-modal-state pix-ready-state pix-expired" : "payment-modal-state pix-ready-state"}>
            <div className="pix-brand-header"><img className="pix-store-logo" src="/assets/logo-acqualive.png" alt="Acqualive" /><span><img src="/assets/pix.svg" alt="Pix" /> Pagamento Pix</span></div>
            <DialogHeader><DialogTitle>{pixExpired ? "Tempo do Pix encerrado" : "Finalize seu pagamento"}</DialogTitle><DialogDescription>{pixExpired ? "Gere um novo código para continuar a compra." : "Escaneie o QR Code ou copie o código no aplicativo do seu banco."}</DialogDescription></DialogHeader>
            <div className={pixSecondsLeft <= 60 ? "pix-countdown ending" : "pix-countdown"}><Clock3 /><span>Este Pix expira em</span><strong>{formatCountdown(pixSecondsLeft)}</strong></div>
            {!pixExpired && <>
              {pixCharge.qrCodeUrl ? <div className="pix-qr-frame"><img src={pixCharge.qrCodeUrl} alt="QR Code do pagamento Pix" /></div> : <div className="pix-qr-placeholder"><QrCode /></div>}
              <div className="pix-amount-block"><small>Valor a pagar</small><strong>{money(pixCharge.amount)}</strong></div>
              <div className="pix-code-area"><span>Código Pix copia e cola</span><code>{pixCharge.qrCode}</code><button className="pix-copy-code-button" type="button" onClick={copyPixCode}>{pixCopied ? <CheckCircle2 /> : <Copy />}<span>{pixCopied ? "Pix copiado" : "Copiar Pix"}</span></button></div>
              <div className="pix-status-line"><Clock3 /><span>{pixStatusMessage}</span></div>
              <button className="pix-check-button" onClick={() => checkPixStatus(pixCharge, true)} disabled={checkingPix}>{checkingPix ? <LoaderCircle className="spin" /> : <RefreshCw />} Já paguei, verificar agora</button>
            </>}
            {pixExpired && <button className="pix-regenerate-button" type="button" onClick={closeExpiredPix}><RefreshCw /> Gerar um novo Pix</button>}
            <div className="pix-modal-security"><ShieldCheck /> Pagamento protegido e confirmação automática</div>
          </div>}
          {paymentDialogState === "declined" && <div className="payment-modal-state declined-state"><span className="payment-status-icon"><AlertCircle /></span><DialogHeader><DialogTitle>Cartão não autorizado</DialogTitle><DialogDescription>Seu cartão não foi aprovado. Nenhum valor foi cobrado.</DialogDescription></DialogHeader><div className="pix-recovery-offer"><BadgePercent /><div><small>OFERTA LIBERADA</small><strong>Finalize no Pix com 10% OFF</strong><span>Seu novo total é {money(calculateCheckoutTotal(cartSubtotal(cart), shippingPrice, 0.1))}</span></div></div><button className="modal-primary-action" onClick={() => { setPayment("pix"); setPaymentDialogOpen(false); }}>Usar Pix com 10% OFF</button><button className="modal-secondary-action" onClick={() => setPaymentDialogOpen(false)}>Voltar ao checkout</button></div>}
          {paymentDialogState === "unavailable" && <div className="payment-modal-state unavailable-state"><span className="payment-status-icon"><AlertCircle /></span><DialogHeader><DialogTitle>{payment === "pix" ? "Pix indisponível no momento" : "Cartão indisponível no momento"}</DialogTitle><DialogDescription>{payment === "pix" ? "Não foi possível gerar o Pix. Tente novamente em instantes." : "Escolha outra forma de pagamento para continuar."}</DialogDescription></DialogHeader>{payment === "card" && <button className="modal-primary-action" onClick={() => { setPayment("pix"); setPaymentDialogOpen(false); }}>Escolher pagamento por Pix</button>}<button className="modal-secondary-action" onClick={() => setPaymentDialogOpen(false)}>Voltar ao checkout</button></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={cardDialogOpen} onOpenChange={(open) => cardDialogState !== "processing" && setCardDialogOpen(open)}>
        <DialogContent className="card-entry-modal" showCloseButton={cardDialogState !== "processing"} onOpenAutoFocus={(event) => event.preventDefault()}>
          {cardDialogState === "form" && <form className="card-entry-form" onSubmit={submitCard} noValidate>
            <DialogHeader><DialogTitle>Pagamento com cartão</DialogTitle><DialogDescription>Preencha os dados e escolha o parcelamento.</DialogDescription></DialogHeader>
            <div className="card-modal-brands"><img src="/assets/visa.svg" alt="Visa" /><img src="/assets/mastercard.svg" alt="Mastercard" /><span><LockKeyhole /> Ambiente em configuração</span></div>
            {cardError && <div className="card-form-error" role="alert">{cardError}</div>}
            <div className="card-fields">
              <label className="full"><span>Nome impresso no cartão</span><input value={card.holder} onChange={(e) => setCardField("holder", e.target.value.toUpperCase().slice(0, 60))} autoComplete="cc-name" maxLength={60} placeholder="NOME COMPLETO" /></label>
              <label className="full"><span>Número do cartão</span><input value={card.number} onChange={(e) => setCardField("number", formatCardNumber(e.target.value))} autoComplete="cc-number" inputMode="numeric" maxLength={19} placeholder="0000 0000 0000 0000" /></label>
              <label><span>Validade</span><input value={card.expiry} onChange={(e) => setCardField("expiry", formatExpiry(e.target.value))} autoComplete="cc-exp" inputMode="numeric" maxLength={5} placeholder="MM/AA" /></label>
              <label><span>CVV</span><input value={card.cvv} onChange={(e) => setCardField("cvv", onlyDigits(e.target.value, 3))} autoComplete="cc-csc" inputMode="numeric" maxLength={3} placeholder="000" /></label>
              <label className="full"><span>Parcelamento</span><select value={card.installments} onChange={(e) => setCardField("installments", e.target.value)}>{[1, 2, 3, 4, 5, 6].map((installment) => <option key={installment} value={installment}>{installment}x de {money(checkoutTotal / installment)} sem juros</option>)}</select></label>
            </div>
            <p className="card-setup-note">A integração do cartão ainda está em configuração. Os dados digitados não serão enviados nem armazenados.</p>
            <button className="card-pay-button" type="submit"><LockKeyhole /> Pagar {money(checkoutTotal)}</button>
          </form>}
          {cardDialogState === "processing" && <div className="payment-modal-state processing-state"><span className="payment-status-icon"><LoaderCircle className="spin" /></span><DialogHeader><DialogTitle>Verificando pagamento</DialogTitle><DialogDescription>Aguarde um momento. Não feche esta janela.</DialogDescription></DialogHeader><div className="processing-bar"><i /></div></div>}
          {cardDialogState === "unavailable" && <div className="payment-modal-state unavailable-state"><span className="payment-status-icon"><AlertCircle /></span><DialogHeader><DialogTitle>Cartão temporariamente indisponível</DialogTitle><DialogDescription>O pagamento por cartão ainda não está ativo. Nenhum dado foi enviado e nenhum valor foi cobrado.</DialogDescription></DialogHeader><button className="modal-primary-action" onClick={() => { setPayment("pix"); setCardDialogOpen(false); }}>Escolher pagamento por Pix</button><button className="modal-secondary-action" onClick={() => { setCardDialogState("form"); setCardDialogOpen(false); }}>Voltar ao checkout</button></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
