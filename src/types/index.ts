export type ServiceCategory =
  | "residencial"
  | "premium"
  | "cozinhas"
  | "casas-de-banho"
  | "moradias"
  | "comercial";

export interface Service {
  slug: string;
  num: string;
  category: ServiceCategory;
  title: string;
  subtitle: string;
  description: string[];
  includes: string[];
}

export interface Project {
  id: string;
  title: string; // usar "[Nome do Projeto]" enquanto não houver dado real
  location: string;
  category: ServiceCategory;
  image?: string; // caminho para fotografia real (public/ ou CDN); omitir para mostrar placeholder
  alt?: string;
}

export interface Stat {
  label: string;
  value: string | null; // null => mostra placeholder "—"; preencher com valor real quando existir
  suffix?: string;
}

export interface TeamMember {
  name: string | null; // null => mostra placeholder "[Nome]"
  role: string;
  image?: string;
}

export interface TimelineStep {
  time: string;
  title: string;
  description: string;
}

export interface VideoItem {
  id: string;
  title: string;
  embedUrl?: string; // URL de embed (YouTube/Vimeo) quando existir
}

export interface VideoTestimonial {
  id: string;
  clientName: string | null;
  context: string;
  embedUrl?: string;
}
