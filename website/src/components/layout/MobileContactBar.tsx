import { siteConfig } from "@/lib/site-data";

/**
 * Barra de contacto fixa, visível apenas em mobile (ver .mobile-contact-bar
 * em globals.css — escondida a partir do breakpoint `lg` via `hidden lg:hidden`
 * não é suficiente sozinho, por isso o corte real vive no CSS).
 *
 * Decisão de UX: dois botões apenas (Ligar / WhatsApp), sem terceiro botão,
 * sem badge, sem animação de chamada de atenção — consistente com o tom
 * "quiet luxury" do resto do site. Não é fechável de propósito: é uma barra
 * de contacto, não um pop-up, e ocupa uma faixa fina e discreta.
 */
export function MobileContactBar() {
  return (
    <div className="mobile-contact-bar" aria-label="Contacto rápido">
      <a href={`tel:${siteConfig.phone}`} className="mobile-contact-btn">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        Ligar
      </a>
      <a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mobile-contact-btn whatsapp">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67a8.2 8.2 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.82c0 4.55-3.7 8.24-8.25 8.24a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.55 3.7-8.24 8.26-8.24M8.53 6.7c-.17 0-.45.06-.68.32-.24.25-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.8 2.89 4.45 3.94 2.2.87 2.65.7 3.13.65.48-.04 1.53-.62 1.75-1.22.21-.6.21-1.11.15-1.22-.07-.1-.24-.17-.5-.3-.26-.13-1.53-.75-1.77-.84-.24-.09-.4-.13-.58.13-.17.26-.66.84-.81 1.01-.15.17-.3.19-.56.06-.26-.13-1.09-.4-2.08-1.28-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.3.4-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45C9.4 8.35 8.85 7.06 8.6 6.51c-.17-.38-.35-.4-.5-.4-.13-.01-.28-.01-.43-.01" />
        </svg>
        WhatsApp
      </a>
    </div>
  );
}
