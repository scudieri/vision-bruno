export type SegmentConfig = {
  name: string; panel: string; accent: string; stripe: string;
  modules: readonly string[]; screens: readonly string[]; chips: readonly [string, string, string];
};

export const SEGMENT_CONFIG: readonly SegmentConfig[] = [
  { name: "Saúde", panel: "#F4F7FA", accent: "#12B5A5", stripe: "#12B5A5", modules: ["biometric", "card", "wristband"], screens: ["Check-in do paciente", "Confirme seus dados", "Senha P-042 · Prioritário"], chips: ["Check-in sem fila", "Senha por prioridade", "Integração com o sistema da clínica"] },
  { name: "Varejo e Food Service", panel: "#25282D", accent: "#FF7A1A", stripe: "#FF7A1A", modules: ["counter", "scanner", "nfc", "receipt"], screens: ["Cardápio · Carrinho · Total", "Pagamento aprovado"], chips: ["Self checkout", "Pedido e pagamento no totem", "Menos fila no caixa"] },
  { name: "Academias", panel: "#111315", accent: "#B6F23A", stripe: "#B6F23A", modules: ["face", "qr", "pinpad"], screens: ["Reconhecimento facial", "Acesso liberado ✓"], chips: ["Acesso por biometria facial", "Matrícula e planos", "Operação 24h"] },
  { name: "Financeiro", panel: "#0E1A33", accent: "#C9A24A", stripe: "#C9A24A", modules: ["privacy", "pinpad", "ticket", "document"], screens: ["Escolha o serviço · Caixa · Gerente · Negócios", "Senha G-015"], chips: ["Senhas por tipo de atendimento", "Privacidade no pinpad", "Direcionamento inteligente"] },
  { name: "Educação", panel: "#F7F9FC", accent: "#2E6BFF", stripe: "#2E6BFF", modules: ["a4", "document", "card"], screens: ["Secretaria digital", "Declaração emitida"], chips: ["Documentos na hora", "Matrículas", "Autoatendimento para alunos"] },
  { name: "Governo", panel: "#DDE2E8", accent: "#1F8A4C", stripe: "#1F8A4C", modules: ["ticket", "document", "speaker", "accessible"], screens: ["Serviços ao cidadão · Acessível", "Senha N-108"], chips: ["Atendimento acessível", "Senhas e serviços", "Menos espera no balcão"] },
];
