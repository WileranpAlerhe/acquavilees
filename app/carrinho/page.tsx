"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, LoaderCircle, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { CheckoutHeader, OrderSummary } from "@/app/checkout-components";
import { CartState, PRODUCT_PRICE, REFILL_COMPARE_PRICE, REFILL_PRICE, clearCart, loadCart, money, saveCart } from "@/app/commerce";

export default function CartPage() {
  const [cart, setCart] = useState<CartState | null>(null);
  const [ready, setReady] = useState(false);
  const [cep, setCep] = useState("");
  const [destination, setDestination] = useState("");
  const [cepError, setCepError] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => { setCart(loadCart()); setReady(true); }, []);
  useEffect(() => { if (ready && cart) saveCart(cart); }, [cart, ready]);

  async function lookupCep() {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) { setCepError("Digite um CEP válido com 8 números."); return; }
    setLoadingCep(true); setCepError(""); setDestination("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (!response.ok || data.erro) throw new Error("CEP não encontrado");
      setDestination(`${data.localidade} - ${data.uf}`);
    } catch {
      setCepError("Não foi possível consultar esse CEP. Tente novamente.");
    } finally { setLoadingCep(false); }
  }

  if (!ready) return <div className="checkout-page"><CheckoutHeader current="cart" /><div className="checkout-loading"><LoaderCircle className="spin" /> Carregando seu carrinho...</div></div>;

  if (!cart) return <div className="checkout-page"><CheckoutHeader current="cart" /><main className="empty-cart"><ShoppingBag /><h1>Seu carrinho está vazio</h1><p>Escolha o Purificador Terracota para continuar sua compra.</p><a className="checkout-primary" href="/">Voltar para o produto</a></main></div>;

  return (
    <div className="checkout-page">
      <CheckoutHeader current="cart" />
      <main className="checkout-container cart-grid">
        <section className="cart-main">
          <a className="back-link" href="/"><ChevronLeft /> Continuar comprando</a>
          <div className="checkout-title"><span>1</span><div><h1>Seu carrinho</h1><p>Confira os produtos antes de continuar</p></div></div>

          <article className="cart-item">
            <img src="/assets/terracota-frente.png" alt="Purificador de Água Acqualive Terracota" />
            <div className="cart-item-info"><strong>Purificador de Água Acqualive Terracota</strong><small>Cor: Terracota</small><div className="cart-qty"><button aria-label="Diminuir quantidade" onClick={() => setCart({ ...cart, quantity: Math.max(1, cart.quantity - 1) })}><Minus /></button><span>{cart.quantity}</span><button aria-label="Aumentar quantidade" onClick={() => setCart({ ...cart, quantity: Math.min(10, cart.quantity + 1) })}><Plus /></button></div></div>
            <div className="cart-item-price"><strong>{money(PRODUCT_PRICE * cart.quantity)}</strong><button aria-label="Remover produto" onClick={() => { clearCart(); setCart(null); }}><Trash2 /> Remover</button></div>
          </article>

          {cart.addRefill && <article className="cart-item compact-item">
            <img src="/assets/refil-nanno.png" alt="Kit Refil Fresh Nanno V" />
            <div className="cart-item-info"><strong>Kit Refil Fresh Nanno V</strong><small>Oferta adicional</small></div>
            <div className="cart-item-price"><strong>{money(REFILL_PRICE)}</strong><button onClick={() => setCart({ ...cart, addRefill: false })}><Trash2 /> Remover</button></div>
          </article>}

          {!cart.addRefill && <button className="refill-offer" onClick={() => setCart({ ...cart, addRefill: true })}><img src="/assets/refil-nanno.png" alt="" /><span><small>OFERTA ESPECIAL</small><strong>Adicione o Kit Refil Fresh Nanno V</strong><b>de {money(REFILL_COMPARE_PRICE)} por {money(REFILL_PRICE)}</b></span><em>Adicionar +</em></button>}

          <section className="shipping-calc"><div className="shipping-heading"><Truck /><span><strong>Calcule a entrega</strong><small>Informe seu CEP para consultar o destino</small></span></div><div className="cep-row"><input value={cep} onChange={(event) => setCep(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="00000-000" aria-label="CEP" /><button onClick={lookupCep} disabled={loadingCep}>{loadingCep ? <LoaderCircle className="spin" /> : "Calcular"}</button></div>{cepError && <p className="field-error">{cepError}</p>}{destination && <div className="shipping-result"><span><strong>Entrega padrão</strong><small>{destination} • 8 a 12 dias úteis</small></span><b>Grátis</b></div>}</section>
        </section>

        <div className="cart-aside"><OrderSummary cart={cart} /><a className="checkout-primary" href="/checkout">Continuar para o checkout</a><p className="checkout-caption">Você poderá revisar endereço, entrega e pagamento antes de finalizar.</p></div>
      </main>
    </div>
  );
}
