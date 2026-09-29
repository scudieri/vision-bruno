import { SEGMENT_CONFIG } from "./segment-config";
const TITLES = ["Olá, vamos começar?", "Escolha seu serviço", "Pagamento aprovado", "Senha impressa!"];
const BUTTONS = ["TOQUE PARA INICIAR", "CONTINUAR", "CONCLUÍDO", "RETIRE SUA SENHA"];

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

/** Draws the kiosk software UI into a 2D canvas used as a texture. */
export function drawScreen(canvas: HTMLCanvasElement, flow: number, label: string, vertical = false, segment = -1, phase = 0) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width, H = canvas.height;
  const s = Math.min(W, H) / 576;
  const config = SEGMENT_CONFIG[segment];
  if (config) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#f5f8fb"); grad.addColorStop(1, "#dce7ef");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = config.accent; ctx.fillRect(0, 0, W, 78 * s);
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.font = `800 ${33 * s}px Sora, sans-serif`;
    ctx.fillText("VISION", 32 * s, 40 * s);
    ctx.textAlign = "right"; ctx.font = `600 ${20 * s}px 'DM Sans', sans-serif`; ctx.fillText(config.name, W - 32 * s, 40 * s);
    ctx.textAlign = "center";
    const title = config.screens[phase % config.screens.length] ?? "";
    ctx.fillStyle = "#0B1F3A"; ctx.font = `700 ${34 * s}px Sora, sans-serif`;
    ctx.fillText(title, W / 2, H * 0.34, W - 40 * s);
    if (segment === 2 && phase % 2 === 0) {
      ctx.strokeStyle = config.accent; ctx.lineWidth = 5 * s; ctx.setLineDash([18 * s, 10 * s]);
      ctx.strokeRect(W / 2 - 70 * s, H * 0.42, 140 * s, 105 * s); ctx.setLineDash([]);
    } else {
      ctx.fillStyle = config.accent; ctx.beginPath(); ctx.arc(W / 2, H * 0.58, 42 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 8 * s; ctx.lineCap = "round"; ctx.beginPath();
      ctx.moveTo(W / 2 - 20 * s, H * 0.58); ctx.lineTo(W / 2 - 3 * s, H * 0.58 + 16 * s); ctx.lineTo(W / 2 + 23 * s, H * 0.58 - 18 * s); ctx.stroke();
    }
    ctx.fillStyle = config.accent; rr(ctx, W * 0.2, H * 0.79, W * 0.6, 65 * s, 14 * s); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `700 ${23 * s}px 'DM Sans', sans-serif`; ctx.fillText(phase < config.screens.length - 1 ? "CONTINUAR" : "CONCLUÍDO", W / 2, H * 0.79 + 34 * s);
    ctx.textAlign = "left";
    return;
  }
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#f4f8fc"); bg.addColorStop(1, "#dfeaf6");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // header
  ctx.fillStyle = "#1F5AA6"; ctx.fillRect(0, 0, W, 78 * s);
  ctx.fillStyle = "#fff"; ctx.font = `800 ${34 * s}px Sora, sans-serif`; ctx.textBaseline = "middle";
  ctx.fillText("VISION", 32 * s, 40 * s);
  ctx.font = `600 ${22 * s}px 'DM Sans', sans-serif`; ctx.textAlign = "right";
  ctx.fillText("Autoatendimento", W - 32 * s, 40 * s); ctx.textAlign = "left";
  // steps indicator
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i <= flow ? "#2F80ED" : "#b9cde2"; rr(ctx, 32 * s + i * 58 * s, 104 * s, 48 * s, 7 * s, 4 * s); ctx.fill(); }
  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#0B1F3A"; ctx.font = `800 ${(vertical ? 46 : 44) * s}px Sora, sans-serif`;
  const titleY = vertical ? H * 0.22 : 168 * s;
  ctx.fillText(TITLES[flow] ?? "", cx, titleY);
  ctx.fillStyle = "#5b6b82"; ctx.font = `500 ${24 * s}px 'DM Sans', sans-serif`;
  ctx.fillText(label, cx, titleY + 46 * s);
  const midY = vertical ? H * 0.5 : 330 * s;
  if (flow === 1) {
    const items = ["Atendimento", "Pagamento", "Retirada"];
    const bw = vertical ? W * 0.8 : 190 * s, bh = vertical ? 110 * s : 120 * s;
    items.forEach((t, i) => {
      const x = vertical ? cx - bw / 2 : cx - (bw * 3 + 40 * s) / 2 + i * (bw + 20 * s);
      const y = vertical ? midY - 150 * s + i * (bh + 20 * s) : midY - bh / 2;
      ctx.fillStyle = i === 0 ? "#1F5AA6" : "#ffffff"; rr(ctx, x, y, bw, bh, 18 * s); ctx.fill();
      ctx.strokeStyle = "#b9cde2"; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = i === 0 ? "#fff" : "#0B1F3A"; ctx.font = `700 ${24 * s}px 'DM Sans', sans-serif`;
      ctx.fillText(t, x + bw / 2, y + bh / 2);
    });
  } else if (flow === 2) {
    ctx.fillStyle = "#16c784"; ctx.beginPath(); ctx.arc(cx, midY, 64 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 12 * s; ctx.lineCap = "round"; ctx.beginPath();
    ctx.moveTo(cx - 28 * s, midY); ctx.lineTo(cx - 6 * s, midY + 24 * s); ctx.lineTo(cx + 32 * s, midY - 22 * s); ctx.stroke();
  } else if (flow === 3) {
    ctx.fillStyle = "#fff"; rr(ctx, cx - 150 * s, midY - 80 * s, 300 * s, 160 * s, 18 * s); ctx.fill();
    ctx.fillStyle = "#5b6b82"; ctx.font = `600 ${20 * s}px 'DM Sans', sans-serif`; ctx.fillText("SUA SENHA", cx, midY - 44 * s);
    ctx.fillStyle = "#1F5AA6"; ctx.font = `800 ${70 * s}px Sora, sans-serif`; ctx.fillText("A042", cx, midY + 20 * s);
  } else {
    ctx.fillStyle = "#d6e6f7"; ctx.beginPath(); ctx.arc(cx, midY, 70 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2F80ED"; ctx.beginPath(); ctx.arc(cx, midY, 38 * s, 0, Math.PI * 2); ctx.fill();
  }
  // CTA
  const by = vertical ? H - 150 * s : H - 110 * s;
  const bw = vertical ? W * 0.8 : W * 0.6;
  ctx.fillStyle = "#1F5AA6"; rr(ctx, cx - bw / 2, by, bw, 70 * s, 16 * s); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `800 ${26 * s}px 'DM Sans', sans-serif`; ctx.fillText(BUTTONS[flow] ?? "", cx, by + 36 * s);
  ctx.textAlign = "left";
}
