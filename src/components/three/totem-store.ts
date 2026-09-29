// Plain mutable store shared between DOM sections and the WebGL scene (read every frame, no re-renders).
export const totemState = {
  section: "inicio",
  step: -1, // anatomy step, -1 = overview
  segment: 0,
  segmentFrom: 0,
  segmentProgress: 1,
  segmentPulse: 0,
  label: "Seu atendimento começa aqui",
  lenis: null as import("lenis").default | null,
};

export const TOTEM_SECTIONS = ["inicio", "solucoes", "anatomia", "segmentos", "produtos", "clientes", "por-que", "como-funciona", "contato"];
