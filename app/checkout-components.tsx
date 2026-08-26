import { LockKeyhole, ShieldCheck } from "lucide-react";
import { CartState, PRODUCT_PRICE, REFILL_PRICE, cartSubtotal, money } from "@/app/commerce";

export function CheckoutHeader({ current }: { current: "cart" | "checkout" | "done" }) {
  return (
    <>
      <header className="checkout-header">
        <a href="/" aria-label="Voltar para Acqualive"><img src="/assets/logo-acqualive.png" alt="Acqualive" /></a>
        <span><LockKeyhole size={15} /> Compra segura</span>
      </header>
      <nav className="checkout-steps" aria-label="Etapas da compra">
        <span className={current === "cart" ? "active" : "done"}>1 <b>Carrinho</b></span>
        <i />
        <span className={current === "checkout" ? "active" : current === "done" ? "done" : ""}>2 <b>Entrega e pagamento</b></span>
        <i />
        <span className={current === "done" ? "active" : ""}>3 <b>Confirmação</b></span>
      </nav>
    </>
  );
}

export function OrderSummary({ cart, shipping = 0, pixDiscountRate = 0, compact = false }: { cart: CartState; shipping?: number; pixDiscountRate?: number; compact?: boolean }) {
  const subtotal = cartSubtotal(cart);
  const pixDiscount = subtotal * pixDiscountRate;
  const total = subtotal + shipping - pixDiscount;

  return (
    <aside className={compact ? "order-summary compact" : "order-summary"}>
      <h2>Resumo do pedido</h2>
      <div className="summary-product">
        <span className="summary-image"><img src="/assets/terracota-frente.png" alt="Purificador Acqualive Terracota" /><b>{cart.quantity}</b></span>
        <div><strong>Purificador de Água Acqualive Terracota</strong><small>{money(PRODUCT_PRICE)} cada</small></div>
        <b>{money(PRODUCT_PRICE * cart.quantity)}</b>
      </div>
      {cart.addRefill && <div className="summary-product refill">
        <span className="summary-image"><img src="/assets/refil-nanno.png" alt="Kit Refil Fresh Nanno V" /><b>1</b></span>
        <div><strong>Kit Refil Fresh Nanno V</strong><small>Oferta adicional</small></div>
        <b>{money(REFILL_PRICE)}</b>
      </div>}
      <div className="summary-lines"><span>Subtotal <b>{money(subtotal)}</b></span><span>Frete <b>{shipping ? money(shipping) : "Grátis"}</b></span>{pixDiscount > 0 && <span className="discount">Desconto no Pix ({Math.round(pixDiscountRate * 100)}%) <b>- {money(pixDiscount)}</b></span>}</div>
      <div className="summary-total"><span>Total</span><div><strong>{money(total)}</strong><small>ou em até 10x sem juros</small></div></div>
      <div className="secure-note"><ShieldCheck /><span><strong>Compra 100% segura</strong><small>Seus dados são protegidos e não armazenamos informações do cartão.</small></span></div>
    </aside>
  );
}
