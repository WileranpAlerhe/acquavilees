"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, BadgeCheck, BadgePercent, CheckCircle2, Clock3, Copy, CreditCard, LoaderCircle, LockKeyhole, MapPin, PackageCheck, QrCode, RefreshCw, ShieldCheck, Sparkles, Truck, UserRound } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckoutHeader, OrderSummary } from "@/app/checkout-components";
import { CartState, cartSubtotal, clearCart, loadCart, money } from "@/app/commerce";
import { analyticsItems, trackEvent } from "@/app/analytics";

type Customer = { name: string; email: string; phone: string; cpf: string };
type Address = { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };
type PaymentDialogState = "idle" | "processing" | "pixReady" | "declined" | "unavailable";
type PixCharge = { transactionId: string; orderCode: string; amount: number; qrCode: string; qrCodeUrl: string; expiresAt: string | null };

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartState | null>(null);
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState<Customer>({ name: "", email: "", phone: "", cpf: "" });
  const [address, setAddress] = useState<Address>({ cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" });
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("pix");
  const [terms, setTerms] = useState(false);
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
  const numberRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const loadedCart = loadCart();
    setCart(loadedCart);
    setReady(true);
    if (loadedCart) trackEvent("begin_checkout", { currency: "BRL", value: cartSubtotal(loadedCart), items: analyticsItems(loadedCart) });
  }, []);

  function setCustomerField(field: keyof Customer, value: string) { setCustomer((current) => ({ ...current, [field]: value })); }
  function setAddressField(field: keyof Address, value: string) { setAddress((current) => ({ ...current, [field]: value })); }

  async function lookupCep() {
    const digits = address.cep.replace(/\D/g, "");
    if (digits.length !== 8) { setError("Digite um CEP válido para continuar."); return; }
    setCepLoading(true); setError(""); setCepFound(false);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (!response.ok || data.erro) throw new Error("CEP inválido");
      setAddress((current) => ({ ...current, cep: digits, street: data.logradouro || "", district: data.bairro || "", city: data.localidade || "", state: data.uf || "" }));
      setCepFound(true);
      window.setTimeout(() => numberRef.current?.focus(), 50);
    } catch { setError("CEP não encontrado. Confira os números e tente novamente."); }
    finally { setCepLoading(false); }
  }

  function validate() {
    if (!customer.name.trim() || !customer.email.includes("@") || customer.phone.replace(/\D/g, "").length < 10 || customer.cpf.replace(/\D/g, "").length !== 11) return "Preencha corretamente seus dados de identificação.";
    if (!cepFound || !address.street || !address.number || !address.city || !address.state) return "Consulte o CEP e complete o endereço de entrega.";
    if (!terms) return "Confirme os termos da compra para finalizar.";
    return "";
  }

  function finalizeOrder(selectedPayment: string, discountRate: number, paymentStatus = "approved", transactionId?: string, orderCode?: string) {
    if (!cart) return;
    const shippingPrice = shipping === "express" ? 29.9 : 0;
    const subtotal = cartSubtotal(cart);
    const total = subtotal + shippingPrice - subtotal * discountRate;
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
    clearCart();
    window.location.assign("/pedido-confirmado");
  }

  const checkPixStatus = async (charge = pixCharge, manual = false) => {
    if (!charge || checkingPix) return;
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
    if (!paymentDialogOpen || paymentDialogState !== "pixReady" || !pixCharge) return;
    const schedule = () => {
      pollTimerRef.current = window.setTimeout(async () => {
        await checkPixStatus(pixCharge, false);
        schedule();
      }, 5000);
    };
    schedule();
    return () => { if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current); };
  }, [paymentDialogOpen, paymentDialogState, pixCharge]);

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    if (!cart) return;
    const validationError = validate();
    if (validationError) { setError(validationError); window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    setError("");
    const analyticsSubtotal = cartSubtotal(cart);
    const analyticsShipping = shipping === "express" ? 29.9 : 0;
    const analyticsDiscount = payment === "pix" ? analyticsSubtotal * (pixBonus ? 0.1 : 0.05) : 0;
    trackEvent("add_shipping_info", { currency: "BRL", value: analyticsSubtotal + analyticsShipping - analyticsDiscount, shipping_tier: shipping, items: analyticsItems(cart) });
    trackEvent("add_payment_info", { currency: "BRL", value: analyticsSubtotal + analyticsShipping - analyticsDiscount, payment_type: payment, items: analyticsItems(cart) });
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
        setPixCharge({
          transactionId: result.transactionId,
          orderCode: result.orderCode || orderCode,
          amount: result.amount,
          qrCode: result.pix.qrCode,
          qrCodeUrl: result.pix.qrCodeUrl,
          expiresAt: result.pix.expiresAt,
        });
        setPixStatusMessage("Aguardando o pagamento...");
        trackEvent("pix_generated", { currency: "BRL", value: result.amount, transaction_id: result.transactionId, order_id: result.orderCode || orderCode, items: analyticsItems(cart) });
        setPaymentDialogState("pixReady");
        return;
      }
      const declineCodes = new Set(["CARD_DECLINED", "PAYMENT_DECLINED", "TRANSACTION_DECLINED"]);
      if (response.ok) {
        finalizeOrder("card", 0);
      } else if (response.status === 402 || declineCodes.has(String(result.code))) {
        trackEvent("payment_declined", { payment_type: "card", order_id: orderCode, value: cartSubtotal(cart) + (shipping === "express" ? 29.9 : 0), currency: "BRL" });
        setPixBonus(true);
        setPaymentDialogState("declined");
      } else {
        setPaymentDialogState("unavailable");
      }
    } catch (paymentError) {
      if (payment === "pix") setError(paymentError instanceof Error ? paymentError.message : "Não foi possível gerar o Pix agora.");
      setPaymentDialogState("unavailable");
    }
  }

  async function copyPixCode() {
    if (!pixCharge) return;
    await navigator.clipboard.writeText(pixCharge.qrCode);
    setPixCopied(true);
    window.setTimeout(() => setPixCopied(false), 1800);
  }

  if (!ready) return <div className="checkout-page"><CheckoutHeader current="checkout" /><div className="checkout-loading"><LoaderCircle className="spin" /> Preparando checkout...</div></div>;
  if (!cart) return <div className="checkout-page"><CheckoutHeader current="checkout" /><main className="empty-cart"><CreditCard /><h1>Não há produtos para finalizar</h1><p>Adicione o Purificador Terracota ao carrinho antes de entrar no checkout.</p><a className="checkout-primary" href="/">Voltar para o produto</a></main></div>;

  const shippingPrice = shipping === "express" ? 29.9 : 0;
  const pixDiscountRate = payment === "pix" ? (pixBonus ? 0.1 : 0.05) : 0;
  const checkoutTotal = cartSubtotal(cart) + shippingPrice - cartSubtotal(cart) * pixDiscountRate;

  return (
    <div className="checkout-page yampi-checkout">
      <CheckoutHeader current="checkout" />
      <main className="checkout-container checkout-grid">
        <form className="checkout-form" onSubmit={submitOrder} noValidate>
          <div className="checkout-return"><a href="/carrinho">← Voltar ao carrinho</a><span><LockKeyhole /> Checkout seguro</span></div>
          {error && <div className="checkout-alert" role="alert">{error}</div>}

          <section className="checkout-card">
            <div className="section-heading"><span>1</span><UserRound /><div><h1>Identificação</h1><p>Use seus dados para acompanhar o pedido</p></div></div>
            <div className="form-grid two"><label className="full"><span>Nome completo</span><input value={customer.name} onChange={(e) => setCustomerField("name", e.target.value)} autoComplete="name" placeholder="Digite seu nome completo" /></label><label><span>E-mail</span><input value={customer.email} onChange={(e) => setCustomerField("email", e.target.value)} autoComplete="email" inputMode="email" placeholder="seuemail@exemplo.com" /></label><label><span>Celular</span><input value={customer.phone} onChange={(e) => setCustomerField("phone", e.target.value)} autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" /></label><label className="full"><span>CPF</span><input value={customer.cpf} onChange={(e) => setCustomerField("cpf", e.target.value.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" placeholder="000.000.000-00" /></label></div>
          </section>

          <section className="checkout-card">
            <div className="section-heading"><span>2</span><MapPin /><div><h2>Endereço de entrega</h2><p>Consulte o CEP para preencher automaticamente</p></div></div>
            <div className="cep-checkout"><label><span>CEP</span><input value={address.cep} onChange={(e) => { setAddressField("cep", e.target.value.replace(/\D/g, "").slice(0, 8)); setCepFound(false); }} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" /></label><button type="button" onClick={lookupCep} disabled={cepLoading}>{cepLoading ? <LoaderCircle className="spin" /> : "Buscar CEP"}</button></div>
            {cepFound && <div className="address-found"><BadgeCheck /> Endereço encontrado. Complete o número e confira os dados.</div>}
            <div className={cepFound ? "form-grid address-grid visible" : "form-grid address-grid"}>
              <label className="full"><span>Rua/Avenida</span><input value={address.street} onChange={(e) => setAddressField("street", e.target.value)} autoComplete="address-line1" /></label>
              <label><span>Número</span><input ref={numberRef} value={address.number} onChange={(e) => setAddressField("number", e.target.value)} autoComplete="address-line2" placeholder="Número" /></label>
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
            <RadioGroup value={payment} onValueChange={setPayment} className="option-list payment-options">
              <label className={payment === "pix" ? "checkout-option professional-option payment-option selected" : "checkout-option professional-option payment-option"}><RadioGroupItem value="pix" /><span className="option-visual pix-visual"><img src="/assets/pix.svg" alt="" /></span><span><strong>Pix <em>Recomendado</em></strong><small>Aprovação rápida • pagamento protegido</small></span><b className="discount-badge"><BadgePercent /> {pixBonus ? "10% OFF" : "5% OFF"}</b></label>
              <label className={payment === "card" ? "checkout-option professional-option payment-option selected" : "checkout-option professional-option payment-option"}><RadioGroupItem value="card" /><span className="option-visual card-visual"><CreditCard /></span><span><strong>Cartão de crédito</strong><small>Parcele em até 10x sem juros</small></span><span className="card-brands" aria-label="Aceitamos Visa e Mastercard"><img src="/assets/visa.svg" alt="Visa" /><img src="/assets/mastercard.svg" alt="Mastercard" /></span></label>
            </RadioGroup>
            {payment === "pix" && <div className={pixBonus ? "pix-info professional-payment-info bonus-active" : "pix-info professional-payment-info"}><span className="pix-info-icon"><Sparkles /></span><div><strong>{pixBonus ? "Oferta especial desbloqueada: 10% OFF" : "Economize 5% pagando com Pix"}</strong></div></div>}
          </section>

          <label className="terms-row"><Checkbox checked={terms} onCheckedChange={(checked) => setTerms(checked === true)} /><span>Li e concordo com os termos de compra e com a política de privacidade.</span></label>
          <button className="place-order" type="submit"><LockKeyhole /> {payment === "card" ? "Processar cartão" : "Finalizar com Pix"} • {money(checkoutTotal)}</button>
        </form>

        <div className="checkout-aside"><OrderSummary cart={cart} shipping={shippingPrice} pixDiscountRate={pixDiscountRate} /></div>
      </main>

      <Dialog open={paymentDialogOpen} onOpenChange={(open) => paymentDialogState !== "processing" && setPaymentDialogOpen(open)}>
        <DialogContent className="payment-result-modal" showCloseButton={paymentDialogState !== "processing"}>
          {paymentDialogState === "processing" && <div className="payment-modal-state processing-state"><span className="payment-status-icon"><LoaderCircle className="spin" /></span><DialogHeader><DialogTitle>Processando pagamento</DialogTitle><DialogDescription>Aguarde um momento. Não feche esta janela.</DialogDescription></DialogHeader><div className="processing-bar"><i /></div><div className="modal-security"><LockKeyhole /> Conexão protegida</div></div>}
          {paymentDialogState === "pixReady" && pixCharge && <div className="payment-modal-state pix-ready-state"><span className="pix-modal-brand"><QrCode /> Pix gerado com segurança</span><DialogHeader><DialogTitle>Escaneie para pagar</DialogTitle><DialogDescription>Abra o app do seu banco, escaneie o QR Code ou use o código copia e cola.</DialogDescription></DialogHeader>{pixCharge.qrCodeUrl ? <div className="pix-qr-frame"><img src={pixCharge.qrCodeUrl} alt="QR Code do pagamento Pix" /></div> : <div className="pix-qr-placeholder"><QrCode /></div>}<strong className="pix-modal-total">{money(pixCharge.amount)}</strong><button className="pix-copy-button" onClick={copyPixCode}>{pixCopied ? <CheckCircle2 /> : <Copy />}{pixCopied ? "Código copiado" : "Copiar código Pix"}</button><div className="pix-status-line"><Clock3 /><span>{pixStatusMessage}</span></div><button className="pix-check-button" onClick={() => checkPixStatus(pixCharge, true)} disabled={checkingPix}>{checkingPix ? <LoaderCircle className="spin" /> : <RefreshCw />} Já paguei, verificar agora</button>{pixCharge.expiresAt && <small className="pix-expiration">Válido até {new Date(pixCharge.expiresAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>}</div>}
          {paymentDialogState === "declined" && <div className="payment-modal-state declined-state"><span className="payment-status-icon"><AlertCircle /></span><DialogHeader><DialogTitle>Cartão não autorizado</DialogTitle><DialogDescription>Seu cartão não foi aprovado. Nenhum valor foi cobrado.</DialogDescription></DialogHeader><div className="pix-recovery-offer"><BadgePercent /><div><small>OFERTA LIBERADA</small><strong>Finalize no Pix com 10% OFF</strong><span>Seu novo total é {money(cartSubtotal(cart) + shippingPrice - cartSubtotal(cart) * 0.1)}</span></div></div><button className="modal-primary-action" onClick={() => { setPayment("pix"); setPaymentDialogOpen(false); }}>Usar Pix com 10% OFF</button><button className="modal-secondary-action" onClick={() => setPaymentDialogOpen(false)}>Voltar ao checkout</button></div>}
          {paymentDialogState === "unavailable" && <div className="payment-modal-state unavailable-state"><span className="payment-status-icon"><AlertCircle /></span><DialogHeader><DialogTitle>{payment === "pix" ? "Pix indisponível no momento" : "Cartão indisponível no momento"}</DialogTitle><DialogDescription>{payment === "pix" ? "Não foi possível gerar o Pix. Tente novamente em instantes." : "Escolha outra forma de pagamento para continuar."}</DialogDescription></DialogHeader>{payment === "card" && <button className="modal-primary-action" onClick={() => { setPayment("pix"); setPaymentDialogOpen(false); }}>Escolher pagamento por Pix</button>}<button className="modal-secondary-action" onClick={() => setPaymentDialogOpen(false)}>Voltar ao checkout</button></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
