"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck, ChevronLeft, ChevronRight, CircleUserRound, Menu, Minus,
  PackageCheck, Play, Plus, Search, ShieldCheck, ShoppingCart, Star,
  ThumbsDown, ThumbsUp, Truck,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PRODUCT_PRICE, REFILL_COMPARE_PRICE, REFILL_PRICE, saveCart } from "@/app/commerce";

const productImages = [
  { src: "/assets/terracota-frente.png", alt: "Purificador Acqualive Terracota de frente" },
  { src: "/assets/terracota-lado.png", alt: "Purificador Acqualive Terracota de lado" },
  { src: "/assets/terracota-medidas.png", alt: "Medidas do purificador Terracota" },
  { src: "/assets/terracota-ambiente-1.png", alt: "Purificador Terracota em ambiente rústico" },
  { src: "/assets/terracota-ambiente-2.png", alt: "Purificador Terracota em cozinha clara" },
  { src: "/assets/terracota-ambiente-3.png", alt: "Purificador Terracota em cozinha moderna" },
];

const descriptionImages = Array.from({ length: 6 }, (_, index) => ({
  src: `/assets/descricao-${index + 1}.png`,
  alt: `Descrição visual do purificador Acqualive Terracota ${index + 1}`,
}));

const faq = [
  {
    q: "Qual é a real diferença entre o Terracota e um filtro de barro comum?",
    a: "O Terracota une a filtragem por gravidade à tecnologia TriWay, que auxilia na remoção de impurezas, partículas, metais pesados e cloro, além de elevar o pH e enriquecer a água com magnésio.",
  },
  {
    q: 'O que significa dizer que a água do Terracota tem "PRAL Negativo"?',
    a: "PRAL negativo indica uma água com perfil alcalino. O sistema foi desenvolvido para entregar uma hidratação mais leve, pura e equilibrada para o consumo diário.",
  },
  {
    q: "Como funciona a manutenção e a troca dos elementos filtrantes?",
    a: "A limpeza externa é simples e a substituição dos elementos filtrantes é feita de forma manual. A periodicidade depende do volume e da qualidade da água utilizada.",
  },
];

const reviews = [
  {
    name: "ROSELENE R.", date: "há um ano", stars: 5,
    text: "Amei o purificador de água acqualive! Muito lindo! Combinou com minha cozinha! Só de saber que vou ter uma água de qualidade em minha casa é tudo de bom!",
    image: "/assets/terracota-ambiente-1.png", likes: 39, dislikes: 13, verified: true,
  },
  {
    name: "Marcos Cittolin", date: "há 2 anos", stars: 4,
    text: "Estou acreditando que se trata de um bom produto, mas acredito que vocês deveriam mandar mais informações sobre ele.",
    likes: 84, dislikes: 9,
  },
  {
    name: "JEANE S.", date: "há um ano", stars: 5, text: "O filtro é lindo!!",
    image: "/assets/terracota-ambiente-3.png", likes: 2, dislikes: 2, verified: true,
  },
  {
    name: "Jorge Antonio de Assumpcao Martins", date: "há um ano", stars: 4,
    text: "Eu fiquei meio surpreso de ter de jogar 36 litros de água fora antes do primeiro uso. Ainda me questiono porque quando trocam-se os elementos filtrantes são apenas 2 litros. A água ainda está com um sabor diferente... espero que isso saia com o tempo. Não fiz o teste de PH ainda, mas vou fazer.",
    likes: 12, dislikes: 3,
  },
  {
    name: "Dácio Nunes", date: "há 4 anos", stars: 5,
    text: "Esta será uma avaliação das primeiras impressões, devido que ainda irei mandar uma amostra ao laboratório. Bem, minhas considerações iniciais é que mesmo sem realizar os testes o PH alcalino é simplesmente evidente devido à coloração mais cristalina da água e sabor adocicado. O aparelho possui classificação P1 e C1 do Inmetro, é fácil de limpar, montar e instalar. Creio que qualquer pessoa possa realizar em poucos minutos.",
    likes: 12, dislikes: 1,
  },
];

function Stars({ value = 5, size = 19 }: { value?: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} fill={star <= value ? "currentColor" : "#d7dbe2"} strokeWidth={1.4} />
      ))}
    </span>
  );
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addRefill, setAddRefill] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const total = useMemo(() => quantity * PRODUCT_PRICE + (addRefill ? REFILL_PRICE : 0), [quantity, addRefill]);
  const formatPrice = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const addToCart = () => {
    saveCart({ quantity, addRefill });
    setAdded(true);
    setCartOpen(true);
  };

  return (
    <div className="site-shell">
      <div className="announcement">Beba água Acqualive!</div>
      <header className="site-header">
        <Sheet>
          <SheetTrigger asChild><button className="icon-button" aria-label="Abrir menu"><Menu /></button></SheetTrigger>
          <SheetContent side="left" className="menu-sheet">
            <SheetHeader><SheetTitle>Acqualive</SheetTitle><SheetDescription>Água pura para todos os dias.</SheetDescription></SheetHeader>
            <nav className="drawer-nav" aria-label="Menu principal">
              <a href="#produto">Purificador Terracota</a><a href="#descricao">Descrição do produto</a>
              <a href="#beneficios">Benefícios</a><a href="#avaliacoes">Avaliações</a>
            </nav>
          </SheetContent>
        </Sheet>

        <a href="#produto" className="brand" aria-label="Acqualive - início"><img src="/assets/logo-acqualive.png" alt="Acqualive" /></a>

        <div className="header-actions">
          <Dialog>
            <DialogTrigger asChild><button className="icon-button" aria-label="Pesquisar"><Search /></button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pesquisar na Acqualive</DialogTitle></DialogHeader>
              <label className="search-field"><Search size={18} /><input autoFocus placeholder="O que você procura?" aria-label="Campo de pesquisa" /></label>
              <p className="search-hint">Experimente buscar por “Terracota” ou “Refil Nanno”.</p>
            </DialogContent>
          </Dialog>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button className="icon-button cart-trigger" aria-label="Abrir carrinho"><ShoppingCart />{added && <span className="cart-dot">{quantity + (addRefill ? 1 : 0)}</span>}</button>
            </SheetTrigger>
            <SheetContent className="cart-sheet">
              <SheetHeader><SheetTitle>Seu carrinho</SheetTitle><SheetDescription>{added ? "Produto adicionado com sucesso." : "Seu carrinho está vazio."}</SheetDescription></SheetHeader>
              {added && <div className="cart-content">
                <div className="cart-product"><img src="/assets/terracota-frente.png" alt="Purificador Terracota" /><div><strong>Purificador de Água Acqualive Terracota</strong><span>Quantidade: {quantity}</span></div></div>
                {addRefill && <p className="cart-extra">+ Kit Refil Fresh Nanno V</p>}
                <div className="cart-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
                <div className="cart-actions">
                  <a className="secondary-button" href="/carrinho">Ver carrinho</a>
                  <a className="primary-button" href="/checkout">Finalizar compra</a>
                </div>
              </div>}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="produto">
        <section className="promo-wrap offer-banner" aria-label="Oferta do Purificador Terracota">
          <div className="offer-copy"><span>OFERTA ESPECIAL</span><h2>Água pura e alcalina todos os dias</h2><p>Purificador Acqualive Terracota</p><strong>{formatPrice(PRODUCT_PRICE)}</strong><small>ou 10x de {formatPrice(PRODUCT_PRICE / 10)} sem juros</small></div>
          <img src="/assets/terracota-frente.png" alt="Purificador Acqualive Terracota em oferta" />
        </section>

        <section className="product-layout">
          <div className="gallery-column">
            <div className="main-image-wrap">
              <button className="gallery-arrow left" aria-label="Imagem anterior" onClick={() => setSelectedImage((selectedImage + productImages.length - 1) % productImages.length)}><ChevronLeft /></button>
              <img className="main-product-image" src={productImages[selectedImage].src} alt={productImages[selectedImage].alt} />
              <button className="gallery-arrow right" aria-label="Próxima imagem" onClick={() => setSelectedImage((selectedImage + 1) % productImages.length)}><ChevronRight /></button>
            </div>
            <div className="thumbnails" role="list" aria-label="Galeria do produto">
              {productImages.map((image, index) => <button key={image.src} className={index === selectedImage ? "thumb active" : "thumb"} onClick={() => setSelectedImage(index)} aria-label={`Ver imagem ${index + 1}`}><img src={image.src} alt="" /></button>)}
            </div>
          </div>

          <div className="product-info">
            <h1>Purificador de Água Acqualive Terracota</h1>
            <a className="rating-line" href="#avaliacoes"><Stars /><span>387 avaliações</span></a>
            <div className="price-block"><strong>{formatPrice(PRODUCT_PRICE)}</strong><span>10x de <b>{formatPrice(PRODUCT_PRICE / 10)}</b> sem juros</span><small>ou <b>{formatPrice(PRODUCT_PRICE * 0.95)}</b> no Pix (5% de desconto)</small></div>
            <p className="intro-copy">Produto mais desejado da marca, com design vintage e estilo retrô, o <strong>Purificador de Água Terracota</strong> combina com todas as decorações, é a verdadeira evolução dos filtros de barro, aliando tradição e tecnologia exclusiva. Um purificador que deixa a água pura, alcalina, rica em magnésio, livre de cloro e perfeita para a saúde e vai ficar perfeito na sua casa.</p>
            <div className="quantity" aria-label="Selecionar quantidade"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade"><Minus /></button><span>{quantity}</span><button onClick={() => setQuantity(quantity + 1)} aria-label="Aumentar quantidade"><Plus /></button></div>
            <button className="primary-button add-button" onClick={addToCart}>Adicionar ao carrinho <span>–</span> {formatPrice(quantity * PRODUCT_PRICE)}</button>
            <div className="upsell"><h2>Leve também</h2><label className={addRefill ? "upsell-card selected" : "upsell-card"}>
              <input type="checkbox" checked={addRefill} onChange={(event) => setAddRefill(event.target.checked)} />
              <img src="/assets/refil-nanno.png" alt="Kit Refil Fresh Nanno V" /><span className="upsell-name">Kit Refil Fresh Nanno V</span>
              <span className="upsell-price"><s>{formatPrice(REFILL_COMPARE_PRICE)}</s><strong>{formatPrice(REFILL_PRICE)}</strong></span>
            </label></div>
          </div>
        </section>

        <section className="video-card" aria-label="Vídeo do produto"><img src="/assets/video-thumb.jpg" alt="Demonstração do purificador Acqualive Terracota" /><button aria-label="Reproduzir vídeo"><Play fill="currentColor" /></button><span>Purificador de Água Acqualive Brasil</span></section>
        <section className="trust-strip" aria-label="Vantagens da compra">
          <div><Truck /><span><strong>Envio seguro</strong> para todo o Brasil</span></div><div><CircleUserRound /><span><strong>Parcele em até 10x</strong> sem juros</span></div>
          <div><ShieldCheck /><span><strong>Compra 100%</strong> segura</span></div><div><PackageCheck /><span><strong>Garantia</strong> de fábrica</span></div>
        </section>

        <section id="descricao" className="product-details">
          <Accordion type="multiple" defaultValue={["descricao"]} className="details-accordion">
            <AccordionItem value="descricao"><AccordionTrigger>Descrição do produto</AccordionTrigger><AccordionContent><p>Produto mais desejado da marca, com design vintage e estilo retrô, o <strong>Purificador de Água Terracota</strong> combina com todas as decorações, é a verdadeira evolução dos filtros de barro, aliando tradição e tecnologia exclusiva. Um purificador que deixa a água pura, alcalina, rica em magnésio, livre de cloro e perfeita para a saúde e vai ficar perfeito na sua casa.</p></AccordionContent></AccordionItem>
            <AccordionItem value="ficha"><AccordionTrigger>Ficha Técnica</AccordionTrigger><AccordionContent><ul><li>Capacidade: 6 litros</li><li>Altura total: 47 cm</li><li>Largura e profundidade: 30 cm</li><li>Torneira metálica</li><li>Filtragem por gravidade</li></ul></AccordionContent></AccordionItem>
            <AccordionItem value="cuidados"><AccordionTrigger>Cuidados com produto</AccordionTrigger><AccordionContent><p>Higienize com água e pano macio. Não utilize produtos abrasivos. Faça a troca dos elementos filtrantes conforme a recomendação de uso.</p></AccordionContent></AccordionItem>
          </Accordion>
        </section>

        <section className="description-gallery" aria-label="Imagens da descrição do produto">{descriptionImages.map((image) => <img key={image.src} src={image.src} alt={image.alt} loading="lazy" />)}</section>

        <section id="beneficios" className="health-section"><p className="eyebrow">Hidratação funcional</p><h2>Muito mais saúde</h2><div className="health-card"><span className="health-icon">♨</span><h3>Água anti-inflamatória</h3><p>A água alcalina é considerada anti-inflamatória natural por sua alta taxa de minerais essenciais.</p></div><div className="dots"><span className="active" /><span /><span /></div></section>

        <section className="faq-section"><h2>FAQs</h2><Accordion type="single" collapsible className="faq-list">{faq.map((item, index) => <AccordionItem key={item.q} value={`faq-${index}`}><AccordionTrigger>{item.q}</AccordionTrigger><AccordionContent>{item.a}</AccordionContent></AccordionItem>)}</Accordion></section>

        <section id="avaliacoes" className="reviews-section">
          <div className="reviews-head"><div><h2>Avaliações</h2><div className="score"><strong>4.9</strong><Stars size={22} /></div></div><button>QUERO AVALIAR</button></div>
          <div className="reviews-toolbar"><strong>387 avaliações</strong><select aria-label="Ordenar avaliações"><option>mais úteis</option><option>mais recentes</option><option>maiores notas</option></select></div>
          <div className="reviews-list">{reviews.map((review) => <article className="review" key={review.name}>
            <Stars value={review.stars} size={19} /><div className="review-person"><strong>{review.name}</strong><span>{review.date}</span>{review.verified && <em><BadgeCheck size={15} /> comprador verificado</em>}</div>
            <p>{review.text}</p>{review.image && <img className="review-image" src={review.image} alt={`Foto enviada por ${review.name}`} />}<small>originalmente avaliado em Purificador de Água Acqualive Terracota</small>
            <div className="helpful"><strong>esta avaliação foi útil?</strong><span><button aria-label="Marcar como útil"><ThumbsUp />{review.likes}</button><button aria-label="Marcar como não útil"><ThumbsDown />{review.dislikes}</button></span></div>
          </article>)}</div>
        </section>
      </main>

      <div className="mobile-buybar"><div><strong>Purificador de Água Acqualive Terracota</strong><span>{formatPrice(PRODUCT_PRICE)}</span></div><button onClick={addToCart} aria-label="Adicionar ao carrinho"><ShoppingCart /></button></div>
    </div>
  );
}
