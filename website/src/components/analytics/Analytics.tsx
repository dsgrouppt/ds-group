"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackPageview } from "@/lib/analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Script do Google Tag Manager (cabeçalho). Só é injetado se
 * NEXT_PUBLIC_GTM_ID estiver definido — em ambiente de desenvolvimento sem
 * essa variável, a aplicação funciona normalmente sem qualquer tracking.
 */
export function GoogleTagManagerScript() {
  if (!GTM_ID) return null;
  return (
    <Script id="gtm-script" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

/** Fallback <noscript> do GTM — colocar logo a seguir à tag de abertura de <body>. */
export function GoogleTagManagerNoscript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}

/**
 * Google Analytics 4 direto. Usar apenas se o GA4 NÃO estiver a ser gerido
 * a partir do GTM (evita disparo duplicado de eventos de pageview).
 */
export function GoogleAnalyticsScript() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { send_page_view: false });
        window.gtag = gtag;`}
      </Script>
    </>
  );
}

/**
 * Meta Pixel direto. Usar apenas se o Pixel NÃO estiver a ser gerido a
 * partir do GTM.
 */
export function MetaPixelScript() {
  if (!META_PIXEL_ID) return null;
  return (
    <Script id="meta-pixel-init" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${META_PIXEL_ID}');
      fbq('track', 'PageView');`}
    </Script>
  );
}

/**
 * Dispara um evento de pageview a cada mudança de rota. Necessário porque o
 * App Router não gera eventos de navegação automáticos como o Pages Router.
 * Deve ser montado dentro de <Suspense> (usa useSearchParams).
 */
export function AnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    trackPageview(url);
  }, [pathname, searchParams]);

  return null;
}
