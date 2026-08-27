"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CircleCheck, Copy, PackageCheck, QrCode, Truck } from "lucide-react";
import { CheckoutHeader } from "@/app/checkout-components";
import { CartState, money } from "@/app/commerce";
import { analyticsItems, trackEvent } from "@/app/analytics";

type Order = {
  code: string;
  customer: { name: string; email: string };
  address: { street: string; number: string; complement: string; district: string; city: string; state: string; cep: string };
  shipping: string;
  payment: string;
  paymentStatus?: string;
  transactionId?: string;
  total: number;
  cart: CartState;
};

export default function OrderConfirmedPage() {
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("acqualive-last-order");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Order;
      setOrder(parsed);
      const purchaseKey = `acqualive-ga4-purchase-${parsed.code}`;
      if (parsed.paymentStatus === "approved" && !window.localStorage.getItem(purchaseKey)) {
        const sent = trackEvent("purchase", { transaction_id: parsed.code, value: parsed.total, currency: "BRL", shipping: parsed.shipping === "express" ? 29.9 : 0, payment_type: parsed.payment, items: analyticsItems(parsed.cart) });
        if (sent) window.localStorage.setItem(purchaseKey, "1");
      }
    } catch { /* session unavailable */ }
  }, []);

  if (!order) return <div className="checkout-page"><CheckoutHeader current="done" /><main className="empty-cart"><PackageCheck /><h1>Nenhum pedido recente</h1><p>Quando você concluir o checkout, o resumo aparecerá aqui.</p><a className="checkout-primary" href="/">Voltar para a loja</a></main></div>;

  return (
    <div className="checkout-page confirmation-page">
      <CheckoutHeader current="done" />
      <main className="confirmation-container">
        <section className="confirmation-hero"><span><CircleCheck /></span><p>Pagamento aprovado</p><h1>Obrigado pela compra, {order.customer.name.split(" ")[0]}!</h1><small>Seu pedido foi confirmado com sucesso.</small></section>
        <div className="confirmation-grid">
          <section className="confirmation-card order-code"><div><span>Número do pedido</span><strong>#{order.code}</strong></div><button onClick={() => navigator.clipboard?.writeText(order.code)}><Copy /> Copiar</button></section>
          <section className="confirmation-card payment-status"><div className="confirmation-title"><QrCode /><div><h2>{order.payment === "pix" ? "Pagamento via Pix" : "Pagamento com cartão"}</h2><p className="approved-label">Status: aprovado</p></div></div><div className="approved-payment"><BadgeCheck /><span><strong>Pagamento confirmado</strong>{order.transactionId && <small>Transação {order.transactionId}</small>}</span></div></section>
          <section className="confirmation-card"><h2>Resumo da entrega</h2><div className="delivery-summary"><Truck /><span><strong>{order.shipping === "express" ? "Entrega expressa" : "Entrega padrão"}</strong><small>{order.address.street}, {order.address.number}{order.address.complement ? `, ${order.address.complement}` : ""}<br />{order.address.district} • {order.address.city} - {order.address.state}<br />CEP {order.address.cep}</small></span></div></section>
          <section className="confirmation-card"><h2>Itens do pedido</h2><div className="confirmation-product"><img src="/assets/terracota-frente.png" alt="Purificador Terracota" /><span><strong>Purificador de Água Acqualive Terracota</strong><small>Quantidade: {order.cart.quantity}</small></span></div>{order.cart.addRefill && <div className="confirmation-product"><img src="/assets/refil-nanno.png" alt="Kit Refil Nanno V" /><span><strong>Kit Refil Fresh Nanno V</strong><small>Quantidade: 1</small></span></div>}<div className="confirmation-total"><span>Total do pedido</span><strong>{money(order.total)}</strong></div></section>
          <section className="next-steps"><h2>Próximos passos</h2><div><span className="done"><BadgeCheck /></span><p><strong>Pagamento aprovado</strong><small>Sua compra foi confirmada.</small></p></div><i /><div><span className="done"><PackageCheck /></span><p><strong>Separação do pedido</strong><small>O produto seguirá para preparação e embalagem.</small></p></div><i /><div><span><Truck /></span><p><strong>Envio</strong><small>O rastreio será enviado por e-mail após a postagem.</small></p></div></section>
        </div>
        <a className="back-store" href="/">Voltar para a loja</a>
      </main>
    </div>
  );
}
