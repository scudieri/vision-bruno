<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the institutional experience on the single `/` route with section anchors, because this project explicitly requires a one-page scroll narrative.
- Keep the lead submission isolated in `submitLead` and console-only until a real delivery integration is requested, to avoid implying a backend exists.

- The kiosk is a single procedural R3F model (src/components/three) on one fixed overlay canvas positioned by DOM `data-totem` anchors per section; product cards reuse the same model as variants — no kiosk photos/SVGs, so the product stays consistent and responsive.
- Totem motion: TotemStage builds a scroll keyframe timeline from `[data-totem-slot]` rects (measured only on resize, at each scene snap position), and Home runs a desktop-only proximity snap via Lenis — keeps the totem framed per scene without per-frame layout reads.
- Segment configurations live in `segment-config.ts` and animate on the existing shared Totem canvas; this preserves one model and continuous scroll choreography.
